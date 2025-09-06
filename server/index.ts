import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { registerRoutes } from './routes';
import { loadBalancer } from './scaling/load-balancer';
import { apiGateway } from './middleware/api-gateway';
import { logger } from './monitoring/logger';
import { connectionManager } from './database/connection-manager';
import { authManager } from './security/auth-manager';
import { rateLimiter } from './security/rate-limiter';
import { encryptionManager } from './security/encryption';

class SyncBoardServer {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer | null = null;
  private isShuttingDown: boolean = false;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupGracefulShutdown();
  }

  private setupMiddleware(): void {
    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', true);

    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"],
          fontSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key', 'X-API-Version']
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ 
      limit: process.env.MAX_REQUEST_SIZE || '10mb',
      verify: (req, res, buf) => {
        // Store raw body for webhook verification
        (req as any).rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // API Gateway middleware
    this.app.use(apiGateway.securityHeaders());
    this.app.use(apiGateway.cors());
    this.app.use(apiGateway.requestSizeLimit());
    this.app.use(apiGateway.requestTimeout());
    this.app.use(apiGateway.validateRequest());
    this.app.use(apiGateway.rateLimit());
    this.app.use(apiGateway.requestLogger());
    this.app.use(apiGateway.healthCheck());
    this.app.use(apiGateway.maintenanceMode());

    // Initialize authentication
    this.app.use(authManager.requireAuth());

    // Data encryption/decryption
    this.app.use(apiGateway.encryptSensitiveData());
    this.app.use(apiGateway.decryptSensitiveData());
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: connectionManager.getStats(),
        encryption: encryptionManager.getStats()
      };
      res.json(health);
    });

    // API routes
    this.app.use('/api', registerRoutes(this.app));

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });

    // Error handler
    this.app.use(apiGateway.errorHandler());
  }

  private setupWebSocket(): void {
    this.server = createServer(this.app);
    
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/ws',
      perMessageDeflate: {
        zlibDeflateOptions: {
          level: 3,
          memLevel: 7,
          threshold: 1024,
          concurrency: 10,
        },
        zlibInflateOptions: {
          level: 3,
          memLevel: 7,
          threshold: 1024,
          concurrency: 10,
        },
        threshold: 1024,
        concurrency: 10,
      }
    });

    this.wss.on('connection', (ws, req) => {
      logger.info('WebSocket connection established', {
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      });

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          logger.debug('WebSocket message received', { data });
          
          // Handle WebSocket messages here
          this.handleWebSocketMessage(ws, data);
        } catch (error) {
          logger.error('WebSocket message error', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket connection closed');
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', error);
      });
    });
  }

  private handleWebSocketMessage(ws: any, data: any): void {
    // Implement WebSocket message handling
    switch (data.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
      case 'subscribe':
        // Handle subscription to channels
        break;
      case 'unsubscribe':
        // Handle unsubscription from channels
        break;
      default:
        ws.send(JSON.stringify({ error: 'Unknown message type' }));
    }
  }

  private setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        logger.info(`Received ${signal}, starting graceful shutdown`);
        this.gracefulShutdown();
      });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      this.gracefulShutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', reason);
      this.gracefulShutdown();
    });
  }

  private async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('Starting graceful shutdown...');

    try {
      // Stop accepting new connections
      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP server closed');
        });
      }

      // Close WebSocket connections
      if (this.wss) {
        this.wss.close(() => {
          logger.info('WebSocket server closed');
        });
      }

      // Close database connections
      await connectionManager.close();

      // Close rate limiter
      await rateLimiter.close();

      // Close logger
      await logger.close();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    try {
      // Initialize database connection
      await connectionManager.getConnection();
      logger.info('Database connection established');

      // Initialize Redis connection
      await connectionManager.getRedis().ping();
      logger.info('Redis connection established');

      // Start load balancer
      await loadBalancer.start(this.app);

      const port = process.env.PORT || 5000;
      this.server.listen(port, () => {
        logger.info(`SyncBoard server started on port ${port}`, {
          environment: process.env.NODE_ENV || 'development',
          workers: process.env.WORKERS || os.cpus().length,
          memory: process.memoryUsage(),
          uptime: process.uptime()
        });
      });

    } catch (error) {
      logger.error('Failed to start server', error);
      process.exit(1);
    }
  }
}

// Start server
const server = new SyncBoardServer();
server.start().catch((error) => {
  console.error('Failed to start SyncBoard server:', error);
  process.exit(1);
});

export default SyncBoardServer;