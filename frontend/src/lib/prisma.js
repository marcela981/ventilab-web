/**
 * =============================================================================
 * Prisma Client Singleton Instance for NextAuth.js
 * =============================================================================
 * This file creates and exports a single Prisma Client instance to be used
 * across the Next.js application. Using a singleton pattern prevents multiple
 * instances in development due to hot-reloading.
 *
 * IMPORTANT: This client connects to the database defined in DATABASE_URL
 * environment variable. Make sure it's properly configured in .env.local
 * =============================================================================
 */

import { PrismaClient } from '@prisma/client';

/**
 * Global variable to store the Prisma Client instance across hot-reloads
 * in development mode. This prevents multiple instances being created.
 */
const globalForPrisma = global;

/**
 * Prisma Client Singleton
 *
 * In development: Uses global.prisma to persist across hot-reloads
 * In production: Creates a new instance (no hot-reloading)
 *
 * Configuration options:
 * - log: Enables query logging in development for debugging
 * - errorFormat: Provides colorized, pretty error messages
 */
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // Log queries, errors, and warnings in development
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],

    // Enhanced error messages for debugging
    errorFormat: 'colorless',
  });

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
