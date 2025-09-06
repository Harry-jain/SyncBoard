import { createServer, Server } from 'http';
import { Express } from 'express';
import cluster from 'cluster';
import os from 'os';
import { logger } from '../monitoring/logger';
import { connectionManager } from '../database/connection-manager';
import { rateLimiter } from '../security/rate-limiter';

export interface LoadBalancerConfig {
  port: number;
  workers: number;
  healthCheckInterval: number;
  maxMemoryUsage: number;
  restartThreshold: number;
  stickySessions: boolean;
}

export interface WorkerInfo {
  id: number;
  pid: number;
  port: number;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  startTime: Date;
  lastHealthCheck: Date;
  memoryUsage: number;
  requestCount: number;
  errorCount: number;
}

export class LoadBalancer {
  private static instance: LoadBalancer;
  private config: LoadBalancerConfig;
  private workers: Map<number, WorkerInfo> = new Map();
  private workerPorts: number[] = [];
  private currentWorkerIndex: number = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private server: Server | null = null;

  private constructor() {
    this.config = {
      port: parseInt(process.env.PORT || '5000'),
      workers: parseInt(process.env.WORKERS || os.cpus().length.toString()),
      healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
      maxMemoryUsage: parseInt(process.env.MAX_MEMORY_USAGE || '500') * 1024 * 1024, // 500MB
      restartThreshold: parseInt(process.env.RESTART_THRESHOLD || '10'),
      stickySessions: process.env.STICKY_SESSIONS === 'true'
    };
  }

  public static getInstance(): LoadBalancer {
    if (!LoadBalancer.instance) {
      LoadBalancer.instance = new LoadBalancer();
    }
    return LoadBalancer.instance;
  }

  // Start the load balancer
  public async start(app: Express): Promise<void> {
    if (cluster.isMaster) {
      await this.startMaster();
    } else {
      await this.startWorker(app);
    }
  }

  private async startMaster(): Promise<void> {
    logger.info('Starting Load Balancer Master Process', {
      workers: this.config.workers,
      port: this.config.port
    });

    // Generate worker ports
    this.generateWorkerPorts();

    // Start workers
    for (let i = 0; i < this.config.workers; i++) {
      await this.startWorkerProcess(i);
    }

    // Start health checks
    this.startHealthChecks();

    // Handle worker events
    cluster.on('exit', (worker, code, signal) => {
      logger.warn('Worker process exited', {
        workerId: worker.id,
        code,
        signal,
        pid: worker.process.pid
      });

      // Restart worker if it wasn't intentionally stopped
      if (worker.exitedAfterDisconnect !== true) {
        this.restartWorker(worker.id);
      }
    });

    cluster.on('disconnect', (worker) => {
      logger.info('Worker process disconnected', {
        workerId: worker.id,
        pid: worker.process.pid
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
  }

  private async startWorker(app: Express): Promise<void> {
    const workerId = parseInt(process.env.WORKER_ID || '0');
    const port = parseInt(process.env.WORKER_PORT || '5001');

    logger.info('Starting Worker Process', {
      workerId,
      port,
      pid: process.pid
    });

    // Initialize worker info
    const workerInfo: WorkerInfo = {
      id: workerId,
      pid: process.pid,
      port,
      status: 'starting',
      startTime: new Date(),
      lastHealthCheck: new Date(),
      memoryUsage: process.memoryUsage().heapUsed,
      requestCount: 0,
      errorCount: 0
    };

    this.workers.set(workerId, workerInfo);

    // Start server
    this.server = createServer(app);
    
    this.server.listen(port, () => {
      workerInfo.status = 'running';
      logger.info('Worker started successfully', {
        workerId,
        port,
        pid: process.pid
      });
    });

    // Handle server errors
    this.server.on('error', (error) => {
      logger.error('Worker server error', error, {
        workerId,
        port,
        pid: process.pid
      });
      workerInfo.errorCount++;
    });

    // Track requests
    this.server.on('request', () => {
      workerInfo.requestCount++;
    });

    // Start worker health monitoring
    this.startWorkerHealthMonitoring(workerId);

    // Graceful shutdown
    process.on('SIGTERM', () => this.gracefulWorkerShutdown());
    process.on('SIGINT', () => this.gracefulWorkerShutdown());
  }

  private async startWorkerProcess(workerId: number): Promise<void> {
    const port = this.workerPorts[workerId];
    
    const worker = cluster.fork({
      WORKER_ID: workerId.toString(),
      WORKER_PORT: port.toString()
    });

    const workerInfo: WorkerInfo = {
      id: workerId,
      pid: worker.process.pid,
      port,
      status: 'starting',
      startTime: new Date(),
      lastHealthCheck: new Date(),
      memoryUsage: 0,
      requestCount: 0,
      errorCount: 0
    };

    this.workers.set(workerId, workerInfo);

    logger.info('Worker process started', {
      workerId,
      port,
      pid: worker.process.pid
    });
  }

  private generateWorkerPorts(): void {
    const basePort = this.config.port + 1;
    for (let i = 0; i < this.config.workers; i++) {
      this.workerPorts.push(basePort + i);
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  private async performHealthChecks(): Promise<void> {
    for (const [workerId, workerInfo] of this.workers.entries()) {
      try {
        const isHealthy = await this.checkWorkerHealth(workerInfo);
        
        if (!isHealthy) {
          logger.warn('Unhealthy worker detected', {
            workerId,
            pid: workerInfo.pid,
            status: workerInfo.status,
            memoryUsage: workerInfo.memoryUsage,
            errorCount: workerInfo.errorCount
          });

          // Restart unhealthy worker
          await this.restartWorker(workerId);
        }
      } catch (error) {
        logger.error('Health check failed', error, { workerId });
      }
    }
  }

  private async checkWorkerHealth(workerInfo: WorkerInfo): Promise<boolean> {
    // Check if worker is running
    if (workerInfo.status !== 'running') {
      return false;
    }

    // Check memory usage
    if (workerInfo.memoryUsage > this.config.maxMemoryUsage) {
      logger.warn('Worker exceeded memory limit', {
        workerId: workerInfo.id,
        memoryUsage: workerInfo.memoryUsage,
        maxMemoryUsage: this.config.maxMemoryUsage
      });
      return false;
    }

    // Check error rate
    const errorRate = workerInfo.requestCount > 0 
      ? (workerInfo.errorCount / workerInfo.requestCount) * 100 
      : 0;

    if (errorRate > this.config.restartThreshold) {
      logger.warn('Worker exceeded error threshold', {
        workerId: workerInfo.id,
        errorRate,
        errorCount: workerInfo.errorCount,
        requestCount: workerInfo.requestCount
      });
      return false;
    }

    // Check if worker is responsive
    try {
      const response = await fetch(`http://localhost:${workerInfo.port}/health`);
      if (!response.ok) {
        return false;
      }
    } catch (error) {
      return false;
    }

    return true;
  }

  private async restartWorker(workerId: number): Promise<void> {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) return;

    logger.info('Restarting worker', {
      workerId,
      pid: workerInfo.pid
    });

    // Kill existing worker
    const worker = cluster.workers![workerId];
    if (worker) {
      worker.kill('SIGTERM');
    }

    // Wait a bit before starting new worker
    setTimeout(async () => {
      await this.startWorkerProcess(workerId);
    }, 1000);
  }

  private startWorkerHealthMonitoring(workerId: number): void {
    setInterval(() => {
      const workerInfo = this.workers.get(workerId);
      if (workerInfo) {
        workerInfo.memoryUsage = process.memoryUsage().heapUsed;
        workerInfo.lastHealthCheck = new Date();
      }
    }, 5000); // Every 5 seconds
  }

  // Get next available worker (round-robin)
  public getNextWorker(): WorkerInfo | null {
    const availableWorkers = Array.from(this.workers.values())
      .filter(worker => worker.status === 'running');

    if (availableWorkers.length === 0) {
      return null;
    }

    const worker = availableWorkers[this.currentWorkerIndex % availableWorkers.length];
    this.currentWorkerIndex++;
    return worker;
  }

  // Get worker by ID
  public getWorker(workerId: number): WorkerInfo | null {
    return this.workers.get(workerId) || null;
  }

  // Get all workers
  public getAllWorkers(): WorkerInfo[] {
    return Array.from(this.workers.values());
  }

  // Get load balancer statistics
  public getStats(): {
    totalWorkers: number;
    runningWorkers: number;
    totalRequests: number;
    totalErrors: number;
    averageMemoryUsage: number;
    uptime: number;
  } {
    const workers = Array.from(this.workers.values());
    const runningWorkers = workers.filter(w => w.status === 'running');
    const totalRequests = workers.reduce((sum, w) => sum + w.requestCount, 0);
    const totalErrors = workers.reduce((sum, w) => sum + w.errorCount, 0);
    const averageMemoryUsage = workers.length > 0 
      ? workers.reduce((sum, w) => sum + w.memoryUsage, 0) / workers.length 
      : 0;

    return {
      totalWorkers: workers.length,
      runningWorkers: runningWorkers.length,
      totalRequests,
      totalErrors,
      averageMemoryUsage: Math.round(averageMemoryUsage),
      uptime: process.uptime()
    };
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info('Starting graceful shutdown');

    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Stop all workers
    for (const worker of Object.values(cluster.workers || {})) {
      if (worker) {
        worker.kill('SIGTERM');
      }
    }

    // Close database connections
    await connectionManager.close();

    // Close rate limiter
    await rateLimiter.close();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  }

  private async gracefulWorkerShutdown(): Promise<void> {
    logger.info('Starting graceful worker shutdown');

    // Close server
    if (this.server) {
      this.server.close(() => {
        logger.info('Worker server closed');
        process.exit(0);
      });
    }

    // Close database connections
    await connectionManager.close();

    logger.info('Graceful worker shutdown completed');
  }
}

export const loadBalancer = LoadBalancer.getInstance();