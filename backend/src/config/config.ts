/**
 * Application Configuration
 * Centralized configuration management for environment variables
 */

export interface Config {
  // Server Configuration
  port: number;
  nodeEnv: string;

  // Database Configuration
  databaseUrl: string;

  // JWT Configuration
  jwtSecret: string;
  jwtExpiresIn: string;

  // Frontend Configuration
  frontendUrl: string;

  // Rate Limiting Configuration
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;

  // AI Configuration
  aiProvider: string;
  aiModelOpenAI: string;
  aiModelAnthropic: string;
  aiModelGoogle: string;
  redisUrl?: string;
}

/**
 * Validate required environment variables
 * Throws an error if any required variable is missing
 */
const validateEnv = (): void => {
  const required = ['DATABASE_URL', 'JWT_SECRET'];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
};

/**
 * Load and validate configuration from environment variables
 */
const loadConfig = (): Config => {
  // Validate environment variables
  validateEnv();

  return {
    // Server Configuration
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Database Configuration
    databaseUrl: process.env.DATABASE_URL as string,

    // JWT Configuration
    jwtSecret: process.env.JWT_SECRET as string,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

    // Frontend Configuration
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

    // Rate Limiting Configuration
    rateLimitWindowMs: parseInt(
      process.env.RATE_LIMIT_WINDOW_MS || '900000',
      10
    ), // Default: 15 minutes
    rateLimitMaxRequests: parseInt(
      process.env.RATE_LIMIT_MAX_REQUESTS || '100',
      10
    ), // Default: 100 requests

    // AI Configuration
    aiProvider: process.env.AI_PROVIDER || 'google',
    aiModelOpenAI: process.env.AI_MODEL_OPENAI || 'gpt-4o-mini',
    aiModelAnthropic: process.env.AI_MODEL_ANTHROPIC || 'claude-3-5-haiku-20241022',
    aiModelGoogle: process.env.AI_MODEL_GOOGLE || 'gemini-2.0-flash',
    redisUrl: process.env.REDIS_URL,
  };
};

/**
 * Export the configuration object
 */
export const config = loadConfig();

/**
 * Helper function to check if running in production
 */
export const isProduction = (): boolean => {
  return config.nodeEnv === 'production';
};

/**
 * Helper function to check if running in development
 */
export const isDevelopment = (): boolean => {
  return config.nodeEnv === 'development';
};
