import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { loadBalancerConfig, redisClusterConfig } from '../../shared/schema';
import { RedisClusterManager } from './redis-cluster-manager';

export interface LoadBalancerNode {
  nodeId: string;
  region: string;
  capacity: number;
  currentLoad: number;
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  isHealthy: boolean;
  lastUpdated: Date;
}

export interface LoadBalancerMetrics {
  totalNodes: number;
  healthyNodes: number;
  totalCapacity: number;
  currentLoad: number;
  averageLatency: number;
  regions: string[];
}

export interface ConnectionRequest {
  userId: number;
  classroomId?: number;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  userAgent?: string;
  priority?: 'high' | 'normal' | 'low';
}

export class IntelligentLoadBalancer {
  private redisManager: RedisClusterManager;
  private nodes: Map<string, LoadBalancerNode> = new Map();
  private metrics: LoadBalancerMetrics;
  private updateInterval: NodeJS.Timeout;
  private regionWeights: Map<string, number> = new Map();

  constructor(redisManager: RedisClusterManager) {
    this.redisManager = redisManager;
    this.metrics = {
      totalNodes: 0,
      healthyNodes: 0,
      totalCapacity: 0,
      currentLoad: 0,
      averageLatency: 0,
      regions: []
    };

    this.initializeLoadBalancer();
    this.startMetricsUpdate();
  }

  private async initializeLoadBalancer() {
    try {
      // Load initial node configuration
      await this.loadNodeConfigurations();
      
      // Set region weights based on capacity and performance
      this.calculateRegionWeights();
      
      console.log(`Load balancer initialized with ${this.nodes.size} nodes`);
    } catch (error) {
      console.error('Failed to initialize load balancer:', error);
    }
  }

  private async loadNodeConfigurations() {
    try {
      const configs = await db.select().from(loadBalancerConfig);
      
      for (const config of configs) {
        const node: LoadBalancerNode = {
          nodeId: config.nodeId,
          region: config.region,
          capacity: config.capacity,
          currentLoad: config.currentLoad,
          cpuUsage: config.cpuUsage,
          memoryUsage: config.memoryUsage,
          networkLatency: config.networkLatency,
          isHealthy: config.isHealthy,
          lastUpdated: config.lastUpdated
        };

        this.nodes.set(config.nodeId, node);
      }

      this.updateMetrics();
    } catch (error) {
      console.error('Failed to load node configurations:', error);
    }
  }

  private calculateRegionWeights() {
    const regionStats = new Map<string, { totalCapacity: number; averageLatency: number; nodeCount: number }>();
    
    for (const node of this.nodes.values()) {
      if (!node.isHealthy) continue;
      
      const stats = regionStats.get(node.region) || { totalCapacity: 0, averageLatency: 0, nodeCount: 0 };
      stats.totalCapacity += node.capacity;
      stats.averageLatency += node.networkLatency;
      stats.nodeCount += 1;
      regionStats.set(node.region, stats);
    }

    // Calculate weights based on capacity and inverse latency
    for (const [region, stats] of regionStats) {
      const averageLatency = stats.averageLatency / stats.nodeCount;
      const weight = (stats.totalCapacity * 100) / (averageLatency + 1); // +1 to avoid division by zero
      this.regionWeights.set(region, weight);
    }
  }

  private startMetricsUpdate() {
    this.updateInterval = setInterval(async () => {
      await this.updateNodeMetrics();
    }, 5000); // Update every 5 seconds
  }

  private async updateNodeMetrics() {
    try {
      // Get real-time metrics from Redis
      const clusterMetrics = this.redisManager.getClusterMetrics();
      
      // Update each node's metrics
      for (const [nodeId, node] of this.nodes) {
        // Simulate real-time metrics (in production, these would come from actual monitoring)
        const updatedNode = {
          ...node,
          currentLoad: Math.floor(Math.random() * node.capacity),
          cpuUsage: Math.floor(Math.random() * 100),
          memoryUsage: Math.floor(Math.random() * 100),
          networkLatency: Math.floor(Math.random() * 100) + 10,
          isHealthy: Math.random() > 0.05, // 95% uptime
          lastUpdated: new Date()
        };

        this.nodes.set(nodeId, updatedNode);

        // Update database
        await db.update(loadBalancerConfig)
          .set({
            currentLoad: updatedNode.currentLoad,
            cpuUsage: updatedNode.cpuUsage,
            memoryUsage: updatedNode.memoryUsage,
            networkLatency: updatedNode.networkLatency,
            isHealthy: updatedNode.isHealthy,
            lastUpdated: updatedNode.lastUpdated
          })
          .where(eq(loadBalancerConfig.nodeId, nodeId));
      }

      this.updateMetrics();
    } catch (error) {
      console.error('Failed to update node metrics:', error);
    }
  }

  private updateMetrics() {
    const healthyNodes = Array.from(this.nodes.values()).filter(n => n.isHealthy);
    const regions = new Set(healthyNodes.map(n => n.region));
    
    this.metrics = {
      totalNodes: this.nodes.size,
      healthyNodes: healthyNodes.length,
      totalCapacity: healthyNodes.reduce((sum, n) => sum + n.capacity, 0),
      currentLoad: healthyNodes.reduce((sum, n) => sum + n.currentLoad, 0),
      averageLatency: healthyNodes.reduce((sum, n) => sum + n.networkLatency, 0) / healthyNodes.length || 0,
      regions: Array.from(regions)
    };
  }

  public selectOptimalNode(request: ConnectionRequest): string | null {
    const availableNodes = Array.from(this.nodes.values()).filter(node => 
      node.isHealthy && 
      node.currentLoad < node.capacity * 0.9 // 90% capacity threshold
    );

    if (availableNodes.length === 0) {
      return null;
    }

    // Multi-factor scoring algorithm
    const scoredNodes = availableNodes.map(node => {
      const score = this.calculateNodeScore(node, request);
      return { node, score };
    });

    // Sort by score (highest first) and return the best node
    scoredNodes.sort((a, b) => b.score - a.score);
    return scoredNodes[0].node.nodeId;
  }

  private calculateNodeScore(node: LoadBalancerNode, request: ConnectionRequest): number {
    const weights = {
      cpu: 0.3,           // CPU utilization (lower is better)
      memory: 0.2,        // Memory utilization (lower is better)
      capacity: 0.4,      // Available capacity (higher is better)
      latency: 0.1        // Network latency (lower is better)
    };

    // CPU score (0-100, higher is better)
    const cpuScore = Math.max(0, 100 - node.cpuUsage);

    // Memory score (0-100, higher is better)
    const memoryScore = Math.max(0, 100 - node.memoryUsage);

    // Capacity score (0-100, higher is better)
    const capacityUtilization = node.currentLoad / node.capacity;
    const capacityScore = Math.max(0, 100 - (capacityUtilization * 100));

    // Latency score (0-100, higher is better)
    const latencyScore = Math.max(0, 100 - (node.networkLatency / 2));

    // Geographic proximity bonus
    let proximityBonus = 0;
    if (request.userLocation) {
      proximityBonus = this.calculateProximityBonus(node.region, request.userLocation);
    }

    // Region weight bonus
    const regionWeight = this.regionWeights.get(node.region) || 1;
    const regionBonus = Math.log(regionWeight) * 10; // Logarithmic scaling

    // Priority adjustment
    let priorityMultiplier = 1;
    if (request.priority === 'high') priorityMultiplier = 1.2;
    else if (request.priority === 'low') priorityMultiplier = 0.8;

    const baseScore = (
      cpuScore * weights.cpu +
      memoryScore * weights.memory +
      capacityScore * weights.capacity +
      latencyScore * weights.latency
    );

    return (baseScore + proximityBonus + regionBonus) * priorityMultiplier;
  }

  private calculateProximityBonus(region: string, userLocation: { latitude: number; longitude: number }): number {
    // Simplified geographic proximity calculation
    // In production, this would use actual geographic distance calculations
    const regionCenters: Record<string, { lat: number; lng: number }> = {
      'us-east-1': { lat: 39.8283, lng: -98.5795 },
      'us-west-2': { lat: 45.5152, lng: -122.6784 },
      'eu-west-1': { lat: 53.3498, lng: -6.2603 },
      'ap-southeast-1': { lat: 1.3521, lng: 103.8198 },
      'ap-northeast-1': { lat: 35.6762, lng: 139.6503 }
    };

    const regionCenter = regionCenters[region];
    if (!regionCenter) return 0;

    // Calculate distance (simplified)
    const distance = Math.sqrt(
      Math.pow(userLocation.latitude - regionCenter.lat, 2) +
      Math.pow(userLocation.longitude - regionCenter.lng, 2)
    );

    // Return bonus based on proximity (closer = higher bonus)
    return Math.max(0, 50 - distance * 10);
  }

  public async addNode(nodeId: string, region: string, capacity: number): Promise<void> {
    const node: LoadBalancerNode = {
      nodeId,
      region,
      capacity,
      currentLoad: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      networkLatency: 0,
      isHealthy: true,
      lastUpdated: new Date()
    };

    this.nodes.set(nodeId, node);

    // Add to database
    await db.insert(loadBalancerConfig).values({
      region,
      nodeId,
      capacity,
      currentLoad: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      networkLatency: 0,
      isHealthy: true,
      lastUpdated: new Date()
    });

    this.calculateRegionWeights();
    this.updateMetrics();
  }

  public async removeNode(nodeId: string): Promise<void> {
    this.nodes.delete(nodeId);

    // Remove from database
    await db.delete(loadBalancerConfig)
      .where(eq(loadBalancerConfig.nodeId, nodeId));

    this.calculateRegionWeights();
    this.updateMetrics();
  }

  public getMetrics(): LoadBalancerMetrics {
    return { ...this.metrics };
  }

  public getNodeMetrics(nodeId: string): LoadBalancerNode | null {
    return this.nodes.get(nodeId) || null;
  }

  public getAllNodes(): LoadBalancerNode[] {
    return Array.from(this.nodes.values());
  }

  public getHealthyNodes(): LoadBalancerNode[] {
    return Array.from(this.nodes.values()).filter(n => n.isHealthy);
  }

  public async updateNodeLoad(nodeId: string, loadChange: number): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const newLoad = Math.max(0, Math.min(node.capacity, node.currentLoad + loadChange));
    node.currentLoad = newLoad;

    // Update database
    await db.update(loadBalancerConfig)
      .set({ currentLoad: newLoad })
      .where(eq(loadBalancerConfig.nodeId, nodeId));

    this.updateMetrics();
  }

  public async shutdown() {
    clearInterval(this.updateInterval);
  }
}