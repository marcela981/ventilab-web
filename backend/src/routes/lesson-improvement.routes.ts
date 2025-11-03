/**
 * Lesson Improvement Routes
 * Rutas para mejora de lecciones existentes
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { improveLessonById, improveLessonAndSave } from '../controllers/lesson-improvement.controller';

const router = Router();

/**
 * @route   POST /api/lessons/:id/improve
 * @desc    Mejora una lección sin guardar (preview)
 * @access  Private (TEACHER, ADMIN)
 * @body    { improvementType, contextSnippet }
 */
router.post('/:id/improve', authenticate, improveLessonById);

/**
 * @route   POST /api/lessons/:id/improve-and-save
 * @desc    Mejora una lección y la guarda
 * @access  Private (TEACHER, ADMIN)
 * @body    { improvementType, contextSnippet }
 */
router.post('/:id/improve-and-save', authenticate, improveLessonAndSave);

export default router;

