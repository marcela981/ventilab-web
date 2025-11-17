/**
 * =============================================================================
 * Prisma Client Singleton Instance
 * =============================================================================
 * This file creates and exports a single Prisma Client instance to be used
 * across the application. Using a singleton pattern prevents multiple
 * instances in development due to hot-reloading.
 *
 * IMPORTANT: This client connects to the database defined in DATABASE_URL
 * environment variable. Make sure it's properly configured in .env
 *
 * Logging is controlled by the LOG_DB environment variable:
 * - Set LOG_DB=true to enable detailed query logging
 * - Set LOG_DB=false or omit to disable logging (default)
 * =============================================================================
 */

import { PrismaClient } from '@prisma/client';

/**
 * Global variable to store the Prisma Client instance across hot-reloads
 * in development mode. This prevents multiple instances being created.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Flag para activar/desactivar logging de DB
 * Se lee desde variable de entorno LOG_DB (default: false)
 */
const LOG_DB_ENABLED = process.env.LOG_DB === 'true';

/**
 * Prisma Client Singleton
 *
 * In development: Uses global.prisma to persist across hot-reloads
 * In production: Creates a new instance (no hot-reloading)
 *
 * Configuration options:
 * - log: Enables query logging based on LOG_DB environment variable
 * - errorFormat: Provides colorized, pretty error messages
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Log queries, errors, and warnings if LOG_DB is enabled
    log: LOG_DB_ENABLED
      ? ['query', 'info', 'warn', 'error']
      : process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],

    // Enhanced error messages for debugging
    errorFormat: 'pretty',
  });

// Setup query logging with timing if LOG_DB is enabled
if (LOG_DB_ENABLED && typeof window === 'undefined') {
  // Only setup on server-side
  prisma.$on('query', (e) => {
    console.log('[DB Query]', {
      timestamp: new Date().toISOString(),
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
      target: e.target,
    });
  });

  prisma.$on('error', (e) => {
    console.error('[DB Error]', {
      timestamp: new Date().toISOString(),
      level: e.level,
      message: e.message,
      target: e.target,
    });
  });
}

// Store the Prisma instance globally in development to prevent multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Gracefully disconnect Prisma Client on application shutdown
 * This ensures all connections are properly closed
 */
if (typeof window === 'undefined') {
  // Only run on server-side
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

export default prisma;

