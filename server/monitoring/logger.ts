import winston from 'winston';
import { Request, Response } from 'express';
import { Redis } from 'ioredis';
import { connectionManager } from '../database/connection-manager';

export interface LogContext {
  userId?: number;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  classroomId?: number;
  assignmentId?: number;
  [key: string]: any;
}

export interface SecurityEvent {
  type: 'AUTH_FAILURE' | 'RATE_LIMIT' | 'PERMISSION_DENIED' | 'SUSPICIOUS_ACTIVITY' | 'DATA_BREACH_ATTEMPT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: number;
  ipAddress: string;
  details: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  userId?: number;
  timestamp: Date;
  memoryUsage: number;
  cpuUsage: number;
}

export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;
  private redis: Redis;
  private securityEvents: SecurityEvent[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];

  private constructor() {
    this.redis = connectionManager.getRedis();
    this.initializeLogger();
    this.startCleanup();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private initializeLogger(): void {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          ...meta
        });
      })
    );

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: { service: 'syncboard' },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),

        // File transports
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 10
        }),
        new winston.transports.File({
          filename: 'logs/security.log',
          level: 'warn',
          maxsize: 5242880, // 5MB
          maxFiles: 20
        })
      ]
    });

    // Handle uncaught exceptions
    this.logger.exceptions.handle(
      new winston.transports.File({ filename: 'logs/exceptions.log' })
    );

    // Handle unhandled promise rejections
    this.logger.rejections.handle(
      new winston.transports.File({ filename: 'logs/rejections.log' })
    );
  }

  // General logging methods
  public info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  public warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  public error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(message, { error: error?.stack, ...context });
  }

  public debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  // Security logging
  public logSecurityEvent(event: SecurityEvent): void {
    this.securityEvents.push(event);
    
    // Log to file
    this.logger.warn('Security Event', {
      type: event.type,
      severity: event.severity,
      userId: event.userId,
      ipAddress: event.ipAddress,
      details: event.details,
      metadata: event.metadata
    });

    // Store in Redis for real-time monitoring
    this.redis.lpush('security_events', JSON.stringify(event));
    this.redis.ltrim('security_events', 0, 9999); // Keep last 10k events

    // Alert for critical events
    if (event.severity === 'CRITICAL') {
      this.sendSecurityAlert(event);
    }
  }

  // Performance logging
  public logPerformance(metrics: PerformanceMetrics): void {
    this.performanceMetrics.push(metrics);
    
    // Store in Redis
    this.redis.lpush('performance_metrics', JSON.stringify(metrics));
    this.redis.ltrim('performance_metrics', 0, 9999);

    // Log slow requests
    if (metrics.responseTime > 5000) { // 5 seconds
      this.logger.warn('Slow Request', {
        endpoint: metrics.endpoint,
        method: metrics.method,
        responseTime: metrics.responseTime,
        statusCode: metrics.statusCode,
        userId: metrics.userId
      });
    }
  }

  // Request logging middleware
  public requestLogger() {
    return (req: Request, res: Response, next: Function) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();
      
      // Add request ID to request object
      (req as any).requestId = requestId;

      // Log request start
      this.info('Request Started', {
        requestId,
        method: req.method,
        url: req.url,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id
      });

      // Override res.end to log response
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any) {
        const responseTime = Date.now() - startTime;
        const memoryUsage = process.memoryUsage();
        
        // Log performance metrics
        Logger.getInstance().logPerformance({
          endpoint: req.url,
          method: req.method,
          responseTime,
          statusCode: res.statusCode,
          userId: (req as any).user?.id,
          timestamp: new Date(),
          memoryUsage: memoryUsage.heapUsed,
          cpuUsage: process.cpuUsage().user
        });

        // Log response
        Logger.getInstance().info('Request Completed', {
          requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseTime,
          ipAddress: req.ip,
          userId: (req as any).user?.id
        });

        originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  // Authentication logging
  public logAuthAttempt(email: string, success: boolean, ipAddress: string, userAgent?: string): void {
    const event: SecurityEvent = {
      type: success ? 'AUTH_FAILURE' : 'AUTH_FAILURE',
      severity: success ? 'LOW' : 'MEDIUM',
      ipAddress,
      details: `Authentication ${success ? 'successful' : 'failed'} for ${email}`,
      timestamp: new Date(),
      metadata: { email, userAgent }
    };

    this.logSecurityEvent(event);
  }

  // Permission denied logging
  public logPermissionDenied(userId: number, resource: string, action: string, ipAddress: string): void {
    const event: SecurityEvent = {
      type: 'PERMISSION_DENIED',
      severity: 'MEDIUM',
      userId,
      ipAddress,
      details: `Permission denied for ${action} on ${resource}`,
      timestamp: new Date(),
      metadata: { resource, action }
    };

    this.logSecurityEvent(event);
  }

  // Rate limit logging
  public logRateLimit(ipAddress: string, endpoint: string, limit: number): void {
    const event: SecurityEvent = {
      type: 'RATE_LIMIT',
      severity: 'LOW',
      ipAddress,
      details: `Rate limit exceeded for ${endpoint} (limit: ${limit})`,
      timestamp: new Date(),
      metadata: { endpoint, limit }
    };

    this.logSecurityEvent(event);
  }

  // Suspicious activity logging
  public logSuspiciousActivity(userId: number, activity: string, ipAddress: string, metadata?: Record<string, any>): void {
    const event: SecurityEvent = {
      type: 'SUSPICIOUS_ACTIVITY',
      severity: 'HIGH',
      userId,
      ipAddress,
      details: activity,
      timestamp: new Date(),
      metadata
    };

    this.logSecurityEvent(event);
  }

  // Data breach attempt logging
  public logDataBreachAttempt(ipAddress: string, details: string, metadata?: Record<string, any>): void {
    const event: SecurityEvent = {
      type: 'DATA_BREACH_ATTEMPT',
      severity: 'CRITICAL',
      ipAddress,
      details,
      timestamp: new Date(),
      metadata
    };

    this.logSecurityEvent(event);
  }

  // Send security alert
  private sendSecurityAlert(event: SecurityEvent): void {
    // In production, this would send alerts via email, Slack, etc.
    console.error('🚨 CRITICAL SECURITY ALERT:', event);
    
    // Store in Redis for immediate attention
    this.redis.lpush('security_alerts', JSON.stringify(event));
  }

  // Generate unique request ID
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get security events
  public async getSecurityEvents(limit: number = 100): Promise<SecurityEvent[]> {
    try {
      const events = await this.redis.lrange('security_events', 0, limit - 1);
      return events.map(event => JSON.parse(event));
    } catch (error) {
      console.error('Error getting security events:', error);
      return [];
    }
  }

  // Get performance metrics
  public async getPerformanceMetrics(limit: number = 100): Promise<PerformanceMetrics[]> {
    try {
      const metrics = await this.redis.lrange('performance_metrics', 0, limit - 1);
      return metrics.map(metric => JSON.parse(metric));
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return [];
    }
  }

  // Get system health
  public getSystemHealth(): {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    securityEvents: number;
    performanceMetrics: number;
    errorRate: number;
  } {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      uptime: process.uptime(),
      memoryUsage,
      cpuUsage,
      securityEvents: this.securityEvents.length,
      performanceMetrics: this.performanceMetrics.length,
      errorRate: this.calculateErrorRate()
    };
  }

  private calculateErrorRate(): number {
    const totalRequests = this.performanceMetrics.length;
    if (totalRequests === 0) return 0;
    
    const errorRequests = this.performanceMetrics.filter(m => m.statusCode >= 400).length;
    return (errorRequests / totalRequests) * 100;
  }

  // Cleanup old data
  private startCleanup(): void {
    setInterval(() => {
      // Keep only last 1000 events in memory
      if (this.securityEvents.length > 1000) {
        this.securityEvents = this.securityEvents.slice(-1000);
      }
      
      if (this.performanceMetrics.length > 1000) {
        this.performanceMetrics = this.performanceMetrics.slice(-1000);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  // Close logger
  public async close(): Promise<void> {
    await this.logger.close();
  }
}

export const logger = Logger.getInstance();