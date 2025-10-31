/**
 * JWT Utilities
 * Helper functions for JWT token generation and verification
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/config';

/**
 * JWT Payload Interface
 */
export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Generate a JWT token
 * @param payload - The data to encode in the token
 * @returns The signed JWT token
 */
export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwtSecret as jwt.Secret, {
    expiresIn: config.jwtExpiresIn as string,
  } as jwt.SignOptions);
};

/**
 * Verify a JWT token
 * @param token - The token to verify
 * @returns The decoded payload if valid
 * @throws Will throw an error if the token is invalid or expired
 */
export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwtSecret as jwt.Secret) as TokenPayload;
};

/**
 * Decode a JWT token without verifying
 * @param token - The token to decode
 * @returns The decoded payload or null if invalid
 */
export const decodeToken = (token: string): TokenPayload | null => {
  return jwt.decode(token) as TokenPayload | null;
};
