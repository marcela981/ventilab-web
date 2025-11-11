/**
 * VentyLab Backend Server
 * Main entry point for the Express API server
 */

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { config, isProduction } from './config/config';
import { helmetConfig, corsConfig, apiLimits } from './config/security';
import { apiLimiter } from './middleware/rateLimiter';
import { withRequestId, progressLogger } from './middleware/progressLogger';
import { initializeCache } from './services/ai/AICacheService';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { handleTutorWebSocket } from './services/ai/WebSocketTutorService';

/**
 * Initialize Express application
 */
const app: Application = express();

/**
 * Disable ETag globally
 * ETag causes 304 Not Modified responses which can break JSON endpoints
 * that have user-specific state (like progress/overview)
 */
app.disable('etag');

/**
 * Security Middleware
 * Helmet helps secure Express apps by setting various HTTP headers
 * Uses configuration from security.ts
 */
app.use(helmet(helmetConfig));

/**
 * CORS Configuration
 * Allow requests from the frontend application
 * Uses configuration from security.ts
 */
app.use(cors(corsConfig));

/**
 * Compression Middleware (Production only)
 * Compress HTTP responses to reduce bandwidth
 */
if (isProduction()) {
  app.use(compression());
}

/**
 * Body Parser Middleware
 * Parse incoming JSON requests
 * Limits request body size to prevent DOS attacks
 */
app.use(express.json({ limit: apiLimits.maxRequestBodySize }));
app.use(express.urlencoded({ extended: true, limit: apiLimits.maxRequestBodySize }));

/**
 * Request Timeout
 * Set timeout for all requests to prevent hanging connections
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  req.setTimeout(apiLimits.requestTimeout);
  res.setTimeout(apiLimits.requestTimeout);
  next();
});

/**
 * Request ID Middleware
 * Generate or use existing request ID for request tracing
 */
app.use(withRequestId);

/**
 * Progress Logger Middleware
 * Log progress-related requests when DEBUG_PROGRESS is enabled
 */
app.use(progressLogger);

/**
 * Cache Control Middleware for API Routes
 * Prevent 304 Not Modified responses for JSON endpoints with user-specific state
 * This ensures fresh data is always returned
 */
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  // Remove ETag header if it exists
  res.removeHeader('ETag');
  next();
});

/**
 * Rate Limiting
 * Prevent abuse by limiting the number of requests per IP
 * Uses apiLimiter from rateLimiter.ts
 */
app.use('/api', apiLimiter);

/**
 * Health Check Endpoint
 * Used to verify the server is running correctly
 */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'VentyLab API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

/**
 * API Routes
 * Import and register all API routes here
 */
import routes from './routes';
app.use('/api', routes);

/**
 * API Health Check Endpoint
 * Simple health check endpoint at /api/health for frontend verification
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    success: true,
    message: 'VentyLab API is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * 404 Handler
 * Handle requests to undefined routes
 * Uses notFoundHandler from errorHandler middleware
 */
app.use(notFoundHandler);

/**
 * Global Error Handler
 * Catch and handle all errors in the application
 */
app.use(errorHandler);

/**
 * Start Server
 * Listen on the configured port and initialize WebSocket server
 */
const startServer = async () => {
  try {
    // Initialize cache service
    await initializeCache();

    // Create HTTP server
    const server = createServer(app);

    // Create WebSocket server
    const wss = new WebSocketServer({
      server,
      path: '/ws/ai/tutor',
    });

    // Handle WebSocket connections
    wss.on('connection', (ws, req) => {
      // Validate origin (CORS for WebSocket)
      const origin = req.headers.origin;
      const allowedOrigins = [config.frontendUrl, 'http://localhost:3000'];
      
      if (origin && !allowedOrigins.includes(origin)) {
        console.warn(`⚠️ WebSocket connection rejected from origin: ${origin}`);
        ws.close(1008, 'Origin not allowed');
        return;
      }

      handleTutorWebSocket(ws, req);
    });

    // Start server
    server.listen(config.port, () => {
      console.log('='.repeat(50));
      console.log('🚀 VentyLab Backend Server Started');
      console.log('='.repeat(50));
      console.log(`📍 Environment: ${config.nodeEnv}`);
      console.log(`🔗 Server URL: http://localhost:${config.port}`);
      console.log(`🏥 Health Check: http://localhost:${config.port}/health`);
      console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
      console.log(`🔌 WebSocket: ws://localhost:${config.port}/ws/ai/tutor`);
      console.log('='.repeat(50));
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error) => {
  console.error('🔥 Unhandled Rejection:', reason);
  // In production, you might want to log this to a monitoring service
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('🔥 Uncaught Exception:', error);
  // Exit the process after logging
  process.exit(1);
});

export default app;
