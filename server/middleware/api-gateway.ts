import { Request, Response, NextFunction } from 'express';
import { authManager } from '../security/auth-manager';
import { permissionManager } from '../security/permission-manager';
import { rateLimiter } from '../security/rate-limiter';
import { logger } from '../monitoring/logger';
import { encryptionManager } from '../security/encryption';

export interface APIGatewayConfig {
  enableCORS: boolean;
  enableCompression: boolean;
  enableSecurityHeaders: boolean;
  enableRequestLogging: boolean;
  enableResponseTime: boolean;
  maxRequestSize: string;
  timeout: number;
}

export class APIGateway {
  private static instance: APIGateway;
  private config: APIGatewayConfig;

  private constructor() {
    this.config = {
      enableCORS: process.env.ENABLE_CORS !== 'false',
      enableCompression: process.env.ENABLE_COMPRESSION !== 'false',
      enableSecurityHeaders: process.env.ENABLE_SECURITY_HEADERS !== 'false',
      enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false',
      enableResponseTime: process.env.ENABLE_RESPONSE_TIME !== 'false',
      maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
      timeout: parseInt(process.env.REQUEST_TIMEOUT || '30000')
    };
  }

  public static getInstance(): APIGateway {
    if (!APIGateway.instance) {
      APIGateway.instance = new APIGateway();
    }
    return APIGateway.instance;
  }

  // Security headers middleware
  public securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableSecurityHeaders) {
        return next();
      }

      // Prevent clickjacking
      res.setHeader('X-Frame-Options', 'DENY');
      
      // Prevent MIME type sniffing
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Enable XSS protection
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      // Strict Transport Security (HTTPS only)
      if (req.secure || req.get('X-Forwarded-Proto') === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      }
      
      // Content Security Policy
      res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' ws: wss:; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'"
      );
      
      // Referrer Policy
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Permissions Policy
      res.setHeader('Permissions-Policy', 
        'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
      );

      next();
    };
  }

  // CORS middleware
  public cors() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableCORS) {
        return next();
      }

      const origin = req.get('Origin');
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
      
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-API-Key');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
      
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }
      
      next();
    };
  }

  // Request size limiting
  public requestSizeLimit() {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = parseInt(req.get('Content-Length') || '0');
      const maxSize = this.parseSize(this.config.maxRequestSize);
      
      if (contentLength > maxSize) {
        return res.status(413).json({
          error: 'Request entity too large',
          maxSize: this.config.maxRequestSize
        });
      }
      
      next();
    };
  }

  // Request timeout
  public requestTimeout() {
    return (req: Request, res: Response, next: NextFunction) => {
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          res.status(408).json({
            error: 'Request timeout',
            timeout: this.config.timeout
          });
        }
      }, this.config.timeout);
      
      res.on('finish', () => clearTimeout(timeout));
      res.on('close', () => clearTimeout(timeout));
      
      next();
    };
  }

  // Request validation
  public validateRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Validate request method
      const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
      if (!allowedMethods.includes(req.method)) {
        return res.status(405).json({
          error: 'Method not allowed',
          allowedMethods
        });
      }

      // Validate content type for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
          return res.status(400).json({
            error: 'Content-Type must be application/json'
          });
        }
      }

      // Validate API version
      const apiVersion = req.get('X-API-Version');
      if (apiVersion && !['v1', 'v2'].includes(apiVersion)) {
        return res.status(400).json({
          error: 'Unsupported API version',
          supportedVersions: ['v1', 'v2']
        });
      }

      next();
    };
  }

  // Authentication middleware
  public authenticate() {
    return authManager.requireAuth();
  }

  // Authorization middleware
  public authorize(resource: string, action: string) {
    return permissionManager.requirePermission(resource, action);
  }

  // Rate limiting middleware
  public rateLimit() {
    return rateLimiter.rateLimit();
  }

  // Request logging middleware
  public requestLogger() {
    return logger.requestLogger();
  }

  // Data encryption middleware
  public encryptSensitiveData() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Encrypt sensitive fields in request body
        if (req.body && typeof req.body === 'object') {
          req.body = await this.encryptRequestBody(req.body);
        }
        
        next();
      } catch (error) {
        logger.error('Data encryption error', error);
        res.status(500).json({ error: 'Data encryption failed' });
      }
    };
  }

  // Data decryption middleware
  public decryptSensitiveData() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Decrypt sensitive fields in request body
        if (req.body && typeof req.body === 'object') {
          req.body = await this.decryptRequestBody(req.body);
        }
        
        next();
      } catch (error) {
        logger.error('Data decryption error', error);
        res.status(500).json({ error: 'Data decryption failed' });
      }
    };
  }

  // Response encryption middleware
  public encryptResponse() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      
      res.send = function(data: any) {
        try {
          // Only encrypt if response contains sensitive data
          if (this.shouldEncryptResponse(data)) {
            const encrypted = encryptionManager.encrypt(JSON.stringify(data));
            return originalSend.call(this, JSON.stringify(encrypted));
          }
          
          return originalSend.call(this, data);
        } catch (error) {
          logger.error('Response encryption error', error);
          return originalSend.call(this, data);
        }
      }.bind(res);
      
      next();
    };
  }

  // Error handling middleware
  public errorHandler() {
    return (error: any, req: Request, res: Response, next: NextFunction) => {
      logger.error('API Error', error, {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id
      });

      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation failed',
          details: isDevelopment ? error.message : 'Invalid request data'
        });
      }
      
      if (error.name === 'UnauthorizedError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }
      
      if (error.name === 'ForbiddenError') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions'
        });
      }
      
      if (error.name === 'NotFoundError') {
        return res.status(404).json({
          error: 'Not found',
          message: 'Resource not found'
        });
      }
      
      // Generic error response
      res.status(500).json({
        error: 'Internal server error',
        message: isDevelopment ? error.message : 'Something went wrong',
        requestId: (req as any).requestId
      });
    };
  }

  // Health check middleware
  public healthCheck() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.path === '/health') {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        };
        
        return res.json(health);
      }
      
      next();
    };
  }

  // Maintenance mode middleware
  public maintenanceMode() {
    return (req: Request, res: Response, next: NextFunction) => {
      const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
      
      if (isMaintenanceMode && req.path !== '/health') {
        return res.status(503).json({
          error: 'Service temporarily unavailable',
          message: 'System is under maintenance',
          estimatedRestoreTime: process.env.MAINTENANCE_ESTIMATED_RESTORE_TIME
        });
      }
      
      next();
    };
  }

  // Private helper methods
  private parseSize(size: string): number {
    const units: { [key: string]: number } = {
      'b': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    };
    
    const match = size.match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/i);
    if (!match) return 10 * 1024 * 1024; // Default 10MB
    
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    return Math.floor(value * units[unit]);
  }

  private async encryptRequestBody(body: any): Promise<any> {
    const sensitiveFields = ['password', 'email', 'phone', 'ssn', 'creditCard'];
    const encrypted = { ...body };
    
    for (const field of sensitiveFields) {
      if (encrypted[field]) {
        encrypted[field] = await encryptionManager.encryptDatabaseField(encrypted[field]);
      }
    }
    
    return encrypted;
  }

  private async decryptRequestBody(body: any): Promise<any> {
    const sensitiveFields = ['password', 'email', 'phone', 'ssn', 'creditCard'];
    const decrypted = { ...body };
    
    for (const field of sensitiveFields) {
      if (decrypted[field]) {
        decrypted[field] = await encryptionManager.decryptDatabaseField(decrypted[field]);
      }
    }
    
    return decrypted;
  }

  private shouldEncryptResponse(data: any): boolean {
    // Check if response contains sensitive data
    const sensitiveFields = ['password', 'email', 'phone', 'ssn', 'creditCard', 'token'];
    const dataString = JSON.stringify(data).toLowerCase();
    
    return sensitiveFields.some(field => dataString.includes(field));
  }
}

export const apiGateway = APIGateway.getInstance();