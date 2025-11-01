/**
 * User Controller
 * Handles user management logic
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../middleware/errorHandler';
import { sendSuccess } from '../utils/response';
import prisma from '../config/database';
import {
  HTTP_STATUS,
  ERROR_CODES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from '../config/constants';

/**
 * Get current user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getProfile = asyncHandler(
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      throw new AppError(
        ERROR_MESSAGES.UNAUTHORIZED,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    // Fetch user from database with all profile fields
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        bio: true,
        isActive: true,
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

    sendSuccess(res, HTTP_STATUS.OK, 'Perfil obtenido exitosamente', { user });
  }
);

/**
 * Update current user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      throw new AppError(
        ERROR_MESSAGES.UNAUTHORIZED,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const { name, bio } = req.body;

    // Validate input
    if (!name || typeof name !== 'string') {
      throw new AppError(
        'El nombre es requerido',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        ['El nombre debe ser una cadena de texto válida']
      );
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 3) {
      throw new AppError(
        'El nombre es muy corto',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        ['El nombre debe tener al menos 3 caracteres']
      );
    }

    if (trimmedName.length > 100) {
      throw new AppError(
        'El nombre es muy largo',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        ['El nombre no puede exceder 100 caracteres']
      );
    }

    // Validate bio if provided
    if (bio !== undefined && bio !== null) {
      if (typeof bio !== 'string') {
        throw new AppError(
          'La biografía debe ser una cadena de texto',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR,
          true,
          ['La biografía debe ser una cadena de texto válida']
        );
      }

      if (bio.length > 500) {
        throw new AppError(
          'La biografía es muy larga',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR,
          true,
          ['La biografía no puede exceder 500 caracteres']
        );
      }
    }

    // Build update data
    const updateData: any = {
      name: trimmedName,
    };

    if (bio !== undefined) {
      updateData.bio = bio.trim();
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        bio: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log(`✅ [Profile] Usuario actualizado: ${updatedUser.email}`);

    sendSuccess(res, HTTP_STATUS.OK, 'Perfil actualizado correctamente', { user: updatedUser });
  }
);

/**
 * Upload user avatar
 * @route   POST /api/users/profile/avatar
 * @access  Private
 * @note    Currently mocked - implement with actual file upload service
 */
export const uploadAvatar = asyncHandler(
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      throw new AppError(
        ERROR_MESSAGES.UNAUTHORIZED,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    // TODO: Implement actual file upload logic
    // For now, accept a base64 string or URL in the request body
    const { avatarUrl } = req.body;

    if (!avatarUrl || typeof avatarUrl !== 'string') {
      throw new AppError(
        'URL del avatar es requerida',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        ['Debe proporcionar una URL válida para el avatar']
      );
    }

    // Validate URL format (basic validation)
    if (!avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:image')) {
      throw new AppError(
        'URL del avatar inválida',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        ['La URL del avatar debe ser una URL válida o una imagen en base64']
      );
    }

    // Update user avatar
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { image: avatarUrl },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        bio: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log(`✅ [Profile] Avatar actualizado para: ${updatedUser.email}`);

    sendSuccess(res, HTTP_STATUS.OK, 'Avatar actualizado correctamente', { user: updatedUser });
  }
);

/**
 * Change user password
 * @route   PUT /api/users/profile/password
 * @access  Private
 */
export const changeUserPassword = asyncHandler(
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      throw new AppError(
        ERROR_MESSAGES.UNAUTHORIZED,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || typeof currentPassword !== 'string') {
      throw new AppError(
        'La contraseña actual es requerida',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        ['Debe proporcionar su contraseña actual']
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      throw new AppError(
        'La nueva contraseña es requerida',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        ['Debe proporcionar una nueva contraseña']
      );
    }

    if (!confirmPassword || typeof confirmPassword !== 'string') {
      throw new AppError(
        'La confirmación de contraseña es requerida',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        ['Debe confirmar su nueva contraseña']
      );
    }

    // Validate new password requirements
    if (newPassword.length < 8) {
      throw new AppError(
        'La contraseña es muy corta',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        ['La contraseña debe tener al menos 8 caracteres']
      );
    }

    if (!/[a-z]/.test(newPassword)) {
      throw new AppError(
        'La contraseña no cumple los requisitos',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        ['La contraseña debe contener al menos una letra minúscula']
      );
    }

    if (!/[A-Z]/.test(newPassword)) {
      throw new AppError(
        'La contraseña no cumple los requisitos',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        ['La contraseña debe contener al menos una letra mayúscula']
      );
    }

    if (!/\d/.test(newPassword)) {
      throw new AppError(
        'La contraseña no cumple los requisitos',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        ['La contraseña debe contener al menos un número']
      );
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      throw new AppError(
        'Las contraseñas no coinciden',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        ['La nueva contraseña y su confirmación deben coincidir']
      );
    }

    // Validate new password is different from current
    if (currentPassword === newPassword) {
      throw new AppError(
        'La nueva contraseña debe ser diferente',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        true,
        ['La nueva contraseña debe ser diferente a la contraseña actual']
      );
    }

    // Get user with current password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });

    if (!user) {
      throw new AppError(
        ERROR_MESSAGES.USER_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND
      );
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new AppError(
        'Contraseña actual incorrecta',
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.INVALID_CREDENTIALS,
        true,
        ['La contraseña actual que ingresaste es incorrecta']
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    console.log(`✅ [Profile] Contraseña actualizada para: ${user.email}`);

    sendSuccess(res, HTTP_STATUS.OK, 'Contraseña actualizada correctamente', {
      message: 'Tu contraseña ha sido actualizada exitosamente',
    });
  }
);

/**
 * Get user statistics and learning progress
 * @route   GET /api/users/profile/stats
 * @access  Private
 */
export const getUserStats = asyncHandler(
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      throw new AppError(
        ERROR_MESSAGES.UNAUTHORIZED,
        HTTP_STATUS.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED
      );
    }

    try {
      const userId = req.user.id;

      // Get all learning progress with lesson details
      const learningProgress = await prisma.learningProgress.findMany({
        where: { userId },
        include: {
          module: {
            select: {
              id: true,
              title: true,
              estimatedTime: true,
            },
          },
          lessonProgress: {
            include: {
              lesson: {
                select: {
                  id: true,
                  title: true,
                  moduleId: true,
                },
              },
            },
            orderBy: {
              lastAccessed: 'desc',
            },
          },
        },
      });

      // Count total modules
      const totalModules = await prisma.module.count({
        where: { isActive: true },
      });

      // Count total lessons
      const totalLessons = await prisma.lesson.count();

      // Calculate statistics
      const modulesCompleted = learningProgress.filter(
        (progress) => progress.completedAt !== null
      ).length;

      const allLessonProgress = learningProgress.flatMap((p) => p.lessonProgress);
      const lessonsCompleted = allLessonProgress.filter((lp) => lp.completed).length;

      // Calculate total study time (in minutes)
      const totalTimeMinutes = learningProgress.reduce(
        (sum, progress) => sum + progress.timeSpent,
        0
      );

      // Get learning sessions for streak calculation
      const learningSessions = await prisma.learningSession.findMany({
        where: { userId },
        orderBy: { startTime: 'desc' },
        take: 100, // Look at last 100 sessions
      });

      // Calculate streak days
      let streakDays = 0;
      if (learningSessions.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sessionDates = new Set(
          learningSessions.map((session) => {
            const date = new Date(session.startTime);
            date.setHours(0, 0, 0, 0);
            return date.getTime();
          })
        );

        let currentDate = new Date(today);
        while (sessionDates.has(currentDate.getTime())) {
          streakDays++;
          currentDate.setDate(currentDate.getDate() - 1);
        }
      }

      // Get last activity
      const lastSession = learningSessions[0];
      const lastActivity = lastSession ? lastSession.startTime : null;

      // Calculate progress percentage
      const progressPercent =
        totalLessons > 0
          ? Math.round((lessonsCompleted / totalLessons) * 100)
          : 0;

      // Get recent lessons (last 5 completed)
      const recentLessons = allLessonProgress
        .filter((lp) => lp.completed && lp.lesson)
        .sort((a, b) => {
          const dateA = a.lastAccessed || a.updatedAt;
          const dateB = b.lastAccessed || b.updatedAt;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        })
        .slice(0, 5)
        .map((lp) => ({
          id: lp.lesson.id,
          title: lp.lesson.title,
          moduleId: lp.lesson.moduleId,
          completedAt: lp.lastAccessed || lp.updatedAt,
          timeSpent: lp.timeSpent,
        }));

      // Get achievements
      const achievements = await prisma.achievement.findMany({
        where: { userId },
        orderBy: { unlockedAt: 'desc' },
        take: 5,
      });

      // Format response
      const stats = {
        lessonsCompleted,
        totalLessons,
        modulesCompleted,
        totalModules,
        totalTime: totalTimeMinutes,
        streakDays,
        lastActivity,
        progressPercent,
        recentLessons,
        achievements: achievements.map((a) => ({
          id: a.id,
          type: a.type,
          title: a.title,
          description: a.description,
          icon: a.icon,
          points: a.points,
          unlockedAt: a.unlockedAt,
        })),
      };

      console.log(`📊 [Stats] Estadísticas obtenidas para: ${req.user.email}`);

      sendSuccess(res, HTTP_STATUS.OK, 'Estadísticas obtenidas exitosamente', stats);
    } catch (error) {
      console.error('❌ [Stats] Error al obtener estadísticas:', error);
      throw new AppError(
        'Error al obtener estadísticas',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        true,
        ['Ocurrió un error al procesar la solicitud. Por favor, intente nuevamente.']
      );
    }
  }
);

/**
 * Get all users (Admin only)
 * @route   GET /api/users
 * @access  Private (Admin)
 */
export const getAllUsers = asyncHandler(
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    sendSuccess(res, HTTP_STATUS.OK, undefined, users);
  }
);
