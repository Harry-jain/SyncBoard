import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { 
  classrooms, 
  classroomMembers, 
  assignments, 
  assignmentSubmissions,
  classNotebooks,
  notebookSections,
  notebookPages,
  users,
  InsertClassroom,
  InsertClassroomMember,
  InsertAssignment,
  InsertAssignmentSubmission,
  Classroom,
  ClassroomMember,
  Assignment,
  AssignmentSubmission
} from '../../shared/schema';
import { RedisClusterManager } from '../networking/redis-cluster-manager';

export interface JoinCodeResult {
  success: boolean;
  classroomId?: number;
  message: string;
  requiresApproval?: boolean;
}

export interface ClassroomStats {
  totalStudents: number;
  activeStudents: number;
  totalAssignments: number;
  pendingSubmissions: number;
  averageGrade: number;
}

export interface AssignmentWithSubmissions extends Assignment {
  submissions: AssignmentSubmission[];
  submissionCount: number;
  gradedCount: number;
}

export class ClassroomManager {
  private redisManager: RedisClusterManager;

  constructor(redisManager: RedisClusterManager) {
    this.redisManager = redisManager;
  }

  // Classroom Management

  public async createClassroom(data: InsertClassroom): Promise<Classroom> {
    try {
      // Generate unique join code
      const joinCode = this.generateJoinCode();
      const shareableLink = this.generateShareableLink();

      const classroomData = {
        ...data,
        joinCode,
        shareableLink,
        isActive: true
      };

      const [classroom] = await db.insert(classrooms)
        .values(classroomData)
        .returning();

      // Create default class notebook
      await this.createDefaultNotebook(classroom.id);

      // Add teacher as classroom member
      await db.insert(classroomMembers).values({
        classroomId: classroom.id,
        userId: data.teacherId,
        role: 'teacher',
        joinMethod: 'creation',
        status: 'active'
      });

      // Store classroom info in Redis for fast access
      await this.redisManager.set(
        `classroom:${classroom.id}`,
        JSON.stringify({
          id: classroom.id,
          name: classroom.name,
          subject: classroom.subject,
          joinCode: classroom.joinCode,
          shareableLink: classroom.shareableLink,
          isActive: classroom.isActive
        }),
        3600 // 1 hour TTL
      );

      return classroom;
    } catch (error) {
      console.error('Failed to create classroom:', error);
      throw new Error('Failed to create classroom');
    }
  }

  public async getClassroom(classroomId: number): Promise<Classroom | null> {
    try {
      // Try Redis first
      const cached = await this.redisManager.get(`classroom:${classroomId}`);
      if (cached) {
        const classroomData = JSON.parse(cached);
        return classroomData as Classroom;
      }

      // Fallback to database
      const [classroom] = await db.select()
        .from(classrooms)
        .where(eq(classrooms.id, classroomId))
        .limit(1);

      if (classroom) {
        // Cache for future requests
        await this.redisManager.set(
          `classroom:${classroom.id}`,
          JSON.stringify(classroom),
          3600
        );
      }

      return classroom || null;
    } catch (error) {
      console.error('Failed to get classroom:', error);
      return null;
    }
  }

  public async getClassroomByJoinCode(joinCode: string): Promise<Classroom | null> {
    try {
      const [classroom] = await db.select()
        .from(classrooms)
        .where(and(
          eq(classrooms.joinCode, joinCode),
          eq(classrooms.isActive, true)
        ))
        .limit(1);

      return classroom || null;
    } catch (error) {
      console.error('Failed to get classroom by join code:', error);
      return null;
    }
  }

  public async joinClassroom(joinCode: string, userId: number): Promise<JoinCodeResult> {
    try {
      const classroom = await this.getClassroomByJoinCode(joinCode);
      
      if (!classroom) {
        return {
          success: false,
          message: 'Invalid join code'
        };
      }

      // Check if user is already a member
      const existingMember = await db.select()
        .from(classroomMembers)
        .where(and(
          eq(classroomMembers.classroomId, classroom.id),
          eq(classroomMembers.userId, userId)
        ))
        .limit(1);

      if (existingMember.length > 0) {
        return {
          success: false,
          message: 'You are already a member of this classroom'
        };
      }

      // Check classroom capacity
      const memberCount = await this.getClassroomMemberCount(classroom.id);
      if (memberCount >= classroom.maxStudents) {
        return {
          success: false,
          message: 'Classroom is at maximum capacity'
        };
      }

      // Determine if approval is required
      const requiresApproval = classroom.requiresApproval && !classroom.autoApproveStudents;

      // Add member to classroom
      await db.insert(classroomMembers).values({
        classroomId: classroom.id,
        userId,
        role: 'student',
        joinMethod: 'code',
        status: requiresApproval ? 'pending' : 'active'
      });

      // Update user presence in Redis
      await this.redisManager.updateUserPresence(userId, classroom.id, {
        status: 'online',
        lastActivity: new Date().toISOString()
      });

      return {
        success: true,
        classroomId: classroom.id,
        message: requiresApproval 
          ? 'Join request submitted. Waiting for teacher approval.'
          : 'Successfully joined classroom',
        requiresApproval
      };
    } catch (error) {
      console.error('Failed to join classroom:', error);
      return {
        success: false,
        message: 'Failed to join classroom'
      };
    }
  }

  public async getClassroomMembers(classroomId: number): Promise<ClassroomMember[]> {
    try {
      return await db.select()
        .from(classroomMembers)
        .where(eq(classroomMembers.classroomId, classroomId));
    } catch (error) {
      console.error('Failed to get classroom members:', error);
      return [];
    }
  }

  public async getClassroomStats(classroomId: number): Promise<ClassroomStats> {
    try {
      const members = await this.getClassroomMembers(classroomId);
      const activeMembers = members.filter(m => m.status === 'active');
      
      const assignments = await db.select()
        .from(assignments)
        .where(eq(assignments.classroomId, classroomId));

      const submissions = await db.select()
        .from(assignmentSubmissions)
        .where(eq(assignmentSubmissions.assignmentId, assignments[0]?.id || 0));

      const gradedSubmissions = submissions.filter(s => s.grade !== null);
      const averageGrade = gradedSubmissions.length > 0 
        ? gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / gradedSubmissions.length
        : 0;

      return {
        totalStudents: members.filter(m => m.role === 'student').length,
        activeStudents: activeMembers.filter(m => m.role === 'student').length,
        totalAssignments: assignments.length,
        pendingSubmissions: submissions.filter(s => s.status === 'submitted').length,
        averageGrade: Math.round(averageGrade)
      };
    } catch (error) {
      console.error('Failed to get classroom stats:', error);
      return {
        totalStudents: 0,
        activeStudents: 0,
        totalAssignments: 0,
        pendingSubmissions: 0,
        averageGrade: 0
      };
    }
  }

  private async getClassroomMemberCount(classroomId: number): Promise<number> {
    const members = await db.select()
      .from(classroomMembers)
      .where(and(
        eq(classroomMembers.classroomId, classroomId),
        eq(classroomMembers.status, 'active')
      ));

    return members.length;
  }

  // Assignment Management

  public async createAssignment(data: InsertAssignment): Promise<Assignment> {
    try {
      const [assignment] = await db.insert(assignments)
        .values(data)
        .returning();

      // Notify classroom members about new assignment
      await this.redisManager.publish(
        `classroom:${data.classroomId}:assignments`,
        JSON.stringify({
          type: 'new_assignment',
          assignment,
          timestamp: new Date().toISOString()
        })
      );

      return assignment;
    } catch (error) {
      console.error('Failed to create assignment:', error);
      throw new Error('Failed to create assignment');
    }
  }

  public async getAssignments(classroomId: number): Promise<Assignment[]> {
    try {
      return await db.select()
        .from(assignments)
        .where(eq(assignments.classroomId, classroomId))
        .orderBy(desc(assignments.createdAt));
    } catch (error) {
      console.error('Failed to get assignments:', error);
      return [];
    }
  }

  public async getAssignmentWithSubmissions(assignmentId: number): Promise<AssignmentWithSubmissions | null> {
    try {
      const [assignment] = await db.select()
        .from(assignments)
        .where(eq(assignments.id, assignmentId))
        .limit(1);

      if (!assignment) return null;

      const submissions = await db.select()
        .from(assignmentSubmissions)
        .where(eq(assignmentSubmissions.assignmentId, assignmentId));

      return {
        ...assignment,
        submissions,
        submissionCount: submissions.length,
        gradedCount: submissions.filter(s => s.grade !== null).length
      };
    } catch (error) {
      console.error('Failed to get assignment with submissions:', error);
      return null;
    }
  }

  public async submitAssignment(assignmentId: number, studentId: number, content: string, files?: any[]): Promise<AssignmentSubmission> {
    try {
      // Check if assignment exists and is still open
      const [assignment] = await db.select()
        .from(assignments)
        .where(eq(assignments.id, assignmentId))
        .limit(1);

      if (!assignment) {
        throw new Error('Assignment not found');
      }

      const now = new Date();
      const isLate = assignment.dueDate ? now > assignment.dueDate : false;

      const [submission] = await db.insert(assignmentSubmissions)
        .values({
          assignmentId,
          studentId,
          content,
          files: files || [],
          isLate,
          status: 'submitted'
        })
        .returning();

      // Notify teacher about new submission
      await this.redisManager.publish(
        `classroom:${assignment.classroomId}:submissions`,
        JSON.stringify({
          type: 'new_submission',
          submission,
          assignment,
          timestamp: new Date().toISOString()
        })
      );

      return submission;
    } catch (error) {
      console.error('Failed to submit assignment:', error);
      throw new Error('Failed to submit assignment');
    }
  }

  public async gradeAssignment(submissionId: number, grade: number, feedback: string, gradedBy: number): Promise<void> {
    try {
      await db.update(assignmentSubmissions)
        .set({
          grade,
          feedback,
          gradedBy,
          gradedAt: new Date(),
          status: 'graded'
        })
        .where(eq(assignmentSubmissions.id, submissionId));

      // Notify student about grade
      const [submission] = await db.select()
        .from(assignmentSubmissions)
        .where(eq(assignmentSubmissions.id, submissionId))
        .limit(1);

      if (submission) {
        await this.redisManager.publish(
          `user:${submission.studentId}:grades`,
          JSON.stringify({
            type: 'assignment_graded',
            submissionId,
            grade,
            feedback,
            timestamp: new Date().toISOString()
          })
        );
      }
    } catch (error) {
      console.error('Failed to grade assignment:', error);
      throw new Error('Failed to grade assignment');
    }
  }

  // Notebook Management

  private async createDefaultNotebook(classroomId: number): Promise<void> {
    try {
      // Create main notebook
      const [notebook] = await db.insert(classNotebooks)
        .values({
          classroomId,
          name: 'Class Notebook',
          description: 'Main class notebook for notes and collaboration',
          isActive: true
        })
        .returning();

      // Create Content Library section
      await db.insert(notebookSections)
        .values({
          notebookId: notebook.id,
          name: 'Content Library',
          sectionType: 'content_library',
          isActive: true
        });

      // Create Collaboration Space section
      await db.insert(notebookSections)
        .values({
          notebookId: notebook.id,
          name: 'Collaboration Space',
          sectionType: 'collaboration_space',
          isActive: true
        });
    } catch (error) {
      console.error('Failed to create default notebook:', error);
    }
  }

  // Utility Methods

  private generateJoinCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 7; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private generateShareableLink(): string {
    const token = Math.random().toString(36).substr(2, 15);
    return `https://syncboard.com/join/${token}`;
  }

  public async regenerateJoinCode(classroomId: number): Promise<string> {
    try {
      const newCode = this.generateJoinCode();
      
      await db.update(classrooms)
        .set({ joinCode: newCode })
        .where(eq(classrooms.id, classroomId));

      // Update Redis cache
      await this.redisManager.del(`classroom:${classroomId}`);
      
      return newCode;
    } catch (error) {
      console.error('Failed to regenerate join code:', error);
      throw new Error('Failed to regenerate join code');
    }
  }
}