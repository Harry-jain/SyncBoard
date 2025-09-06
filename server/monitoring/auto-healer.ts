import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { loadBalancerConfig, redisClusterConfig, websocketConnections } from '../../shared/schema';
import { RedisClusterManager } from '../networking/redis-cluster-manager';
import { IntelligentLoadBalancer } from '../networking/load-balancer';
import { WebSocketConnectionManager } from '../networking/websocket-manager';

export interface SystemMetrics {
  timestamp: Date;
  totalConnections: number;
  activeNodes: number;
  averageCpuUsage: number;
  averageMemoryUsage: number;
  averageLatency: number;
  errorRate: number;
  throughput: number;
}

export interface Alert {
  id: string;
  type: 'cpu' | 'memory' | 'latency' | 'connections' | 'error_rate' | 'node_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  nodeId?: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
}

export interface AutoHealingAction {
  type: 'scale_up' | 'scale_down' | 'migrate_connections' | 'restart_node' | 'add_node' | 'remove_node';
  nodeId?: string;
  region?: string;
  reason: string;
  timestamp: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export class NetworkAutoHealer {
  private redisManager: RedisClusterManager;
  private loadBalancer: IntelligentLoadBalancer;
  private websocketManager: WebSocketConnectionManager;
  private metrics: SystemMetrics;
  private alerts: Map<string, Alert> = new Map();
  private healingActions: Map<string, AutoHealingAction> = new Map();
  private monitoringInterval: NodeJS.Timeout;
  private alertingInterval: NodeJS.Timeout;

  // Thresholds for auto-healing
  private readonly THRESHOLDS = {
    CPU_HIGH: 85,
    CPU_CRITICAL: 95,
    MEMORY_HIGH: 85,
    MEMORY_CRITICAL: 95,
    LATENCY_HIGH: 200,
    LATENCY_CRITICAL: 500,
    CONNECTION_HIGH: 0.9, // 90% of capacity
    ERROR_RATE_HIGH: 0.05, // 5%
    ERROR_RATE_CRITICAL: 0.1 // 10%
  };

  constructor(
    redisManager: RedisClusterManager,
    loadBalancer: IntelligentLoadBalancer,
    websocketManager: WebSocketConnectionManager
  ) {
    this.redisManager = redisManager;
    this.loadBalancer = loadBalancer;
    this.websocketManager = websocketManager;
    
    this.metrics = {
      timestamp: new Date(),
      totalConnections: 0,
      activeNodes: 0,
      averageCpuUsage: 0,
      averageMemoryUsage: 0,
      averageLatency: 0,
      errorRate: 0,
      throughput: 0
    };

    this.startMonitoring();
    this.startAlerting();
  }

  private startMonitoring() {
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
      await this.analyzeSystemHealth();
    }, 10000); // Every 10 seconds
  }

  private startAlerting() {
    this.alertingInterval = setInterval(async () => {
      await this.processAlerts();
      await this.executeHealingActions();
    }, 5000); // Every 5 seconds
  }

  private async collectMetrics() {
    try {
      // Get load balancer metrics
      const lbMetrics = this.loadBalancer.getMetrics();
      const allNodes = this.loadBalancer.getAllNodes();
      const healthyNodes = allNodes.filter(n => n.isHealthy);

      // Calculate averages
      const totalCpu = healthyNodes.reduce((sum, n) => sum + n.cpuUsage, 0);
      const totalMemory = healthyNodes.reduce((sum, n) => sum + n.memoryUsage, 0);
      const totalLatency = healthyNodes.reduce((sum, n) => sum + n.networkLatency, 0);

      this.metrics = {
        timestamp: new Date(),
        totalConnections: lbMetrics.currentLoad,
        activeNodes: lbMetrics.healthyNodes,
        averageCpuUsage: healthyNodes.length > 0 ? totalCpu / healthyNodes.length : 0,
        averageMemoryUsage: healthyNodes.length > 0 ? totalMemory / healthyNodes.length : 0,
        averageLatency: healthyNodes.length > 0 ? totalLatency / healthyNodes.length : 0,
        errorRate: await this.calculateErrorRate(),
        throughput: await this.calculateThroughput()
      };

      // Store metrics in Redis for historical analysis
      await this.redisManager.set(
        `metrics:${Date.now()}`,
        JSON.stringify(this.metrics),
        3600 // 1 hour TTL
      );

    } catch (error) {
      console.error('Failed to collect metrics:', error);
    }
  }

  private async calculateErrorRate(): Promise<number> {
    try {
      // Get error count from Redis (simplified)
      const errorCount = await this.redisManager.get('error_count') || '0';
      const totalRequests = await this.redisManager.get('total_requests') || '1';
      
      return parseInt(errorCount) / parseInt(totalRequests);
    } catch (error) {
      return 0;
    }
  }

  private async calculateThroughput(): Promise<number> {
    try {
      // Calculate requests per second (simplified)
      const requests = await this.redisManager.get('requests_per_second') || '0';
      return parseInt(requests);
    } catch (error) {
      return 0;
    }
  }

  private async analyzeSystemHealth() {
    const { averageCpuUsage, averageMemoryUsage, averageLatency, totalConnections, errorRate } = this.metrics;
    const allNodes = this.loadBalancer.getAllNodes();

    // Check CPU usage
    if (averageCpuUsage > this.THRESHOLDS.CPU_CRITICAL) {
      await this.createAlert('cpu', 'critical', `Critical CPU usage: ${averageCpuUsage}%`, averageCpuUsage, this.THRESHOLDS.CPU_CRITICAL);
      await this.scheduleHealingAction('scale_up', 'High CPU usage detected');
    } else if (averageCpuUsage > this.THRESHOLDS.CPU_HIGH) {
      await this.createAlert('cpu', 'high', `High CPU usage: ${averageCpuUsage}%`, averageCpuUsage, this.THRESHOLDS.CPU_HIGH);
    }

    // Check memory usage
    if (averageMemoryUsage > this.THRESHOLDS.MEMORY_CRITICAL) {
      await this.createAlert('memory', 'critical', `Critical memory usage: ${averageMemoryUsage}%`, averageMemoryUsage, this.THRESHOLDS.MEMORY_CRITICAL);
      await this.scheduleHealingAction('scale_up', 'High memory usage detected');
    } else if (averageMemoryUsage > this.THRESHOLDS.MEMORY_HIGH) {
      await this.createAlert('memory', 'high', `High memory usage: ${averageMemoryUsage}%`, averageMemoryUsage, this.THRESHOLDS.MEMORY_HIGH);
    }

    // Check latency
    if (averageLatency > this.THRESHOLDS.LATENCY_CRITICAL) {
      await this.createAlert('latency', 'critical', `Critical latency: ${averageLatency}ms`, averageLatency, this.THRESHOLDS.LATENCY_CRITICAL);
      await this.scheduleHealingAction('add_node', 'High latency detected');
    } else if (averageLatency > this.THRESHOLDS.LATENCY_HIGH) {
      await this.createAlert('latency', 'high', `High latency: ${averageLatency}ms`, averageLatency, this.THRESHOLDS.LATENCY_HIGH);
    }

    // Check connection capacity
    const capacityUtilization = totalConnections / this.loadBalancer.getMetrics().totalCapacity;
    if (capacityUtilization > this.THRESHOLDS.CONNECTION_HIGH) {
      await this.createAlert('connections', 'high', `High connection usage: ${Math.round(capacityUtilization * 100)}%`, capacityUtilization, this.THRESHOLDS.CONNECTION_HIGH);
      await this.scheduleHealingAction('scale_up', 'High connection usage detected');
    }

    // Check error rate
    if (errorRate > this.THRESHOLDS.ERROR_RATE_CRITICAL) {
      await this.createAlert('error_rate', 'critical', `Critical error rate: ${Math.round(errorRate * 100)}%`, errorRate, this.THRESHOLDS.ERROR_RATE_CRITICAL);
    } else if (errorRate > this.THRESHOLDS.ERROR_RATE_HIGH) {
      await this.createAlert('error_rate', 'high', `High error rate: ${Math.round(errorRate * 100)}%`, errorRate, this.THRESHOLDS.ERROR_RATE_HIGH);
    }

    // Check for failed nodes
    for (const node of allNodes) {
      if (!node.isHealthy) {
        await this.createAlert('node_failure', 'critical', `Node ${node.nodeId} is unhealthy`, 0, 0, node.nodeId);
        await this.scheduleHealingAction('migrate_connections', `Node ${node.nodeId} failure`, node.nodeId);
      }
    }
  }

  private async createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    message: string,
    value: number,
    threshold: number,
    nodeId?: string
  ) {
    const alertId = `${type}_${nodeId || 'system'}_${Date.now()}`;
    
    // Check if similar alert already exists
    const existingAlert = Array.from(this.alerts.values()).find(a => 
      a.type === type && 
      a.nodeId === nodeId && 
      !a.resolved &&
      (Date.now() - a.timestamp.getTime()) < 60000 // Within last minute
    );

    if (existingAlert) return;

    const alert: Alert = {
      id: alertId,
      type,
      severity,
      message,
      nodeId,
      value,
      threshold,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.set(alertId, alert);

    // Log alert
    console.log(`[AUTO-HEALER] ${severity.toUpperCase()} ALERT: ${message}`);

    // Store in Redis for persistence
    await this.redisManager.set(
      `alert:${alertId}`,
      JSON.stringify(alert),
      3600
    );
  }

  private async scheduleHealingAction(
    type: AutoHealingAction['type'],
    reason: string,
    nodeId?: string,
    region?: string
  ) {
    const actionId = `${type}_${Date.now()}`;
    
    // Check if similar action is already pending
    const existingAction = Array.from(this.healingActions.values()).find(a => 
      a.type === type && 
      a.nodeId === nodeId && 
      a.status === 'pending' &&
      (Date.now() - a.timestamp.getTime()) < 30000 // Within last 30 seconds
    );

    if (existingAction) return;

    const action: AutoHealingAction = {
      type,
      nodeId,
      region,
      reason,
      timestamp: new Date(),
      status: 'pending'
    };

    this.healingActions.set(actionId, action);

    console.log(`[AUTO-HEALER] Scheduled action: ${type} - ${reason}`);
  }

  private async processAlerts() {
    // Process and resolve alerts
    for (const [alertId, alert] of this.alerts) {
      if (alert.resolved) continue;

      // Check if alert condition still exists
      const shouldResolve = await this.shouldResolveAlert(alert);
      
      if (shouldResolve) {
        alert.resolved = true;
        console.log(`[AUTO-HEALER] Alert resolved: ${alert.message}`);
        
        // Update in Redis
        await this.redisManager.set(
          `alert:${alertId}`,
          JSON.stringify(alert),
          3600
        );
      }
    }
  }

  private async shouldResolveAlert(alert: Alert): Promise<boolean> {
    const { type, threshold } = alert;
    const { averageCpuUsage, averageMemoryUsage, averageLatency, errorRate } = this.metrics;

    switch (type) {
      case 'cpu':
        return averageCpuUsage < threshold * 0.8; // Resolve when 20% below threshold
      case 'memory':
        return averageMemoryUsage < threshold * 0.8;
      case 'latency':
        return averageLatency < threshold * 0.8;
      case 'error_rate':
        return errorRate < threshold * 0.8;
      case 'node_failure':
        // Check if node is healthy again
        const node = this.loadBalancer.getNodeMetrics(alert.nodeId!);
        return node?.isHealthy || false;
      default:
        return false;
    }
  }

  private async executeHealingActions() {
    for (const [actionId, action] of this.healingActions) {
      if (action.status !== 'pending') continue;

      action.status = 'in_progress';
      console.log(`[AUTO-HEALER] Executing action: ${action.type}`);

      try {
        await this.executeAction(action);
        action.status = 'completed';
        console.log(`[AUTO-HEALER] Action completed: ${action.type}`);
      } catch (error) {
        action.status = 'failed';
        console.error(`[AUTO-HEALER] Action failed: ${action.type}`, error);
      }
    }
  }

  private async executeAction(action: AutoHealingAction) {
    switch (action.type) {
      case 'scale_up':
        await this.scaleUpNodes();
        break;
      case 'scale_down':
        await this.scaleDownNodes();
        break;
      case 'migrate_connections':
        if (action.nodeId) {
          await this.migrateConnections(action.nodeId);
        }
        break;
      case 'restart_node':
        if (action.nodeId) {
          await this.restartNode(action.nodeId);
        }
        break;
      case 'add_node':
        if (action.region) {
          await this.addNode(action.region);
        }
        break;
      case 'remove_node':
        if (action.nodeId) {
          await this.removeNode(action.nodeId);
        }
        break;
    }
  }

  private async scaleUpNodes() {
    console.log('[AUTO-HEALER] Scaling up nodes...');
    // In production, this would trigger Kubernetes scaling or cloud provider APIs
    // For now, we'll simulate by adding a new node
    const regions = this.loadBalancer.getMetrics().regions;
    if (regions.length > 0) {
      const region = regions[0]; // Use first available region
      await this.addNode(region);
    }
  }

  private async scaleDownNodes() {
    console.log('[AUTO-HEALER] Scaling down nodes...');
    // Find least loaded node to remove
    const nodes = this.loadBalancer.getAllNodes();
    const leastLoaded = nodes.reduce((min, node) => 
      node.currentLoad < min.currentLoad ? node : min
    );
    
    if (leastLoaded && leastLoaded.currentLoad < 0.1) { // Only if very low load
      await this.removeNode(leastLoaded.nodeId);
    }
  }

  private async migrateConnections(failedNodeId: string) {
    console.log(`[AUTO-HEALER] Migrating connections from failed node: ${failedNodeId}`);
    
    // Get connections from failed node
    const connections = await db.select()
      .from(websocketConnections)
      .where(and(
        eq(websocketConnections.nodeId, failedNodeId),
        eq(websocketConnections.isActive, true)
      ));

    // Find optimal target node
    const targetNodeId = this.loadBalancer.selectOptimalNode({
      userId: 0, // System migration
      priority: 'high'
    });

    if (targetNodeId) {
      // Update connections to new node
      for (const conn of connections) {
        await db.update(websocketConnections)
          .set({ nodeId: targetNodeId })
          .where(eq(websocketConnections.id, conn.id));
      }

      console.log(`[AUTO-HEALER] Migrated ${connections.length} connections to node: ${targetNodeId}`);
    }
  }

  private async restartNode(nodeId: string) {
    console.log(`[AUTO-HEALER] Restarting node: ${nodeId}`);
    // In production, this would trigger node restart via orchestration system
    // For now, we'll mark it as healthy after a delay
    setTimeout(async () => {
      await db.update(loadBalancerConfig)
        .set({ isHealthy: true })
        .where(eq(loadBalancerConfig.nodeId, nodeId));
    }, 30000); // 30 second delay
  }

  private async addNode(region: string) {
    console.log(`[AUTO-HEALER] Adding node to region: ${region}`);
    
    const nodeId = `node_${Date.now()}`;
    const capacity = 1000; // Default capacity
    
    await this.loadBalancer.addNode(nodeId, region, capacity);
    console.log(`[AUTO-HEALER] Added node ${nodeId} to ${region}`);
  }

  private async removeNode(nodeId: string) {
    console.log(`[AUTO-HEALER] Removing node: ${nodeId}`);
    
    // Migrate connections first
    await this.migrateConnections(nodeId);
    
    // Remove node
    await this.loadBalancer.removeNode(nodeId);
    console.log(`[AUTO-HEALER] Removed node ${nodeId}`);
  }

  // Public methods for monitoring

  public getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  public getAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(a => !a.resolved);
  }

  public getHealingActions(): AutoHealingAction[] {
    return Array.from(this.healingActions.values());
  }

  public async shutdown() {
    clearInterval(this.monitoringInterval);
    clearInterval(this.alertingInterval);
  }
}