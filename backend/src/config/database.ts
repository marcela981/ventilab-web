/**
 * Database Configuration
 * Prisma Client initialization and database connection management
 */

import { PrismaClient } from '@prisma/client';
import { config } from './config';

/**
 * Extend the global namespace to include the Prisma Client
 * This prevents multiple instances in development with hot-reload
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Initialize Prisma Client
 * In development, use a global variable to prevent multiple instances
 * In production, create a new instance
 */
const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      config.nodeEnv === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });

if (config.nodeEnv !== 'production') {
  global.prisma = prisma;
}

/**
 * Connect to the database
 * This function can be called to ensure database connectivity
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

/**
 * Disconnect from the database
 * Should be called when shutting down the application
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log('👋 Database disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
  }
};

// Export the Prisma Client instance
export default prisma;
