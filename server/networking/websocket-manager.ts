import { WebSocket, WebSocketServer } from 'ws';
import { createClient } from 'redis';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { websocketConnections, users, classrooms } from '../../shared/schema';

export interface ConnectionMetadata {
  userId: number;
  nodeId: string;
  classroomId?: number;
  connectedAt: Date;
  lastPingAt?: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface NodeMetrics {
  nodeId: string;
  cpuUsage: number;
  memoryUsage: number;
  connectionCount: number;
  networkLatency: number;
  isHealthy: boolean;
}

export class WebSocketConnectionManager {
  private wss: WebSocketServer;
  private redisClient: ReturnType<typeof createClient>;
  private connections: Map<string, WebSocket> = new Map();
  private nodeId: string;
  private nodeMetrics: NodeMetrics;
  private healthCheckInterval: NodeJS.Timeout;

  constructor(port: number, nodeId: string) {
    this.nodeId = nodeId;
    this.wss = new WebSocketServer({ port });
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.nodeMetrics = {
      nodeId,
      cpuUsage: 0,
      memoryUsage: 0,
      connectionCount: 0,
      networkLatency: 0,
      isHealthy: true
    };

    this.setupWebSocketServer();
    this.setupRedisConnection();
    this.startHealthCheck();
  }

  private async setupRedisConnection() {
    try {
      await this.redisClient.connect();
      console.log(`[${this.nodeId}] Connected to Redis cluster`);
    } catch (error) {
      console.error(`[${this.nodeId}] Redis connection failed:`, error);
    }
  }

  private setupWebSocketServer() {
    this.wss.on('connection', async (socket: WebSocket, request) => {
      const connectionId = this.generateConnectionId();
      const ipAddress = request.socket.remoteAddress;
      const userAgent = request.headers['user-agent'];

      console.log(`[${this.nodeId}] New WebSocket connection: ${connectionId}`);

      // Store connection
      this.connections.set(connectionId, socket);
      this.nodeMetrics.connectionCount = this.connections.size;

      // Handle connection events
      socket.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(connectionId, message);
        } catch (error) {
          console.error(`[${this.nodeId}] Message handling error:`, error);
        }
      });

      socket.on('close', async () => {
        await this.handleDisconnection(connectionId);
      });

      socket.on('error', (error) => {
        console.error(`[${this.nodeId}] WebSocket error:`, error);
      });

      // Send connection acknowledgment
      socket.send(JSON.stringify({
        type: 'connection_established',
        connectionId,
        nodeId: this.nodeId,
        timestamp: new Date().toISOString()
      }));
    });
  }

  private async handleMessage(connectionId: string, message: any) {
    const { type, data } = message;

    switch (type) {
      case 'authenticate':
        await this.handleAuthentication(connectionId, data);
        break;
      case 'join_classroom':
        await this.handleJoinClassroom(connectionId, data);
        break;
      case 'collaboration_update':
        await this.handleCollaborationUpdate(connectionId, data);
        break;
      case 'ping':
        await this.handlePing(connectionId);
        break;
      default:
        console.warn(`[${this.nodeId}] Unknown message type: ${type}`);
    }
  }

  private async handleAuthentication(connectionId: string, data: { userId: number }) {
    try {
      const { userId } = data;
      
      // Verify user exists
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length === 0) {
        this.sendError(connectionId, 'User not found');
        return;
      }

      // Store connection in database
      await db.insert(websocketConnections).values({
        connectionId,
        userId,
        nodeId: this.nodeId,
        isActive: true,
        metadata: {
          connectedAt: new Date(),
          userAgent: 'WebSocket Client'
        }
      });

      // Store in Redis for cross-node awareness
      await this.redisClient.setex(
        `connection:${connectionId}`,
        3600, // 1 hour TTL
        JSON.stringify({
          userId,
          nodeId: this.nodeId,
          connectedAt: new Date(),
          isActive: true
        })
      );

      this.sendSuccess(connectionId, 'Authentication successful');
    } catch (error) {
      console.error(`[${this.nodeId}] Authentication error:`, error);
      this.sendError(connectionId, 'Authentication failed');
    }
  }

  private async handleJoinClassroom(connectionId: string, data: { classroomId: number }) {
    try {
      const { classroomId } = data;
      
      // Verify classroom exists
      const classroom = await db.select().from(classrooms).where(eq(classrooms.id, classroomId)).limit(1);
      if (classroom.length === 0) {
        this.sendError(connectionId, 'Classroom not found');
        return;
      }

      // Update connection with classroom info
      await db.update(websocketConnections)
        .set({ classroomId })
        .where(eq(websocketConnections.connectionId, connectionId));

      // Subscribe to classroom-specific Redis channel
      await this.redisClient.subscribe(`classroom:${classroomId}:updates`);

      this.sendSuccess(connectionId, 'Joined classroom successfully');
    } catch (error) {
      console.error(`[${this.nodeId}] Join classroom error:`, error);
      this.sendError(connectionId, 'Failed to join classroom');
    }
  }

  private async handleCollaborationUpdate(connectionId: string, data: any) {
    try {
      const { resourceId, resourceType, changes } = data;
      
      // Store collaboration state
      await db.insert(collaborationState).values({
        resourceId,
        resourceType,
        userId: data.userId,
        cursorPosition: changes.cursorPosition,
        selection: changes.selection,
        isActive: true
      });

      // Broadcast to other users in the same resource
      const channel = `collaboration:${resourceType}:${resourceId}`;
      await this.redisClient.publish(channel, JSON.stringify({
        type: 'collaboration_update',
        userId: data.userId,
        changes,
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      console.error(`[${this.nodeId}] Collaboration update error:`, error);
    }
  }

  private async handlePing(connectionId: string) {
    // Update last ping time
    await db.update(websocketConnections)
      .set({ lastPingAt: new Date() })
      .where(eq(websocketConnections.connectionId, connectionId));

    this.sendSuccess(connectionId, 'pong');
  }

  private async handleDisconnection(connectionId: string) {
    try {
      // Mark connection as inactive
      await db.update(websocketConnections)
        .set({ isActive: false })
        .where(eq(websocketConnections.connectionId, connectionId));

      // Remove from Redis
      await this.redisClient.del(`connection:${connectionId}`);

      // Remove from local connections
      this.connections.delete(connectionId);
      this.nodeMetrics.connectionCount = this.connections.size;

      console.log(`[${this.nodeId}] Connection closed: ${connectionId}`);
    } catch (error) {
      console.error(`[${this.nodeId}] Disconnection handling error:`, error);
    }
  }

  private async startHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        // Update node metrics
        this.nodeMetrics.cpuUsage = await this.getCpuUsage();
        this.nodeMetrics.memoryUsage = await this.getMemoryUsage();
        this.nodeMetrics.networkLatency = await this.getNetworkLatency();
        this.nodeMetrics.isHealthy = this.nodeMetrics.cpuUsage < 90 && this.nodeMetrics.memoryUsage < 90;

        // Update Redis with current metrics
        await this.redisClient.setex(
          `node:${this.nodeId}:metrics`,
          30, // 30 second TTL
          JSON.stringify(this.nodeMetrics)
        );

        // Clean up inactive connections
        await this.cleanupInactiveConnections();

      } catch (error) {
        console.error(`[${this.nodeId}] Health check error:`, error);
      }
    }, 10000); // Every 10 seconds
  }

  private async getCpuUsage(): Promise<number> {
    // Simplified CPU usage calculation
    const startUsage = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, 100));
    const endUsage = process.cpuUsage(startUsage);
    return Math.min(100, (endUsage.user + endUsage.system) / 1000000);
  }

  private async getMemoryUsage(): Promise<number> {
    const memUsage = process.memoryUsage();
    return Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
  }

  private async getNetworkLatency(): Promise<number> {
    // Simplified latency calculation
    const start = Date.now();
    await this.redisClient.ping();
    return Date.now() - start;
  }

  private async cleanupInactiveConnections() {
    try {
      // Find connections that haven't pinged in 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const inactiveConnections = await db.select()
        .from(websocketConnections)
        .where(
          and(
            eq(websocketConnections.nodeId, this.nodeId),
            eq(websocketConnections.isActive, true)
          )
        );

      for (const conn of inactiveConnections) {
        if (!conn.lastPingAt || conn.lastPingAt < fiveMinutesAgo) {
          // Close inactive connection
          const socket = this.connections.get(conn.connectionId);
          if (socket) {
            socket.close();
            await this.handleDisconnection(conn.connectionId);
          }
        }
      }
    } catch (error) {
      console.error(`[${this.nodeId}] Cleanup error:`, error);
    }
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendSuccess(connectionId: string, message: string, data?: any) {
    const socket = this.connections.get(connectionId);
    if (socket) {
      socket.send(JSON.stringify({
        type: 'success',
        message,
        data,
        timestamp: new Date().toISOString()
      }));
    }
  }

  private sendError(connectionId: string, message: string, code?: string) {
    const socket = this.connections.get(connectionId);
    if (socket) {
      socket.send(JSON.stringify({
        type: 'error',
        message,
        code,
        timestamp: new Date().toISOString()
      }));
    }
  }

  public getNodeMetrics(): NodeMetrics {
    return { ...this.nodeMetrics };
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  public async broadcastToClassroom(classroomId: number, message: any) {
    try {
      const channel = `classroom:${classroomId}:updates`;
      await this.redisClient.publish(channel, JSON.stringify(message));
    } catch (error) {
      console.error(`[${this.nodeId}] Broadcast error:`, error);
    }
  }

  public async shutdown() {
    clearInterval(this.healthCheckInterval);
    
    // Close all connections
    for (const [connectionId, socket] of this.connections) {
      socket.close();
      await this.handleDisconnection(connectionId);
    }

    // Close Redis connection
    await this.redisClient.quit();
    
    // Close WebSocket server
    this.wss.close();
  }
}