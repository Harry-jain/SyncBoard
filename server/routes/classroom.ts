import { Router } from 'express';
import { ClassroomManager } from '../classroom/classroom-manager';
import { CollaborationEngine } from '../collaboration/collaboration-engine';
import { RedisClusterManager } from '../networking/redis-cluster-manager';

const router = Router();

// Initialize managers
const redisManager = new RedisClusterManager();
const classroomManager = new ClassroomManager(redisManager);
const collaborationEngine = new CollaborationEngine(redisManager);

// Classroom Management Routes

// Create classroom
router.post('/create', async (req, res) => {
  try {
    const { name, subject, gradeLevel, academicYear, teacherId, maxStudents } = req.body;
    
    const classroom = await classroomManager.createClassroom({
      name,
      subject,
      gradeLevel,
      academicYear,
      teacherId,
      maxStudents: maxStudents || 30,
      autoApproveStudents: true,
      requiresApproval: false
    });

    res.json({ success: true, classroom });
  } catch (error) {
    console.error('Failed to create classroom:', error);
    res.status(500).json({ success: false, error: 'Failed to create classroom' });
  }
});

// Get classroom by ID
router.get('/:id', async (req, res) => {
  try {
    const classroomId = parseInt(req.params.id);
    const classroom = await classroomManager.getClassroom(classroomId);
    
    if (!classroom) {
      return res.status(404).json({ success: false, error: 'Classroom not found' });
    }

    res.json({ success: true, classroom });
  } catch (error) {
    console.error('Failed to get classroom:', error);
    res.status(500).json({ success: false, error: 'Failed to get classroom' });
  }
});

// Join classroom
router.post('/join', async (req, res) => {
  try {
    const { method, value, userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    let result;
    if (method === 'code') {
      result = await classroomManager.joinClassroom(value, userId);
    } else if (method === 'link') {
      // Handle shareable link join (simplified)
      result = await classroomManager.joinClassroom(value, userId);
    } else {
      return res.status(400).json({ success: false, error: 'Invalid join method' });
    }

    res.json(result);
  } catch (error) {
    console.error('Failed to join classroom:', error);
    res.status(500).json({ success: false, error: 'Failed to join classroom' });
  }
});

// Get classroom members
router.get('/:id/members', async (req, res) => {
  try {
    const classroomId = parseInt(req.params.id);
    const members = await classroomManager.getClassroomMembers(classroomId);
    
    res.json({ success: true, members });
  } catch (error) {
    console.error('Failed to get classroom members:', error);
    res.status(500).json({ success: false, error: 'Failed to get classroom members' });
  }
});

// Get classroom stats
router.get('/:id/stats', async (req, res) => {
  try {
    const classroomId = parseInt(req.params.id);
    const stats = await classroomManager.getClassroomStats(classroomId);
    
    res.json(stats);
  } catch (error) {
    console.error('Failed to get classroom stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get classroom stats' });
  }
});

// Regenerate join code
router.post('/:id/regenerate-code', async (req, res) => {
  try {
    const classroomId = parseInt(req.params.id);
    const newCode = await classroomManager.regenerateJoinCode(classroomId);
    
    res.json({ success: true, joinCode: newCode });
  } catch (error) {
    console.error('Failed to regenerate join code:', error);
    res.status(500).json({ success: false, error: 'Failed to regenerate join code' });
  }
});

// Assignment Management Routes

// Create assignment
router.post('/:id/assignments', async (req, res) => {
  try {
    const classroomId = parseInt(req.params.id);
    const assignmentData = {
      ...req.body,
      classroomId,
      createdBy: req.body.userId
    };

    const assignment = await classroomManager.createAssignment(assignmentData);
    
    res.json({ success: true, assignment });
  } catch (error) {
    console.error('Failed to create assignment:', error);
    res.status(500).json({ success: false, error: 'Failed to create assignment' });
  }
});

// Get assignments
router.get('/:id/assignments', async (req, res) => {
  try {
    const classroomId = parseInt(req.params.id);
    const assignments = await classroomManager.getAssignments(classroomId);
    
    res.json(assignments);
  } catch (error) {
    console.error('Failed to get assignments:', error);
    res.status(500).json({ success: false, error: 'Failed to get assignments' });
  }
});

// Get assignment with submissions
router.get('/assignments/:assignmentId', async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    const assignment = await classroomManager.getAssignmentWithSubmissions(assignmentId);
    
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    res.json({ success: true, assignment });
  } catch (error) {
    console.error('Failed to get assignment:', error);
    res.status(500).json({ success: false, error: 'Failed to get assignment' });
  }
});

// Submit assignment
router.post('/assignments/:assignmentId/submit', async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    const { studentId, content, files } = req.body;

    const submission = await classroomManager.submitAssignment(
      assignmentId,
      studentId,
      content,
      files
    );

    res.json({ success: true, submission });
  } catch (error) {
    console.error('Failed to submit assignment:', error);
    res.status(500).json({ success: false, error: 'Failed to submit assignment' });
  }
});

// Grade assignment
router.post('/submissions/:submissionId/grade', async (req, res) => {
  try {
    const submissionId = parseInt(req.params.submissionId);
    const { grade, feedback, gradedBy } = req.body;

    await classroomManager.gradeAssignment(submissionId, grade, feedback, gradedBy);

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to grade assignment:', error);
    res.status(500).json({ success: false, error: 'Failed to grade assignment' });
  }
});

// Collaboration Routes

// Get document for collaboration
router.get('/collaboration/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const document = await collaborationEngine.getDocument(id, type);
    
    res.json({ success: true, document });
  } catch (error) {
    console.error('Failed to get document:', error);
    res.status(500).json({ success: false, error: 'Failed to get document' });
  }
});

// Update document
router.post('/collaboration/:type/:id/update', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { userId, operation } = req.body;

    const document = await collaborationEngine.updateDocument(id, type, userId, operation);
    
    res.json({ success: true, document });
  } catch (error) {
    console.error('Failed to update document:', error);
    res.status(500).json({ success: false, error: 'Failed to update document' });
  }
});

// Update user presence
router.post('/collaboration/:type/:id/presence', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { userId, cursor } = req.body;

    await collaborationEngine.updateUserPresence(id, type, userId, cursor);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update presence:', error);
    res.status(500).json({ success: false, error: 'Failed to update presence' });
  }
});

// Get active users
router.get('/collaboration/:type/:id/users', async (req, res) => {
  try {
    const { type, id } = req.params;
    const users = await collaborationEngine.getActiveUsers(id, type);
    
    res.json({ success: true, users });
  } catch (error) {
    console.error('Failed to get active users:', error);
    res.status(500).json({ success: false, error: 'Failed to get active users' });
  }
});

// Code collaboration
router.post('/collaboration/code/:projectId/sync', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, changes } = req.body;

    await collaborationEngine.syncCodeChange(projectId, userId, changes);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to sync code change:', error);
    res.status(500).json({ success: false, error: 'Failed to sync code change' });
  }
});

// Get code changes
router.get('/collaboration/code/:projectId/changes', async (req, res) => {
  try {
    const { projectId } = req.params;
    const since = req.query.since ? parseInt(req.query.since as string) : undefined;

    const changes = await collaborationEngine.getCodeChanges(projectId, since);
    
    res.json({ success: true, changes });
  } catch (error) {
    console.error('Failed to get code changes:', error);
    res.status(500).json({ success: false, error: 'Failed to get code changes' });
  }
});

export default router;