/**
 * Lesson Improvement Controller
 * Controlador para endpoints de mejora de lecciones
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { HTTP_STATUS, USER_ROLES } from '../config/constants';
import { sendSuccess } from '../utils/response';
import { improveLesson, ImprovementType } from '../services/lesson-improvement.service';
import { LessonContent, ContextData } from '../services/content-generator.service';
import * as lessonService from '../services/lesson.service';

/**
 * Mejora una lección existente según tipo especificado
 * POST /api/lessons/:id/improve
 * Requiere rol TEACHER o ADMIN
 */
export const improveLessonById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== USER_ROLES.ADMIN && req.user.role !== USER_ROLES.TEACHER)) {
      throw new AppError(
        'No tienes permisos para mejorar lecciones',
        HTTP_STATUS.FORBIDDEN,
        'FORBIDDEN'
      );
    }

    const { id: lessonId } = req.params;
    const { improvementType, contextSnippet } = req.body;

    // Validar tipo de mejora
    const validTypes: ImprovementType[] = ['simplify', 'expand', 'add_examples', 'update_references'];
    if (!improvementType || !validTypes.includes(improvementType)) {
      throw new AppError(
        `Tipo de mejora inválido. Debe ser uno de: ${validTypes.join(', ')}`,
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_IMPROVEMENT_TYPE'
      );
    }

    // Obtener lección actual
    const existingLesson = await lessonService.getLessonById(lessonId, req.user.id);
    if (!existingLesson) {
      throw new AppError(
        'Lección no encontrada',
        HTTP_STATUS.NOT_FOUND,
        'LESSON_NOT_FOUND'
      );
    }

    // Parsear contenido JSON
    let currentContent: LessonContent;
    try {
      currentContent = typeof existingLesson.content === 'string' 
        ? JSON.parse(existingLesson.content)
        : existingLesson.content;
    } catch (error) {
      throw new AppError(
        'El contenido de la lección no es un JSON válido',
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_LESSON_CONTENT'
      );
    }

    // Validar contextSnippet
    const context: ContextData = contextSnippet || {
      topic: existingLesson.title,
      level: 'Intermediate',
      keyPoints: [],
      references: []
    };

    // Mejorar lección
    const improvedContent = improveLesson({
      lessonId,
      improvementType,
      currentLesson: currentContent,
      contextSnippet: context
    });

    // Detectar warnings (campos [[MISSING]])
    const warnings = detectMissingFields(improvedContent);

    sendSuccess(res, HTTP_STATUS.OK, `Lección mejorada con ${improvementType}`, {
      improvedContent,
      improvementType,
      warnings,
      stats: {
        originalTime: currentContent.estimatedTime,
        improvedTime: improvedContent.estimatedTime,
        originalSections: currentContent.sections.length,
        improvedSections: improvedContent.sections.length,
        originalKeyPoints: currentContent.keyPoints.length,
        improvedKeyPoints: improvedContent.keyPoints.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mejora y guarda una lección
 * POST /api/lessons/:id/improve-and-save
 * Requiere rol TEACHER o ADMIN
 */
export const improveLessonAndSave = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== USER_ROLES.ADMIN && req.user.role !== USER_ROLES.TEACHER)) {
      throw new AppError(
        'No tienes permisos para mejorar lecciones',
        HTTP_STATUS.FORBIDDEN,
        'FORBIDDEN'
      );
    }

    const { id: lessonId } = req.params;
    const { improvementType, contextSnippet } = req.body;

    // Validar tipo de mejora
    const validTypes: ImprovementType[] = ['simplify', 'expand', 'add_examples', 'update_references'];
    if (!improvementType || !validTypes.includes(improvementType)) {
      throw new AppError(
        `Tipo de mejora inválido. Debe ser uno de: ${validTypes.join(', ')}`,
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_IMPROVEMENT_TYPE'
      );
    }

    // Obtener lección actual
    const existingLesson = await lessonService.getLessonById(lessonId, req.user.id);
    if (!existingLesson) {
      throw new AppError(
        'Lección no encontrada',
        HTTP_STATUS.NOT_FOUND,
        'LESSON_NOT_FOUND'
      );
    }

    // Parsear contenido JSON
    let currentContent: LessonContent;
    try {
      currentContent = typeof existingLesson.content === 'string' 
        ? JSON.parse(existingLesson.content)
        : existingLesson.content;
    } catch (error) {
      throw new AppError(
        'El contenido de la lección no es un JSON válido',
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_LESSON_CONTENT'
      );
    }

    // Validar contextSnippet
    const context: ContextData = contextSnippet || {
      topic: existingLesson.title,
      level: 'Intermediate',
      keyPoints: [],
      references: []
    };

    // Mejorar lección
    const improvedContent = improveLesson({
      lessonId,
      improvementType,
      currentLesson: currentContent,
      contextSnippet: context
    });

    // Actualizar en base de datos
    const updatedLesson = await lessonService.updateLesson(lessonId, {
      content: improvedContent,
      estimatedTime: improvedContent.estimatedTime
    });

    // Detectar warnings
    const warnings = detectMissingFields(improvedContent);

    sendSuccess(res, HTTP_STATUS.OK, `Lección mejorada y guardada con ${improvementType}`, {
      lesson: updatedLesson,
      improvementType,
      warnings,
      stats: {
        originalTime: currentContent.estimatedTime,
        improvedTime: improvedContent.estimatedTime,
        originalSections: currentContent.sections.length,
        improvedSections: improvedContent.sections.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Detecta campos con [[MISSING]] en el contenido
 */
function detectMissingFields(content: LessonContent): string[] {
  const warnings: string[] = [];
  const contentStr = JSON.stringify(content);
  
  if (contentStr.includes('[[MISSING]]')) {
    const matches = contentStr.match(/\[\[MISSING\]\]/g);
    const count = matches ? matches.length : 0;
    warnings.push(`Se encontraron ${count} campo(s) con información faltante marcados como [[MISSING]]`);
  }

  if (contentStr.includes('[[MISSING_REF]]')) {
    warnings.push('No hay referencias nuevas disponibles en el contexto');
  }

  return warnings;
}

