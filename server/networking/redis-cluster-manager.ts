import { createClient, RedisClientType } from 'redis';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { redisClusterConfig, loadBalancerConfig } from '../../shared/schema';

export interface RedisNode {
  nodeId: string;
  host: string;
  port: number;
  isMaster: boolean;
  isActive: boolean;
  lastHealthCheck?: Date;
}

export interface ClusterMetrics {
  totalNodes: number;
  activeNodes: number;
  masterNodes: number;
  averageLatency: number;
  totalConnections: number;
  memoryUsage: number;
}

export class RedisClusterManager {
  private clients: Map<string, RedisClientType> = new Map();
  private masterClient: RedisClientType | null = null;
  private nodes: RedisNode[] = [];
  private clusterMetrics: ClusterMetrics;
  private healthCheckInterval: NodeJS.Timeout;

  constructor() {
    this.clusterMetrics = {
      totalNodes: 0,
      activeNodes: 0,
      masterNodes: 0,
      averageLatency: 0,
      totalConnections: 0,
      memoryUsage: 0
    };

    this.initializeCluster();
    this.startHealthCheck();
  }

  private async initializeCluster() {
    try {
      // Load cluster configuration from database
      const configs = await db.select().from(redisClusterConfig);
      
      for (const config of configs) {
        const node: RedisNode = {
          nodeId: config.nodeId,
          host: config.host,
          port: config.port,
          isMaster: config.isMaster,
          isActive: config.isActive,
          lastHealthCheck: config.lastHealthCheck || undefined
        };

        this.nodes.push(node);

        // Create Redis client for this node
        const client = createClient({
          url: `redis://${config.host}:${config.port}`,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3
        });

        client.on('error', (error) => {
          console.error(`Redis node ${config.nodeId} error:`, error);
          this.handleNodeFailure(config.nodeId);
        });

        client.on('connect', () => {
          console.log(`Connected to Redis node: ${config.nodeId}`);
        });

        try {
          await client.connect();
          this.clients.set(config.nodeId, client);

          if (config.isMaster) {
            this.masterClient = client;
          }
        } catch (error) {
          console.error(`Failed to connect to Redis node ${config.nodeId}:`, error);
        }
      }

      this.updateClusterMetrics();
      console.log(`Redis cluster initialized with ${this.clients.size} nodes`);
    } catch (error) {
      console.error('Failed to initialize Redis cluster:', error);
    }
  }

  private async startHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  private async performHealthCheck() {
    const healthPromises = Array.from(this.clients.entries()).map(async ([nodeId, client]) => {
      try {
        const start = Date.now();
        await client.ping();
        const latency = Date.now() - start;

        // Update node health in database
        await db.update(redisClusterConfig)
          .set({ 
            isActive: true,
            lastHealthCheck: new Date()
          })
          .where(eq(redisClusterConfig.nodeId, nodeId));

        return { nodeId, isHealthy: true, latency };
      } catch (error) {
        console.error(`Health check failed for node ${nodeId}:`, error);
        
        // Mark node as inactive
        await db.update(redisClusterConfig)
          .set({ isActive: false })
          .where(eq(redisClusterConfig.nodeId, nodeId));

        return { nodeId, isHealthy: false, latency: 0 };
      }
    });

    const results = await Promise.all(healthPromises);
    this.updateClusterMetrics();
    
    // Handle failed nodes
    const failedNodes = results.filter(r => !r.isHealthy);
    for (const failed of failedNodes) {
      this.handleNodeFailure(failed.nodeId);
    }
  }

  private async handleNodeFailure(nodeId: string) {
    console.log(`Handling failure for Redis node: ${nodeId}`);
    
    // Remove client
    const client = this.clients.get(nodeId);
    if (client) {
      try {
        await client.quit();
      } catch (error) {
        console.error(`Error closing failed node ${nodeId}:`, error);
      }
      this.clients.delete(nodeId);
    }

    // If this was the master, promote another node
    const node = this.nodes.find(n => n.nodeId === nodeId);
    if (node?.isMaster) {
      await this.promoteNewMaster();
    }

    this.updateClusterMetrics();
  }

  private async promoteNewMaster() {
    const activeNodes = this.nodes.filter(n => n.isActive && this.clients.has(n.nodeId));
    if (activeNodes.length === 0) {
      console.error('No active nodes available for master promotion');
      return;
    }

    // Select the node with lowest latency as new master
    const newMaster = activeNodes.reduce((best, current) => {
      return current.nodeId < best.nodeId ? current : best; // Simple selection
    });

    // Update database
    await db.update(redisClusterConfig)
      .set({ isMaster: false })
      .where(eq(redisClusterConfig.isMaster, true));

    await db.update(redisClusterConfig)
      .set({ isMaster: true })
      .where(eq(redisClusterConfig.nodeId, newMaster.nodeId));

    this.masterClient = this.clients.get(newMaster.nodeId) || null;
    console.log(`Promoted node ${newMaster.nodeId} to master`);
  }

  private updateClusterMetrics() {
    this.clusterMetrics.totalNodes = this.nodes.length;
    this.clusterMetrics.activeNodes = this.clients.size;
    this.clusterMetrics.masterNodes = this.nodes.filter(n => n.isMaster && this.clients.has(n.nodeId)).length;
    
    // Calculate average latency (simplified)
    this.clusterMetrics.averageLatency = 50; // Placeholder
  }

  // Public methods for distributed operations

  public async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.masterClient) {
      throw new Error('No master Redis client available');
    }

    if (ttl) {
      await this.masterClient.setEx(key, ttl, value);
    } else {
      await this.masterClient.set(key, value);
    }
  }

  public async get(key: string): Promise<string | null> {
    if (!this.masterClient) {
      throw new Error('No master Redis client available');
    }

    return await this.masterClient.get(key);
  }

  public async del(key: string): Promise<number> {
    if (!this.masterClient) {
      throw new Error('No master Redis client available');
    }

    return await this.masterClient.del(key);
  }

  public async publish(channel: string, message: string): Promise<number> {
    if (!this.masterClient) {
      throw new Error('No master Redis client available');
    }

    return await this.masterClient.publish(channel, message);
  }

  public async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    if (!this.masterClient) {
      throw new Error('No master Redis client available');
    }

    await this.masterClient.subscribe(channel, callback);
  }

  public async hset(key: string, field: string, value: string): Promise<number> {
    if (!this.masterClient) {
      throw new Error('No master Redis client available');
    }

    return await this.masterClient.hSet(key, field, value);
  }

  public async hget(key: string, field: string): Promise<string | undefined> {
    if (!this.masterClient) {
      throw new Error('No master Redis client available');
    }

    return await this.masterClient.hGet(key, field);
  }

  public async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.masterClient) {
      throw new Error('No master Redis client available');
    }

    return await this.masterClient.hGetAll(key);
  }

  public async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.masterClient) {
      throw new Error('No master Redis client available');
    }

    return await this.masterClient.zAdd(key, { score, value: member });
  }

  public async zrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.masterClient) {
      throw new Error('No master Redis client available');
    }

    return await this.masterClient.zRange(key, start, stop);
  }

  public async zrem(key: string, member: string): Promise<number> {
    if (!this.masterClient) {
      throw new Error('No master Redis client available');
    }

    return await this.masterClient.zRem(key, member);
  }

  // Collaboration-specific methods

  public async syncCodeChange(projectId: string, change: any): Promise<void> {
    const timestamp = Date.now();
    const changeData = JSON.stringify(change);
    
    // Store in sorted set for chronological order
    await this.zadd(`project:${projectId}:changes`, timestamp, changeData);
    
    // Publish to all subscribers
    await this.publish(`project:${projectId}:code`, JSON.stringify({
      type: 'code_change',
      change,
      timestamp
    }));
  }

  public async getCodeChanges(projectId: string, since?: number): Promise<any[]> {
    const start = since ? since : 0;
    const changes = await this.zrange(`project:${projectId}:changes`, start, -1);
    
    return changes.map(change => JSON.parse(change));
  }

  public async updateUserPresence(userId: number, classroomId: number, presence: any): Promise<void> {
    const key = `presence:classroom:${classroomId}`;
    await this.hset(key, userId.toString(), JSON.stringify({
      ...presence,
      lastSeen: Date.now()
    }));
  }

  public async getUserPresence(classroomId: number): Promise<Record<number, any>> {
    const key = `presence:classroom:${classroomId}`;
    const presence = await this.hgetall(key);
    
    const result: Record<number, any> = {};
    for (const [userId, data] of Object.entries(presence)) {
      result[parseInt(userId)] = JSON.parse(data);
    }
    
    return result;
  }

  public getClusterMetrics(): ClusterMetrics {
    return { ...this.clusterMetrics };
  }

  public getActiveNodes(): RedisNode[] {
    return this.nodes.filter(n => n.isActive && this.clients.has(n.nodeId));
  }

  public async shutdown() {
    clearInterval(this.healthCheckInterval);
    
    // Close all Redis connections
    for (const [nodeId, client] of this.clients) {
      try {
        await client.quit();
      } catch (error) {
        console.error(`Error closing Redis client ${nodeId}:`, error);
      }
    }
    
    this.clients.clear();
  }
}