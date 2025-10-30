/**
 * Security Configuration
 * Centralized security settings for the application
 * Includes configurations for Helmet, CORS, bcrypt, and JWT
 */

import { CorsOptions } from 'cors';
import { HelmetOptions } from 'helmet';
import { config } from './config';

/**
 * Helmet Security Configuration
 * Helmet helps secure Express apps by setting various HTTP headers
 *
 * Security headers configured:
 * - Content Security Policy (CSP)
 * - X-Frame-Options (clickjacking protection)
 * - X-Content-Type-Options (MIME-sniffing protection)
 * - Strict-Transport-Security (HTTPS enforcement)
 * - X-XSS-Protection (XSS attack protection)
 */
export const helmetConfig: Readonly<HelmetOptions> = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for development
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // Cross-Origin-Embedder-Policy
  crossOriginEmbedderPolicy: false, // Disabled for compatibility

  // Cross-Origin-Opener-Policy
  crossOriginOpenerPolicy: { policy: 'same-origin' },

  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy: { policy: 'same-origin' },

  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },

  // Frameguard (X-Frame-Options)
  frameguard: { action: 'deny' }, // Prevent clickjacking

  // Hide Powered By
  hidePoweredBy: true, // Remove X-Powered-By header

  // HSTS (Strict-Transport-Security)
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },

  // IE No Open
  ieNoOpen: true,

  // No Sniff (X-Content-Type-Options)
  noSniff: true, // Prevent MIME-sniffing

  // Origin Agent Cluster
  originAgentCluster: true,

  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },

  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // XSS Filter
  xssFilter: true,
};

/**
 * CORS Configuration
 * Cross-Origin Resource Sharing settings
 *
 * Configures which origins can access the API and what methods/headers are allowed
 */
export const corsConfig: Readonly<CorsOptions> = {
  // Allow requests from the frontend URL
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return callback(null, true);
    }

    // List of allowed origins
    const allowedOrigins = [
      config.frontendUrl,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
    ];

    // In production, only allow configured frontend URL
    if (config.nodeEnv === 'production') {
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // In development, allow configured origins
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },

  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],

  // Exposed headers (headers that client can access)
  exposedHeaders: [
    'X-Total-Count',
    'X-Page',
    'X-Per-Page',
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
  ],

  // Allow credentials (cookies, authorization headers)
  credentials: true,

  // Pre-flight cache duration (in seconds)
  maxAge: 86400, // 24 hours

  // Allow pre-flight to succeed
  optionsSuccessStatus: 204,
};

/**
 * Bcrypt Configuration
 * Password hashing settings
 */
export const bcryptConfig = {
  /**
   * Number of salt rounds for bcrypt
   * Higher values are more secure but slower
   *
   * Recommended values:
   * - 10: Fast, suitable for most applications
   * - 12: More secure, slightly slower
   * - 14+: Very secure, noticeably slower
   */
  saltRounds: 10,
} as const;

/**
 * JWT Configuration
 * JSON Web Token settings
 */
export const jwtConfig = {
  /**
   * JWT token expiration time
   * Format: String with time unit (e.g., '7d', '24h', '30m')
   */
  expiresIn: '7d', // 7 days

  /**
   * Refresh token expiration time
   * Used if implementing refresh token functionality
   */
  refreshExpiresIn: '30d', // 30 days

  /**
   * JWT algorithm
   * HS256 is recommended for symmetric key signing
   */
  algorithm: 'HS256' as const,

  /**
   * Token issuer
   * Identifies who issued the token
   */
  issuer: 'VentyLab',

  /**
   * Token audience
   * Identifies who the token is intended for
   */
  audience: 'VentyLab-Users',
} as const;

/**
 * Password Policy Configuration
 * Rules for password validation
 */
export const passwordPolicy = {
  /**
   * Minimum password length
   */
  minLength: 8,

  /**
   * Maximum password length
   */
  maxLength: 128,

  /**
   * Require uppercase letter
   */
  requireUppercase: true,

  /**
   * Require lowercase letter
   */
  requireLowercase: true,

  /**
   * Require number
   */
  requireNumber: true,

  /**
   * Require special character
   */
  requireSpecialChar: false,

  /**
   * Password regex pattern
   * Matches: at least 8 characters, 1 uppercase, 1 lowercase, 1 number
   */
  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,

  /**
   * Password strength message
   */
  strengthMessage:
    'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
} as const;

/**
 * Session Configuration
 * Settings for session management
 */
export const sessionConfig = {
  /**
   * Session timeout (in milliseconds)
   * User will be logged out after this period of inactivity
   */
  timeout: 7 * 24 * 60 * 60 * 1000, // 7 days

  /**
   * Maximum concurrent sessions per user
   * Set to 0 for unlimited
   */
  maxConcurrentSessions: 3,

  /**
   * Session renewal threshold
   * Renew session if less than this time remains
   */
  renewalThreshold: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * File Upload Security Configuration
 * Settings for secure file uploads
 */
export const fileUploadConfig = {
  /**
   * Maximum file size (in bytes)
   * 10 MB = 10 * 1024 * 1024
   */
  maxFileSize: 10 * 1024 * 1024, // 10 MB

  /**
   * Allowed MIME types
   */
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],

  /**
   * Allowed file extensions
   */
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'],

  /**
   * Maximum number of files per upload
   */
  maxFiles: 5,
} as const;

/**
 * API Security Limits
 * Various limits to prevent abuse
 */
export const apiLimits = {
  /**
   * Maximum request body size
   */
  maxRequestBodySize: '10mb',

  /**
   * Maximum URL length
   */
  maxUrlLength: 2048,

  /**
   * Maximum query string length
   */
  maxQueryStringLength: 1024,

  /**
   * Maximum number of query parameters
   */
  maxQueryParams: 50,

  /**
   * Timeout for API requests (in milliseconds)
   */
  requestTimeout: 30000, // 30 seconds
} as const;

/**
 * Content Sanitization Configuration
 * Settings for sanitizing user input
 */
export const sanitizationConfig = {
  /**
   * Allowed HTML tags (if allowing HTML input)
   * Empty array means no HTML is allowed
   */
  allowedTags: [] as string[],

  /**
   * Allowed HTML attributes (if allowing HTML input)
   */
  allowedAttributes: {} as Record<string, string[]>,

  /**
   * Strip all HTML tags
   */
  stripTags: true,

  /**
   * Trim whitespace
   */
  trim: true,

  /**
   * Convert to lowercase for case-insensitive fields
   */
  lowercase: false,
} as const;

/**
 * Medical Application Specific Security
 * Additional security measures for medical education applications
 */
export const medicalAppSecurity = {
  /**
   * Audit log retention period (in days)
   * How long to keep audit logs for compliance
   */
  auditLogRetention: 730, // 2 years

  /**
   * Require reason for data modifications
   * For regulatory compliance
   */
  requireModificationReason: false,

  /**
   * Enable data encryption at rest
   */
  enableEncryptionAtRest: false,

  /**
   * Enable data encryption in transit (HTTPS)
   */
  enableEncryptionInTransit: true,

  /**
   * Enable two-factor authentication
   */
  enable2FA: false,

  /**
   * Minimum password age (in days)
   * Users cannot change password before this period
   */
  minPasswordAge: 0,

  /**
   * Maximum password age (in days)
   * Users must change password after this period
   */
  maxPasswordAge: 0, // 0 = no expiration

  /**
   * Password history count
   * Number of previous passwords to remember
   */
  passwordHistoryCount: 0, // 0 = no history
} as const;
