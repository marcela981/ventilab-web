/**
 * User Service
 * Business logic for user-related operations
 */

import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES, ERROR_MESSAGES } from '../config/constants';

/**
 * Find user by ID
 * @param userId - User ID
 * @returns User object or null
 */
export const findUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
};

/**
 * Find user by email
 * @param email - User email
 * @returns User object or null
 */
export const findUserByEmail = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  return user;
};

/**
 * Check if user exists by email
 * @param email - User email
 * @returns Boolean indicating if user exists
 */
export const userExistsByEmail = async (email: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user !== null;
};

/**
 * Get all users with pagination
 * @param page - Page number
 * @param limit - Items per page
 * @returns Array of users and total count
 */
export const getAllUsers = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.user.count(),
  ]);

  return {
    users,
    total,
  };
};
