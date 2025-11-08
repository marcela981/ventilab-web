/**
 * Authentication Controller
 * Handles user authentication logic
 */

import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../middleware/errorHandler';
import { sendSuccess, sendCreated } from '../utils/response';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import prisma from '../config/database';
import {
  HTTP_STATUS,
  ERROR_CODES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from '../config/constants';
import { AuthRequest } from '../middleware/auth';
import * as achievementService from '../services/achievement.service';

/**
 * Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError(
        ERROR_MESSAGES.EMAIL_ALREADY_EXISTS,
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.EMAIL_ALREADY_EXISTS
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Send response
    sendCreated(res, SUCCESS_MESSAGES.USER_CREATED, {
      user,
      token,
    });
  }
);

/**
 * Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError(
        ERROR_MESSAGES.INVALID_CREDENTIALS,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Verify password (user.password is required for credentials login)
    if (!user.password) {
      throw new AppError(
        ERROR_MESSAGES.INVALID_CREDENTIALS,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new AppError(
        ERROR_MESSAGES.INVALID_CREDENTIALS,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.INVALID_CREDENTIALS
      );
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // =========================================================================
    // SESSION TRACKING & ACHIEVEMENT VERIFICATION
    // Track daily login session for streak and time-based achievements
    // This runs asynchronously and won't block the login response
    // =========================================================================
    setImmediate(async () => {
      try {
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        console.log(`[Auth] Tracking session for user: ${user.id} at ${now.toISOString()}`);

        // Create a learning session for today
        // This helps track daily streaks and learning patterns
        const sessionId = `${user.id}-${today.toISOString()}`;
        
        await prisma.learningSession.upsert({
          where: {
            id: sessionId
          },
          update: {
            // If session exists for today, just update the timestamp
            // This prevents multiple login attempts from breaking streak calculations
          },
          create: {
            id: sessionId,
            userId: user.id,
            startTime: now,
            lessonsViewed: 0,
            quizzesTaken: 0
          }
        });

        // Check for first-time login (for potential future first login achievement)
        const sessionCount = await prisma.learningSession.count({
          where: { userId: user.id }
        });

        // Prepare event data with login time information
        const eventData: achievementService.AchievementEventData = {
          loginTime: now.toISOString(),
          isFirstLogin: sessionCount === 1,
          hour: now.getHours() // For time-based achievements (MORNING_LEARNER, NIGHT_OWL)
        };

        // Check and unlock streak and time-based achievements
        // This includes: STREAK_3_DAYS, STREAK_7_DAYS, STREAK_30_DAYS, 
        // MORNING_LEARNER (before 7am), NIGHT_OWL (after 10pm)
        const newAchievements = await achievementService.checkAndUnlockAchievements(
          user.id,
          'DAILY_LOGIN',
          eventData
        );

        if (newAchievements.length > 0) {
          console.log(
            `[Auth] 🎉 ${newAchievements.length} achievement(s) unlocked on login: ` +
            newAchievements.map(a => a.type).join(', ')
          );
          // Note: We don't include these in the login response to keep it lightweight
          // The frontend can fetch pending achievements separately via GET /api/achievements
        }
      } catch (sessionError) {
        // Silently log errors - session tracking shouldn't break login
        console.error('[Auth] Error tracking session/achievements (non-critical):', sessionError);
        // Login continues successfully even if session tracking fails
      }
    });

    // Send response
    sendSuccess(res, HTTP_STATUS.OK, SUCCESS_MESSAGES.LOGIN_SUCCESS, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });
  }
);

/**
 * Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 * @note    This is optional and mainly used if implementing token blacklisting
 */
export const logout = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // If implementing token blacklisting, add token to blacklist here
    // For now, just send success response
    sendSuccess(res, HTTP_STATUS.OK, SUCCESS_MESSAGES.LOGOUT_SUCCESS);
  }
);

/**
 * Get current authenticated user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new AppError(
        'User not authenticated',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    // Get full user data
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError(
        ERROR_MESSAGES.USER_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND
      );
    }

    sendSuccess(res, HTTP_STATUS.OK, 'User data retrieved successfully', user);
  }
);

/**
 * Generate backend JWT token for NextAuth authenticated user
 * This endpoint allows NextAuth sessions to obtain a backend JWT token
 * @route   POST /api/auth/nextauth-token
 * @access  Public (but requires userId and email in body for validation)
 */
export const generateNextAuthToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { userId, email } = req.body;

    if (!userId || !email) {
      throw new AppError(
        'User ID and email are required',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT
      );
    }

    // Verify user exists and matches the provided email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new AppError(
        ERROR_MESSAGES.USER_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND
      );
    }

    if (user.email !== email) {
      throw new AppError(
        'Email does not match user',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    if (!user.isActive) {
      throw new AppError(
        'User account is inactive',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Send response
    sendSuccess(res, HTTP_STATUS.OK, 'Token generated successfully', {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  }
);