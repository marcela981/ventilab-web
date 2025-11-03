/**
 * Content Generator Controller
 * Controlador para generar contenido educativo clínico
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { HTTP_STATUS, USER_ROLES } from '../config/constants';
import { sendSuccess, sendCreated } from '../utils/response';
import {
  generateLessonContent,
  generatePhysiologyFoundations,
  generateVentilationPrinciples,
  generateVentilatorConfiguration,
  ContextData
} from '../services/content-generator.service';
import * as lessonService from '../services/lesson.service';

/**
 * Genera contenido de lección basado en contexto
 * POST /api/content-generator/generate
 * Requiere rol TEACHER o ADMIN
 */
export const generateContent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== USER_ROLES.ADMIN && req.user.role !== USER_ROLES.INSTRUCTOR)) {
      throw new AppError(
        'No tienes permisos para generar contenido',
        HTTP_STATUS.FORBIDDEN,
        'FORBIDDEN'
      );
    }

    const context: ContextData = req.body;

    if (!context.topic || !context.level) {
      throw new AppError(
        'Los campos topic y level son requeridos',
        HTTP_STATUS.BAD_REQUEST,
        'MISSING_REQUIRED_FIELDS'
      );
    }

    const lessonContent = generateLessonContent(context);

    sendSuccess(res, HTTP_STATUS.OK, 'Contenido generado exitosamente', {
      content: lessonContent,
      warnings: detectMissingFields(lessonContent)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Genera y persiste una lección completa
 * POST /api/content-generator/generate-and-save
 * Requiere rol TEACHER o ADMIN
 */
export const generateAndSave = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== USER_ROLES.ADMIN && req.user.role !== USER_ROLES.INSTRUCTOR)) {
      throw new AppError(
        'No tienes permisos para generar y guardar contenido',
        HTTP_STATUS.FORBIDDEN,
        'FORBIDDEN'
      );
    }

    const { context, moduleId, order, estimatedTime } = req.body;

    if (!context || !moduleId || order === undefined) {
      throw new AppError(
        'Los campos context, moduleId y order son requeridos',
        HTTP_STATUS.BAD_REQUEST,
        'MISSING_REQUIRED_FIELDS'
      );
    }

    if (!context.topic || !context.level) {
      throw new AppError(
        'El contexto debe incluir topic y level',
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_CONTEXT'
      );
    }

    // Generar contenido
    const lessonContent = generateLessonContent(context);

    // Guardar en base de datos
    const lesson = await lessonService.createLesson({
      moduleId,
      title: context.topic,
      content: lessonContent,
      order,
      estimatedTime: estimatedTime || lessonContent.estimatedTime,
      aiGenerated: true,
      sourcePrompt: JSON.stringify(context)
    });

    sendCreated(res, 'Lección generada y guardada exitosamente', {
      lesson,
      warnings: detectMissingFields(lessonContent)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Genera documento base: Fundamentos Fisiológicos
 * POST /api/content-generator/generate-physiology-foundations
 * Requiere rol TEACHER o ADMIN
 */
export const generatePhysiologyFoundationsDoc = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== USER_ROLES.ADMIN && req.user.role !== USER_ROLES.INSTRUCTOR)) {
      throw new AppError(
        'No tienes permisos para generar documentos base',
        HTTP_STATUS.FORBIDDEN,
        'FORBIDDEN'
      );
    }

    const context: ContextData = req.body.context || {};
    const lessonContent = generatePhysiologyFoundations(context);

    // Si se proporciona moduleId, guardar en base de datos
    if (req.body.moduleId && req.body.order !== undefined) {
      const lesson = await lessonService.createLesson({
        moduleId: req.body.moduleId,
        title: 'Fundamentos Fisiológicos y Respiratorios',
        content: lessonContent,
        order: req.body.order,
        estimatedTime: req.body.estimatedTime || lessonContent.estimatedTime,
        aiGenerated: true,
        sourcePrompt: 'Base document: Physiology Foundations'
      });

      sendCreated(res, 'Documento base generado y guardado exitosamente', {
        lesson,
        warnings: detectMissingFields(lessonContent)
      });
    } else {
      sendSuccess(res, HTTP_STATUS.OK, 'Documento base generado exitosamente', {
        content: lessonContent,
        warnings: detectMissingFields(lessonContent)
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Genera documento base: Principios de Ventilación
 * POST /api/content-generator/generate-ventilation-principles
 * Requiere rol TEACHER o ADMIN
 */
export const generateVentilationPrinciplesDoc = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== USER_ROLES.ADMIN && req.user.role !== USER_ROLES.INSTRUCTOR)) {
      throw new AppError(
        'No tienes permisos para generar documentos base',
        HTTP_STATUS.FORBIDDEN,
        'FORBIDDEN'
      );
    }

    const context: ContextData = req.body.context || {};
    const lessonContent = generateVentilationPrinciples(context);

    if (req.body.moduleId && req.body.order !== undefined) {
      const lesson = await lessonService.createLesson({
        moduleId: req.body.moduleId,
        title: 'Principios de la Ventilación Mecánica',
        content: lessonContent,
        order: req.body.order,
        estimatedTime: req.body.estimatedTime || lessonContent.estimatedTime,
        aiGenerated: true,
        sourcePrompt: 'Base document: Ventilation Principles'
      });

      sendCreated(res, 'Documento base generado y guardado exitosamente', {
        lesson,
        warnings: detectMissingFields(lessonContent)
      });
    } else {
      sendSuccess(res, HTTP_STATUS.OK, 'Documento base generado exitosamente', {
        content: lessonContent,
        warnings: detectMissingFields(lessonContent)
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Genera documento base: Configuración del Ventilador
 * POST /api/content-generator/generate-ventilator-configuration
 * Requiere rol TEACHER o ADMIN
 */
export const generateVentilatorConfigurationDoc = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== USER_ROLES.ADMIN && req.user.role !== USER_ROLES.INSTRUCTOR)) {
      throw new AppError(
        'No tienes permisos para generar documentos base',
        HTTP_STATUS.FORBIDDEN,
        'FORBIDDEN'
      );
    }

    const context: ContextData = req.body.context || {};
    const lessonContent = generateVentilatorConfiguration(context);

    if (req.body.moduleId && req.body.order !== undefined) {
      const lesson = await lessonService.createLesson({
        moduleId: req.body.moduleId,
        title: 'Configuración y Manejo del Ventilador',
        content: lessonContent,
        order: req.body.order,
        estimatedTime: req.body.estimatedTime || lessonContent.estimatedTime,
        aiGenerated: true,
        sourcePrompt: 'Base document: Ventilator Configuration'
      });

      sendCreated(res, 'Documento base generado y guardado exitosamente', {
        lesson,
        warnings: detectMissingFields(lessonContent)
      });
    } else {
      sendSuccess(res, HTTP_STATUS.OK, 'Documento base generado exitosamente', {
        content: lessonContent,
        warnings: detectMissingFields(lessonContent)
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Detecta campos con [[MISSING]] en el contenido
 */
function detectMissingFields(content: any): string[] {
  const warnings: string[] = [];
  const contentStr = JSON.stringify(content);
  
  if (contentStr.includes('[[MISSING]]')) {
    const matches = contentStr.match(/\[\[MISSING\]\]/g);
    const count = matches ? matches.length : 0;
    warnings.push(`Se encontraron ${count} campo(s) con información faltante marcados como [[MISSING]]`);
    warnings.push('Revise el contenido generado y complete la información faltante con datos del contexto apropiado');
  }

  return warnings;
}

/**
 * Vista previa de contenido generado
 * POST /api/content-generator/preview
 * Requiere rol TEACHER o ADMIN
 */
export const previewContent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== USER_ROLES.ADMIN && req.user.role !== USER_ROLES.INSTRUCTOR)) {
      throw new AppError(
        'No tienes permisos para previsualizar contenido',
        HTTP_STATUS.FORBIDDEN,
        'FORBIDDEN'
      );
    }

    const context: ContextData = req.body;

    if (!context.topic) {
      throw new AppError(
        'El campo topic es requerido',
        HTTP_STATUS.BAD_REQUEST,
        'MISSING_TOPIC'
      );
    }

    const lessonContent = generateLessonContent(context);

    sendSuccess(res, HTTP_STATUS.OK, 'Vista previa generada', {
      preview: lessonContent,
      stats: {
        sections: lessonContent.sections.length,
        keyPoints: lessonContent.keyPoints.length,
        quizQuestions: lessonContent.quiz.length,
        diagrams: lessonContent.diagrams.length,
        images: lessonContent.images.length,
        references: lessonContent.references.length,
        estimatedTime: lessonContent.estimatedTime
      },
      warnings: detectMissingFields(lessonContent)
    });
  } catch (error) {
    next(error);
  }
};

