/**
 * Content Generator Routes
 * Rutas para generación de contenido educativo
 */

import { Router } from 'express';
import { authenticate, isTeacher } from '../middleware/auth';
import * as contentGeneratorController from '../controllers/content-generator.controller';

const router = Router();

/**
 * @route   POST /api/content-generator/generate
 * @desc    Genera contenido de lección basado en contexto
 * @access  Private (TEACHER, ADMIN)
 */
router.post(
  '/generate',
  authenticate,
  isTeacher,
  contentGeneratorController.generateContent
);

/**
 * @route   POST /api/content-generator/generate-and-save
 * @desc    Genera y guarda una lección completa
 * @access  Private (TEACHER, ADMIN)
 */
router.post(
  '/generate-and-save',
  authenticate,
  isTeacher,
  contentGeneratorController.generateAndSave
);

/**
 * @route   POST /api/content-generator/generate-physiology-foundations
 * @desc    Genera documento base: Fundamentos Fisiológicos
 * @access  Private (TEACHER, ADMIN)
 */
router.post(
  '/generate-physiology-foundations',
  authenticate,
  isTeacher,
  contentGeneratorController.generatePhysiologyFoundationsDoc
);

/**
 * @route   POST /api/content-generator/generate-ventilation-principles
 * @desc    Genera documento base: Principios de Ventilación
 * @access  Private (TEACHER, ADMIN)
 */
router.post(
  '/generate-ventilation-principles',
  authenticate,
  isTeacher,
  contentGeneratorController.generateVentilationPrinciplesDoc
);

/**
 * @route   POST /api/content-generator/generate-ventilator-configuration
 * @desc    Genera documento base: Configuración del Ventilador
 * @access  Private (TEACHER, ADMIN)
 */
router.post(
  '/generate-ventilator-configuration',
  authenticate,
  isTeacher,
  contentGeneratorController.generateVentilatorConfigurationDoc
);

/**
 * @route   POST /api/content-generator/preview
 * @desc    Vista previa de contenido generado sin guardar
 * @access  Private (TEACHER, ADMIN)
 */
router.post(
  '/preview',
  authenticate,
  isTeacher,
  contentGeneratorController.previewContent
);

export default router;

