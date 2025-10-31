/**
 * Routes Index
 * Central place to export all route modules
 */

import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import moduleRoutes from './module.routes';
import lessonRoutes from './lesson.routes';
import adminUsersRoutes from './admin/users.routes';

const router = Router();

/**
 * Register all routes
 * Each route module is mounted on its respective path
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/modules', moduleRoutes);
router.use('/lessons', lessonRoutes);

// Admin routes
router.use('/admin/users', adminUsersRoutes);

export default router;
