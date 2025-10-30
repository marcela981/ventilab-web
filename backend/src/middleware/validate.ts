/**
 * Validation Middleware
 * Uses express-validator to validate incoming requests
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { AppError } from './errorHandler';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants';

/**
 * Middleware to check validation results
 * Should be used after express-validator validation chains
 */
export const validate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.type === 'field' ? error.path : undefined,
      message: error.msg,
    }));

    throw new AppError(
      'Validation failed',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      true,
      formattedErrors
    );
  }

  next();
};

/**
 * Wrapper function to run validation chains and check results
 * This is a convenience function that combines validation chains with the validate middleware
 */
export const validateRequest = (validations: ValidationChain[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map((error) => ({
        field: error.type === 'field' ? error.path : undefined,
        message: error.msg,
      }));

      return next(
        new AppError(
          'Validation failed',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR,
          true,
          formattedErrors
        )
      );
    }

    next();
  };
};
