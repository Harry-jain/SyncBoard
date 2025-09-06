import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { collaborationState, users } from '../../shared/schema';
import { RedisClusterManager } from '../networking/redis-cluster-manager';

export interface CollaborationOperation {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
  userId: number;
  timestamp: number;
}

export interface CursorPosition {
  line: number;
  column: number;
  selectionStart?: number;
  selectionEnd?: number;
}

export interface UserPresence {
  userId: number;
  name: string;
  avatar?: string;
  cursor: CursorPosition;
  color: string;
  isActive: boolean;
  lastSeen: Date;
}

export interface CollaborationDocument {
  id: string;
  type: 'assignment' | 'document' | 'notebook';
  content: string;
  operations: CollaborationOperation[];
  users: UserPresence[];
  version: number;
}

export class CollaborationEngine {
  private redisManager: RedisClusterManager;
  private userColors: Map<number, string> = new Map();
  private colorPalette = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];

  constructor(redisManager: RedisClusterManager) {
    this.redisManager = redisManager;
  }

  // Document Management

  public async getDocument(documentId: string, documentType: string): Promise<CollaborationDocument | null> {
    try {
      // Try to get from Redis first
      const cached = await this.redisManager.get(`document:${documentType}:${documentId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // If not in cache, create new document
      const document: CollaborationDocument = {
        id: documentId,
        type: documentType as 'assignment' | 'document' | 'notebook',
        content: '',
        operations: [],
        users: [],
        version: 0
      };

      // Cache the document
      await this.redisManager.set(
        `document:${documentType}:${documentId}`,
        JSON.stringify(document),
        3600
      );

      return document;
    } catch (error) {
      console.error('Failed to get document:', error);
      return null;
    }
  }

  public async updateDocument(
    documentId: string, 
    documentType: string, 
    userId: number, 
    operation: CollaborationOperation
  ): Promise<CollaborationDocument | null> {
    try {
      const document = await this.getDocument(documentId, documentType);
      if (!document) return null;

      // Apply operational transform
      const transformedOperation = this.transformOperation(operation, document.operations);
      
      // Apply the operation to the document
      document.content = this.applyOperation(document.content, transformedOperation);
      document.operations.push(transformedOperation);
      document.version++;

      // Update user presence
      await this.updateUserPresence(documentId, documentType, userId, {
        line: operation.position,
        column: operation.position + (operation.content?.length || 0),
        isActive: true,
        lastSeen: new Date()
      });

      // Update document in Redis
      await this.redisManager.set(
        `document:${documentType}:${documentId}`,
        JSON.stringify(document),
        3600
      );

      // Broadcast changes to other users
      await this.redisManager.publish(
        `collaboration:${documentType}:${documentId}`,
        JSON.stringify({
          type: 'document_update',
          operation: transformedOperation,
          document,
          timestamp: new Date().toISOString()
        })
      );

      return document;
    } catch (error) {
      console.error('Failed to update document:', error);
      return null;
    }
  }

  public async updateUserPresence(
    documentId: string, 
    documentType: string, 
    userId: number, 
    cursor: CursorPosition
  ): Promise<void> {
    try {
      const document = await this.getDocument(documentId, documentType);
      if (!document) return;

      // Get user info
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) return;

      // Get or assign user color
      if (!this.userColors.has(userId)) {
        const colorIndex = this.userColors.size % this.colorPalette.length;
        this.userColors.set(userId, this.colorPalette[colorIndex]);
      }

      const userPresence: UserPresence = {
        userId,
        name: user.name,
        avatar: user.avatar || undefined,
        cursor,
        color: this.userColors.get(userId)!,
        isActive: true,
        lastSeen: new Date()
      };

      // Update or add user presence
      const existingUserIndex = document.users.findIndex(u => u.userId === userId);
      if (existingUserIndex >= 0) {
        document.users[existingUserIndex] = userPresence;
      } else {
        document.users.push(userPresence);
      }

      // Update document in Redis
      await this.redisManager.set(
        `document:${documentType}:${documentId}`,
        JSON.stringify(document),
        3600
      );

      // Broadcast presence update
      await this.redisManager.publish(
        `collaboration:${documentType}:${documentId}`,
        JSON.stringify({
          type: 'presence_update',
          user: userPresence,
          timestamp: new Date().toISOString()
        })
      );

      // Store in collaboration state table
      await db.insert(collaborationState).values({
        resourceId: documentId,
        resourceType: documentType,
        userId,
        cursorPosition: cursor,
        isActive: true
      }).onConflictDoUpdate({
        target: [collaborationState.resourceId, collaborationState.resourceType, collaborationState.userId],
        set: {
          cursorPosition: cursor,
          lastEditAt: new Date(),
          isActive: true
        }
      });
    } catch (error) {
      console.error('Failed to update user presence:', error);
    }
  }

  public async removeUserPresence(
    documentId: string, 
    documentType: string, 
    userId: number
  ): Promise<void> {
    try {
      const document = await this.getDocument(documentId, documentType);
      if (!document) return;

      // Remove user from document
      document.users = document.users.filter(u => u.userId !== userId);

      // Update document in Redis
      await this.redisManager.set(
        `document:${documentType}:${documentId}`,
        JSON.stringify(document),
        3600
      );

      // Broadcast user left
      await this.redisManager.publish(
        `collaboration:${documentType}:${documentId}`,
        JSON.stringify({
          type: 'user_left',
          userId,
          timestamp: new Date().toISOString()
        })
      );

      // Mark as inactive in database
      await db.update(collaborationState)
        .set({ isActive: false })
        .where(and(
          eq(collaborationState.resourceId, documentId),
          eq(collaborationState.resourceType, documentType),
          eq(collaborationState.userId, userId)
        ));
    } catch (error) {
      console.error('Failed to remove user presence:', error);
    }
  }

  // Operational Transform

  private transformOperation(
    operation: CollaborationOperation, 
    existingOperations: CollaborationOperation[]
  ): CollaborationOperation {
    // Simplified operational transform
    // In production, this would implement proper OT algorithms
    let transformedPosition = operation.position;

    for (const existingOp of existingOperations) {
      if (existingOp.timestamp >= operation.timestamp) continue;

      if (existingOp.type === 'insert' && existingOp.position <= operation.position) {
        transformedPosition += existingOp.content?.length || 0;
      } else if (existingOp.type === 'delete' && existingOp.position < operation.position) {
        transformedPosition = Math.max(0, transformedPosition - (existingOp.length || 0));
      }
    }

    return {
      ...operation,
      position: transformedPosition
    };
  }

  private applyOperation(content: string, operation: CollaborationOperation): string {
    const { type, position, content: opContent, length } = operation;

    switch (type) {
      case 'insert':
        if (opContent) {
          return content.slice(0, position) + opContent + content.slice(position);
        }
        break;
      case 'delete':
        if (length) {
          return content.slice(0, position) + content.slice(position + length);
        }
        break;
      case 'retain':
        // Retain operations don't modify content
        break;
    }

    return content;
  }

  // Code Collaboration

  public async syncCodeChange(
    projectId: string, 
    userId: number, 
    changes: any
  ): Promise<void> {
    try {
      // Store code changes with timestamp
      await this.redisManager.syncCodeChange(projectId, {
        userId,
        changes,
        timestamp: Date.now()
      });

      // Update user presence for code editing
      await this.updateUserPresence(projectId, 'code', userId, {
        line: changes.cursorLine || 0,
        column: changes.cursorColumn || 0,
        isActive: true,
        lastSeen: new Date()
      });
    } catch (error) {
      console.error('Failed to sync code change:', error);
    }
  }

  public async getCodeChanges(projectId: string, since?: number): Promise<any[]> {
    try {
      return await this.redisManager.getCodeChanges(projectId, since);
    } catch (error) {
      console.error('Failed to get code changes:', error);
      return [];
    }
  }

  // Real-time Features

  public async broadcastToDocument(
    documentId: string, 
    documentType: string, 
    message: any
  ): Promise<void> {
    try {
      await this.redisManager.publish(
        `collaboration:${documentType}:${documentId}`,
        JSON.stringify({
          ...message,
          timestamp: new Date().toISOString()
        })
      );
    } catch (error) {
      console.error('Failed to broadcast to document:', error);
    }
  }

  public async getActiveUsers(documentId: string, documentType: string): Promise<UserPresence[]> {
    try {
      const document = await this.getDocument(documentId, documentType);
      if (!document) return [];

      // Filter out inactive users (not seen in last 30 seconds)
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      return document.users.filter(user => 
        user.isActive && user.lastSeen > thirtySecondsAgo
      );
    } catch (error) {
      console.error('Failed to get active users:', error);
      return [];
    }
  }

  public async cleanupInactiveUsers(): Promise<void> {
    try {
      // Mark users as inactive if they haven't been seen in 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      await db.update(collaborationState)
        .set({ isActive: false })
        .where(and(
          eq(collaborationState.isActive, true),
          // Add timestamp comparison here if needed
        ));
    } catch (error) {
      console.error('Failed to cleanup inactive users:', error);
    }
  }
}