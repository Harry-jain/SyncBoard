import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import { initializeNetworkingService } from "./networking/networking-service";

const app = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);

// Enable CORS with credentials support
app.use(cors({
  origin: true, // Allow all origins
  credentials: true // Allow credentials
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Initialize networking service
    console.log('Initializing SyncBoard Networking Service...');
    const networkingService = await initializeNetworkingService();
    console.log('Networking service initialized successfully');

    const server = await registerRoutes(app);

    // Add health check endpoint
    app.get('/api/health', async (req, res) => {
      try {
        const health = await networkingService.getHealthStatus();
        res.json(health);
      } catch (error) {
        res.status(500).json({ 
          status: 'unhealthy', 
          error: 'Health check failed',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Add system metrics endpoint
    app.get('/api/metrics', async (req, res) => {
      try {
        const metrics = networkingService.getSystemMetrics();
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ error: message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    server.listen(PORT, 'localhost', () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`WebSocket server running on port ${process.env.WEBSOCKET_PORT || 8080}`);
      console.log(`Node ID: ${process.env.NODE_ID || 'default'}`);
      console.log(`Region: ${process.env.REGION || 'us-east-1'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
