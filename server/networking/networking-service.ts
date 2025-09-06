import { WebSocketConnectionManager } from './websocket-manager';
import { RedisClusterManager } from './redis-cluster-manager';
import { IntelligentLoadBalancer } from './load-balancer';
import { NetworkAutoHealer } from '../monitoring/auto-healer';
import { ClassroomManager } from '../classroom/classroom-manager';
import { CollaborationEngine } from '../collaboration/collaboration-engine';

export class SyncBoardNetworkingService {
  private websocketManager: WebSocketConnectionManager;
  private redisManager: RedisClusterManager;
  private loadBalancer: IntelligentLoadBalancer;
  private autoHealer: NetworkAutoHealer;
  private classroomManager: ClassroomManager;
  private collaborationEngine: CollaborationEngine;
  private nodeId: string;
  private isInitialized: boolean = false;

  constructor(nodeId: string, websocketPort: number) {
    this.nodeId = nodeId;
    
    // Initialize Redis cluster manager first
    this.redisManager = new RedisClusterManager();
    
    // Initialize load balancer with Redis manager
    this.loadBalancer = new IntelligentLoadBalancer(this.redisManager);
    
    // Initialize WebSocket manager
    this.websocketManager = new WebSocketConnectionManager(websocketPort, nodeId);
    
    // Initialize auto-healer with all managers
    this.autoHealer = new NetworkAutoHealer(
      this.redisManager,
      this.loadBalancer,
      this.websocketManager
    );
    
    // Initialize classroom and collaboration managers
    this.classroomManager = new ClassroomManager(this.redisManager);
    this.collaborationEngine = new CollaborationEngine(this.redisManager);
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log(`[${this.nodeId}] Networking service already initialized`);
      return;
    }

    try {
      console.log(`[${this.nodeId}] Initializing SyncBoard Networking Service...`);

      // Register this node with the load balancer
      await this.loadBalancer.addNode(
        this.nodeId,
        process.env.REGION || 'us-east-1',
        1000 // Default capacity
      );

      // Start monitoring and auto-healing
      console.log(`[${this.nodeId}] Starting monitoring and auto-healing systems...`);

      // Set up graceful shutdown handlers
      this.setupGracefulShutdown();

      this.isInitialized = true;
      console.log(`[${this.nodeId}] SyncBoard Networking Service initialized successfully`);
    } catch (error) {
      console.error(`[${this.nodeId}] Failed to initialize networking service:`, error);
      throw error;
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`[${this.nodeId}] Received ${signal}, shutting down gracefully...`);
      
      try {
        // Remove node from load balancer
        await this.loadBalancer.removeNode(this.nodeId);
        
        // Shutdown all services
        await this.websocketManager.shutdown();
        await this.redisManager.shutdown();
        await this.autoHealer.shutdown();
        
        console.log(`[${this.nodeId}] Graceful shutdown completed`);
        process.exit(0);
      } catch (error) {
        console.error(`[${this.nodeId}] Error during shutdown:`, error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  // Public API methods

  public getClassroomManager(): ClassroomManager {
    return this.classroomManager;
  }

  public getCollaborationEngine(): CollaborationEngine {
    return this.collaborationEngine;
  }

  public getLoadBalancer(): IntelligentLoadBalancer {
    return this.loadBalancer;
  }

  public getRedisManager(): RedisClusterManager {
    return this.redisManager;
  }

  public getWebSocketManager(): WebSocketConnectionManager {
    return this.websocketManager;
  }

  public getAutoHealer(): NetworkAutoHealer {
    return this.autoHealer;
  }

  // Health check endpoint
  public async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    nodeId: string;
    timestamp: Date;
    metrics: any;
    alerts: any[];
  }> {
    try {
      const metrics = this.autoHealer.getMetrics();
      const alerts = this.autoHealer.getAlerts();
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      // Determine health status based on metrics and alerts
      if (alerts.some(alert => alert.severity === 'critical')) {
        status = 'unhealthy';
      } else if (alerts.some(alert => alert.severity === 'high')) {
        status = 'degraded';
      }

      return {
        status,
        nodeId: this.nodeId,
        timestamp: new Date(),
        metrics,
        alerts
      };
    } catch (error) {
      console.error(`[${this.nodeId}] Health check failed:`, error);
      return {
        status: 'unhealthy',
        nodeId: this.nodeId,
        timestamp: new Date(),
        metrics: {},
        alerts: [{
          type: 'system',
          severity: 'critical',
          message: 'Health check failed',
          timestamp: new Date()
        }]
      };
    }
  }

  // Get system metrics
  public getSystemMetrics() {
    return {
      nodeId: this.nodeId,
      websocketConnections: this.websocketManager.getConnectionCount(),
      loadBalancerMetrics: this.loadBalancer.getMetrics(),
      redisMetrics: this.redisManager.getClusterMetrics(),
      autoHealerMetrics: this.autoHealer.getMetrics()
    };
  }

  // Broadcast message to all connected clients
  public async broadcastMessage(message: any): Promise<void> {
    try {
      await this.redisManager.publish('global:broadcast', JSON.stringify({
        ...message,
        timestamp: new Date().toISOString(),
        nodeId: this.nodeId
      }));
    } catch (error) {
      console.error(`[${this.nodeId}] Failed to broadcast message:`, error);
    }
  }

  // Broadcast to specific classroom
  public async broadcastToClassroom(classroomId: number, message: any): Promise<void> {
    try {
      await this.classroomManager.broadcastToClassroom(classroomId, message);
    } catch (error) {
      console.error(`[${this.nodeId}] Failed to broadcast to classroom ${classroomId}:`, error);
    }
  }

  // Get optimal node for new connection
  public selectOptimalNode(request: any): string | null {
    return this.loadBalancer.selectOptimalNode(request);
  }

  // Update node load
  public async updateNodeLoad(loadChange: number): Promise<void> {
    await this.loadBalancer.updateNodeLoad(this.nodeId, loadChange);
  }

  // Get active users in a classroom
  public async getActiveUsers(classroomId: number): Promise<any[]> {
    try {
      const presence = await this.redisManager.getUserPresence(classroomId);
      return Object.entries(presence).map(([userId, data]) => ({
        userId: parseInt(userId),
        ...data
      }));
    } catch (error) {
      console.error(`[${this.nodeId}] Failed to get active users:`, error);
      return [];
    }
  }

  // Sync code changes across all users
  public async syncCodeChange(projectId: string, userId: number, changes: any): Promise<void> {
    try {
      await this.collaborationEngine.syncCodeChange(projectId, userId, changes);
    } catch (error) {
      console.error(`[${this.nodeId}] Failed to sync code change:`, error);
    }
  }

  // Get code changes for a project
  public async getCodeChanges(projectId: string, since?: number): Promise<any[]> {
    try {
      return await this.collaborationEngine.getCodeChanges(projectId, since);
    } catch (error) {
      console.error(`[${this.nodeId}] Failed to get code changes:`, error);
      return [];
    }
  }

  // Update user presence
  public async updateUserPresence(
    documentId: string, 
    documentType: string, 
    userId: number, 
    cursor: any
  ): Promise<void> {
    try {
      await this.collaborationEngine.updateUserPresence(documentId, documentType, userId, cursor);
    } catch (error) {
      console.error(`[${this.nodeId}] Failed to update user presence:`, error);
    }
  }

  // Get document for collaboration
  public async getDocument(documentId: string, documentType: string): Promise<any> {
    try {
      return await this.collaborationEngine.getDocument(documentId, documentType);
    } catch (error) {
      console.error(`[${this.nodeId}] Failed to get document:`, error);
      return null;
    }
  }

  // Update document
  public async updateDocument(
    documentId: string, 
    documentType: string, 
    userId: number, 
    operation: any
  ): Promise<any> {
    try {
      return await this.collaborationEngine.updateDocument(documentId, documentType, userId, operation);
    } catch (error) {
      console.error(`[${this.nodeId}] Failed to update document:`, error);
      return null;
    }
  }

  // Get active users in a document
  public async getActiveUsersInDocument(documentId: string, documentType: string): Promise<any[]> {
    try {
      return await this.collaborationEngine.getActiveUsers(documentId, documentType);
    } catch (error) {
      console.error(`[${this.nodeId}] Failed to get active users in document:`, error);
      return [];
    }
  }
}

// Singleton instance
let networkingService: SyncBoardNetworkingService | null = null;

export function getNetworkingService(): SyncBoardNetworkingService {
  if (!networkingService) {
    const nodeId = process.env.NODE_ID || `node_${Date.now()}`;
    const websocketPort = parseInt(process.env.WEBSOCKET_PORT || '8080');
    networkingService = new SyncBoardNetworkingService(nodeId, websocketPort);
  }
  return networkingService;
}

export async function initializeNetworkingService(): Promise<SyncBoardNetworkingService> {
  const service = getNetworkingService();
  await service.initialize();
  return service;
}