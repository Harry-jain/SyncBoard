import { Request, Response, NextFunction } from 'express';
import { User, Classroom, Assignment, Document } from '@shared/schema';
import { storage } from '../storage';

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface Role {
  name: string;
  permissions: Permission[];
  inherits?: string[];
}

export interface SecurityContext {
  user: User;
  classroom?: Classroom;
  resource?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

// Define comprehensive role-based permissions
export const ROLES: Record<string, Role> = {
  SUPER_ADMIN: {
    name: 'super_admin',
    permissions: [
      { resource: '*', action: '*' }
    ]
  },
  ADMIN: {
    name: 'admin',
    permissions: [
      { resource: 'users', action: '*' },
      { resource: 'classrooms', action: '*' },
      { resource: 'assignments', action: '*' },
      { resource: 'documents', action: '*' },
      { resource: 'reports', action: '*' },
      { resource: 'settings', action: 'read' }
    ]
  },
  TEACHER: {
    name: 'teacher',
    permissions: [
      { resource: 'classrooms', action: '*', conditions: { owner: true } },
      { resource: 'assignments', action: '*', conditions: { classroom_owner: true } },
      { resource: 'documents', action: '*', conditions: { owner: true } },
      { resource: 'students', action: 'read', conditions: { classroom_member: true } },
      { resource: 'grades', action: '*', conditions: { classroom_owner: true } },
      { resource: 'calls', action: '*' },
      { resource: 'messages', action: '*' }
    ]
  },
  CO_TEACHER: {
    name: 'co_teacher',
    permissions: [
      { resource: 'classrooms', action: 'read', conditions: { member: true } },
      { resource: 'assignments', action: '*', conditions: { classroom_member: true } },
      { resource: 'documents', action: 'read', conditions: { classroom_member: true } },
      { resource: 'students', action: 'read', conditions: { classroom_member: true } },
      { resource: 'grades', action: 'write', conditions: { classroom_member: true } },
      { resource: 'calls', action: '*' },
      { resource: 'messages', action: '*' }
    ]
  },
  STUDENT: {
    name: 'student',
    permissions: [
      { resource: 'classrooms', action: 'read', conditions: { member: true } },
      { resource: 'assignments', action: 'read', conditions: { classroom_member: true } },
      { resource: 'assignments', action: 'submit', conditions: { classroom_member: true } },
      { resource: 'documents', action: 'read', conditions: { classroom_member: true } },
      { resource: 'documents', action: 'create', conditions: { classroom_member: true } },
      { resource: 'grades', action: 'read', conditions: { own_grades: true } },
      { resource: 'calls', action: '*' },
      { resource: 'messages', action: '*' }
    ]
  },
  PARENT: {
    name: 'parent',
    permissions: [
      { resource: 'classrooms', action: 'read', conditions: { child_member: true } },
      { resource: 'assignments', action: 'read', conditions: { child_member: true } },
      { resource: 'grades', action: 'read', conditions: { child_grades: true } },
      { resource: 'messages', action: 'read', conditions: { child_member: true } }
    ]
  }
};

export class PermissionManager {
  private static instance: PermissionManager;
  private roleCache: Map<string, Role> = new Map();
  private permissionCache: Map<string, boolean> = new Map();

  private constructor() {
    // Initialize role cache
    Object.values(ROLES).forEach(role => {
      this.roleCache.set(role.name, role);
    });
  }

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  // Check if user has permission for specific action
  public async hasPermission(
    context: SecurityContext,
    resource: string,
    action: string,
    resourceId?: string
  ): Promise<boolean> {
    const cacheKey = `${context.user.id}_${resource}_${action}_${resourceId || 'all'}`;
    
    // Check cache first
    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!;
    }

    const hasPermission = await this.checkPermission(context, resource, action, resourceId);
    
    // Cache result for 5 minutes
    this.permissionCache.set(cacheKey, hasPermission);
    setTimeout(() => this.permissionCache.delete(cacheKey), 5 * 60 * 1000);

    return hasPermission;
  }

  private async checkPermission(
    context: SecurityContext,
    resource: string,
    action: string,
    resourceId?: string
  ): Promise<boolean> {
    const userRole = ROLES[context.user.role.toUpperCase()];
    if (!userRole) return false;

    // Super admin has all permissions
    if (userRole.name === 'super_admin') return true;

    // Check direct permissions
    for (const permission of userRole.permissions) {
      if (this.matchesPermission(permission, resource, action)) {
        if (permission.conditions) {
          const conditionsMet = await this.checkConditions(
            context,
            permission.conditions,
            resourceId
          );
          if (conditionsMet) return true;
        } else {
          return true;
        }
      }
    }

    // Check inherited permissions
    if (userRole.inherits) {
      for (const inheritedRoleName of userRole.inherits) {
        const inheritedRole = ROLES[inheritedRoleName];
        if (inheritedRole) {
          for (const permission of inheritedRole.permissions) {
            if (this.matchesPermission(permission, resource, action)) {
              if (permission.conditions) {
                const conditionsMet = await this.checkConditions(
                  context,
                  permission.conditions,
                  resourceId
                );
                if (conditionsMet) return true;
              } else {
                return true;
              }
            }
          }
        }
      }
    }

    return false;
  }

  private matchesPermission(permission: Permission, resource: string, action: string): boolean {
    // Wildcard resource matches all
    if (permission.resource === '*') return true;
    
    // Exact resource match
    if (permission.resource === resource) return true;
    
    // Wildcard action matches all actions
    if (permission.action === '*') return true;
    
    // Exact action match
    return permission.action === action;
  }

  private async checkConditions(
    context: SecurityContext,
    conditions: Record<string, any>,
    resourceId?: string
  ): Promise<boolean> {
    for (const [condition, value] of Object.entries(conditions)) {
      switch (condition) {
        case 'owner':
          if (resourceId && context.resource) {
            return context.resource.ownerId === context.user.id;
          }
          break;
        
        case 'classroom_member':
          if (resourceId) {
            const isMember = await this.isClassroomMember(context.user.id, resourceId);
            if (!isMember) return false;
          }
          break;
        
        case 'classroom_owner':
          if (resourceId) {
            const classroom = await storage.getClassroom(parseInt(resourceId));
            if (!classroom || classroom.teacherId !== context.user.id) return false;
          }
          break;
        
        case 'own_grades':
          // Students can only see their own grades
          return true; // This would be checked at the data level
        
        case 'child_member':
          // Parents can only see their children's classroom data
          if (resourceId) {
            const isChildMember = await this.isChildClassroomMember(context.user.id, resourceId);
            if (!isChildMember) return false;
          }
          break;
        
        case 'child_grades':
          // Parents can only see their children's grades
          return true; // This would be checked at the data level
        
        case 'member':
          if (resourceId) {
            const isMember = await this.isClassroomMember(context.user.id, resourceId);
            if (!isMember) return false;
          }
          break;
      }
    }
    return true;
  }

  private async isClassroomMember(userId: number, classroomId: string): Promise<boolean> {
    try {
      const members = await storage.getClassroomMembers(parseInt(classroomId));
      return members.some(member => member.userId === userId);
    } catch {
      return false;
    }
  }

  private async isChildClassroomMember(parentId: number, classroomId: string): Promise<boolean> {
    try {
      // This would check if the parent has children in the classroom
      // Implementation depends on your parent-child relationship structure
      const children = await storage.getUserChildren(parentId);
      const members = await storage.getClassroomMembers(parseInt(classroomId));
      
      return children.some(child => 
        members.some(member => member.userId === child.id)
      );
    } catch {
      return false;
    }
  }

  // Middleware for permission checking
  public requirePermission(resource: string, action: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const context: SecurityContext = {
          user: req.user,
          ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          timestamp: new Date()
        };

        const resourceId = req.params.id || req.params.classroomId;
        const hasPermission = await this.hasPermission(context, resource, action, resourceId);

        if (!hasPermission) {
          return res.status(403).json({ 
            error: 'Insufficient permissions',
            required: { resource, action },
            user_role: req.user.role
          });
        }

        next();
      } catch (error) {
        console.error('Permission check error:', error);
        res.status(500).json({ error: 'Permission check failed' });
      }
    };
  }

  // Clear permission cache for user
  public clearUserCache(userId: number): void {
    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(`${userId}_`)) {
        this.permissionCache.delete(key);
      }
    }
  }

  // Clear all caches
  public clearAllCaches(): void {
    this.permissionCache.clear();
  }
}

export const permissionManager = PermissionManager.getInstance();