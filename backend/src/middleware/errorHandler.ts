/**
 * Error Handler Middleware
 * Global error handler for the Express application
 * Handles Prisma errors, validation errors, JWT errors, and custom application errors
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { config } from '../config/config';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants';

/**
 * Custom Application Error Class
 * Extends the native Error class with additional properties for better error handling
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;
  public details?: string[];

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: string = ERROR_CODES.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    details?: string[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error Response Interface
 * Defines the structure of error responses sent to clients
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string[];
    stack?: string;
  };
}

/**
 * Handle Prisma Client Known Request Errors
 * Converts Prisma-specific errors into user-friendly error responses
 *
 * Common Prisma error codes:
 * - P2002: Unique constraint violation
 * - P2025: Record not found
 * - P2003: Foreign key constraint violation
 * - P2001: Record does not exist
 */
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): {
  statusCode: number;
  code: string;
  message: string;
  details?: string[];
} => {
  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = error.meta?.target as string[] | undefined;
      const field = target ? target[0] : 'field';
      return {
        statusCode: HTTP_STATUS.CONFLICT,
        code: 'DUPLICATE_ENTRY',
        message: `A record with this ${field} already exists`,
        details: [`The ${field} must be unique`],
      };
    }

    case 'P2025': {
      // Record not found
      return {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: ERROR_CODES.NOT_FOUND,
        message: 'The requested resource was not found',
        details: ['The record does not exist or has been deleted'],
      };
    }

    case 'P2003': {
      // Foreign key constraint violation
      const field = error.meta?.field_name as string | undefined;
      return {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        code: 'INVALID_REFERENCE',
        message: `Invalid reference provided for ${field || 'related record'}`,
        details: ['The referenced record does not exist'],
      };
    }

    case 'P2001': {
      // Record does not exist
      return {
        statusCode: HTTP_STATUS.NOT_FOUND,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Record does not exist',
        details: ['The requested record was not found in the database'],
      };
    }

    default: {
      // Generic database error
      return {
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        code: 'DATABASE_ERROR',
        message: 'A database error occurred',
        details: config.nodeEnv === 'development' ? [error.message] : undefined,
      };
    }
  }
};

/**
 * Handle Prisma Validation Errors
 * Handles errors related to invalid data types or missing required fields
 */
const handlePrismaValidationError = (
  error: Prisma.PrismaClientValidationError
): {
  statusCode: number;
  code: string;
  message: string;
  details?: string[];
} => {
  return {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    code: ERROR_CODES.VALIDATION_ERROR,
    message: 'Invalid data provided',
    details: config.nodeEnv === 'development' ? [error.message] : ['Please check your input data'],
  };
};

/**
 * Global Error Handler Middleware
 * Catches all errors and sends a consistent error response
 *
 * This middleware should be the last middleware in the chain
 * It handles:
 * - Custom AppError instances
 * - Prisma database errors
 * - JWT authentication errors
 * - Validation errors
 * - Generic JavaScript errors
 */
export const errorHandler = (
  err: Error | AppError | Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default error values
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let errorCode = ERROR_CODES.INTERNAL_SERVER_ERROR;
  let message = 'An unexpected error occurred';
  let details: string[] | undefined = undefined;

  // Check if it's our custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  }
  // Handle Prisma Known Request Errors (database errors)
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(err);
    statusCode = prismaError.statusCode;
    errorCode = prismaError.code;
    message = prismaError.message;
    details = prismaError.details;
  }
  // Handle Prisma Validation Errors
  else if (err instanceof Prisma.PrismaClientValidationError) {
    const validationError = handlePrismaValidationError(err);
    statusCode = validationError.statusCode;
    errorCode = validationError.code;
    message = validationError.message;
    details = validationError.details;
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    errorCode = ERROR_CODES.TOKEN_INVALID;
    message = 'Invalid authentication token';
    details = ['The provided token is malformed or invalid'];
  } else if (err.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    errorCode = ERROR_CODES.TOKEN_EXPIRED;
    message = 'Your session has expired, please login again';
    details = ['The authentication token has expired'];
  }
  // Handle validation errors from express-validator
  else if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ERROR_CODES.VALIDATION_ERROR;
    message = err.message || 'Validation failed';
  }
  // Handle generic errors
  else {
    // In production, don't expose internal error messages
    message = config.nodeEnv === 'production'
      ? 'An unexpected error occurred'
      : (err.message || message);
  }

  // Build error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: message,
    },
  };

  // Add details if available
  if (details && details.length > 0) {
    errorResponse.error.details = details;
  }

  // Add stack trace in development mode only
  if (config.nodeEnv === 'development') {
    errorResponse.error.stack = err.stack;
  }

  // Log error for monitoring (in production, this should go to a logging service)
  if (config.nodeEnv === 'development') {
    console.error('❌ Error Details:', {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode,
      code: errorCode,
      message,
      details,
      stack: err.stack,
    });
  } else {
    // In production, log minimal information
    console.error('Error:', {
      timestamp: new Date().toISOString(),
      code: errorCode,
      message: message,
    });
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors automatically
 * Eliminates the need for try-catch blocks in controllers
 *
 * Usage:
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await getUsersFromDB();
 *   res.json(users);
 * }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not Found Handler
 * Handles requests to undefined routes
 * Should be placed before the error handler middleware
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new AppError(
    `Route ${req.method} ${req.path} not found`,
    HTTP_STATUS.NOT_FOUND,
    ERROR_CODES.NOT_FOUND,
    true,
    [`The requested endpoint does not exist`]
  );
  next(error);
};
