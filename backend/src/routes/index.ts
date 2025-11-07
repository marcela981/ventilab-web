/**
 * Routes Index
 * Central place to export all route modules
 */

import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import moduleRoutes from './module.routes';
import lessonRoutes from './lesson.routes';
import userProgressRoutes from './progressRoutes.js';
import progressRoutes from './progress.routes';
import quizRoutes from './quiz.routes';
import achievementRoutes from './achievement.routes';
import adminUsersRoutes from './admin/users.routes';
import contentGeneratorRoutes from './content-generator.routes';
import recommendationRoutes from './recommendation.routes';
import searchRoutes from './search.routes';
import adminRoutes from './admin.routes';
import aiTutorRoutes from './ai-tutor.routes';

const router = Router();

/**
 * Register all routes
 * Each route module is mounted on its respective path
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/modules', moduleRoutes);
router.use('/lessons', lessonRoutes);
router.use('/progress', userProgressRoutes);
router.use('/progress', progressRoutes);

// Quiz routes
router.use('/quizzes', quizRoutes);

// Achievement and gamification routes
router.use('/achievements', achievementRoutes);

router.use('/content-generator', contentGeneratorRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/search', searchRoutes);

// AI Tutor routes
router.use('/ai', aiTutorRoutes);

// Admin routes
router.use('/admin/users', adminUsersRoutes);
router.use('/admin', adminRoutes);

export default router;
