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
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { config } from './config/config';
import { helmetConfig, corsConfig, apiLimits } from './config/security';
import { apiLimiter } from './middleware/rateLimiter';

/**
 * Initialize Express application
 */
const app: Application = express();

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
 * Listen on the configured port
 */
const startServer = () => {
  try {
    app.listen(config.port, () => {
      console.log('='.repeat(50));
      console.log('🚀 VentyLab Backend Server Started');
      console.log('='.repeat(50));
      console.log(`📍 Environment: ${config.nodeEnv}`);
      console.log(`🔗 Server URL: http://localhost:${config.port}`);
      console.log(`🏥 Health Check: http://localhost:${config.port}/health`);
      console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
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
