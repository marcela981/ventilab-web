/**
 * Rate Limiting Middleware
 * Implements different rate limiting strategies for various route types
 * Protects the API from abuse and ensures fair usage
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';

/**
 * Strict Rate Limiter - For Authentication Routes
 * Very strict limits to prevent brute force attacks
 *
 * Limits:
 * - 5 requests per hour per IP
 * - Protects login, register, and password reset endpoints
 *
 * Usage: app.use('/api/auth', strictLimiter);
 */
export const strictLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts from this IP address',
      details: [
        'You have exceeded the maximum number of authentication attempts',
        'Please wait 1 hour before trying again',
        'If you believe this is an error, please contact support'
      ],
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests
  skipFailedRequests: false, // Count failed requests
});

/**
 * Auth Rate Limiter - For Login Attempts
 * Moderately strict to prevent credential stuffing
 *
 * Limits:
 * - 10 requests per 15 minutes per IP
 * - Specifically for login endpoints
 *
 * Usage: router.post('/login', authLimiter, loginController);
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many login attempts',
      details: [
        'You have exceeded the maximum number of login attempts',
        'Please wait 15 minutes before trying again',
        'Consider resetting your password if you have forgotten it'
      ],
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Write Rate Limiter - For Data Modification Routes
 * Moderate limits for POST, PUT, PATCH, DELETE operations
 *
 * Limits:
 * - 50 requests per hour per IP
 * - Protects create, update, and delete endpoints
 *
 * Usage: router.post('/modules', authenticate, writeLimiter, createModule);
 */
export const writeLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 requests per hour
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many write operations from this IP address',
      details: [
        'You have exceeded the maximum number of write operations',
        'Please wait before making more changes',
        'Current limit: 50 operations per hour'
      ],
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Only count write operations
  skip: (req) => {
    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    return !writeMethods.includes(req.method);
  },
});

/**
 * Read Rate Limiter - For Data Retrieval Routes
 * Permissive limits for GET operations
 *
 * Limits:
 * - 200 requests per hour per IP
 * - Protects read/query endpoints
 *
 * Usage: router.get('/modules', readLimiter, getModules);
 */
export const readLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // 200 requests per hour
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP address',
      details: [
        'You have exceeded the maximum number of requests',
        'Please wait before making more requests',
        'Current limit: 200 requests per hour'
      ],
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * API Rate Limiter - General Purpose
 * Balanced limits for general API usage
 *
 * Limits:
 * - 100 requests per 15 minutes per IP
 * - General protection for all API routes
 *
 * Usage: app.use('/api', apiLimiter);
 */
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP address',
      details: [
        'You have exceeded the maximum number of API requests',
        'Please wait 15 minutes before making more requests',
        'Current limit: 100 requests per 15 minutes'
      ],
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * File Upload Rate Limiter
 * Strict limits for file upload endpoints
 *
 * Limits:
 * - 10 uploads per hour per IP
 * - Prevents excessive file uploads
 *
 * Usage: router.post('/upload', authenticate, uploadLimiter, uploadFile);
 */
export const uploadLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many file uploads from this IP address',
      details: [
        'You have exceeded the maximum number of file uploads',
        'Please wait 1 hour before uploading more files',
        'Current limit: 10 uploads per hour'
      ],
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Password Reset Rate Limiter
 * Very strict limits for password reset requests
 *
 * Limits:
 * - 3 requests per hour per IP
 * - Prevents abuse of password reset functionality
 *
 * Usage: router.post('/forgot-password', passwordResetLimiter, forgotPassword);
 */
export const passwordResetLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset requests',
      details: [
        'You have exceeded the maximum number of password reset attempts',
        'Please wait 1 hour before requesting another password reset',
        'Check your email for previous reset instructions'
      ],
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Search Rate Limiter
 * Moderate limits for search operations
 *
 * Limits:
 * - 30 searches per 15 minutes per IP
 * - Prevents search abuse while allowing reasonable usage
 *
 * Usage: router.get('/search', searchLimiter, search);
 */
export const searchLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 searches per 15 minutes
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many search requests',
      details: [
        'You have exceeded the maximum number of search requests',
        'Please wait 15 minutes before searching again',
        'Current limit: 30 searches per 15 minutes'
      ],
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Create Custom Rate Limiter
 * Factory function to create custom rate limiters with specific config
 *
 * @param windowMs - Time window in milliseconds
 * @param max - Maximum number of requests in the time window
 * @param message - Custom error message
 * @returns Configured rate limiter middleware
 *
 * Usage:
 * const customLimiter = createRateLimiter(60000, 10, 'Custom limit exceeded');
 */
export const createRateLimiter = (
  windowMs: number,
  max: number,
  message: string = 'Rate limit exceeded'
): RateLimitRequestHandler => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        details: [
          `You have exceeded the maximum number of requests`,
          `Limit: ${max} requests per ${windowMs / 1000} seconds`
        ],
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};
