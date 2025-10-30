/**
 * Lesson Service
 * Contains all business logic for lesson management
 */

import { PrismaClient, Lesson, LessonProgress, LearningProgress } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { HTTP_STATUS } from '../config/constants';

const prisma = new PrismaClient();

/**
 * Validates that content is a valid JSON with proper lesson structure
 */
const validateLessonContent = (content: any): boolean => {
  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;

    if (!parsed.type || !parsed.sections || !Array.isArray(parsed.sections)) {
      return false;
    }

    return parsed.sections.length > 0;
  } catch (error) {
    return false;
  }
};

/**
 * Validates if user has access to a lesson's module (checks prerequisites)
 */
const validateModuleAccess = async (moduleId: string, userId: string): Promise<boolean> => {
  // Get module with prerequisites
  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      prerequisites: {
        include: {
          prerequisite: true,
        },
      },
    },
  });

  if (!module || !module.isActive) {
    return false;
  }

  // If no prerequisites, user has access
  if (module.prerequisites.length === 0) {
    return true;
  }

  // Check if user completed all prerequisites
  for (const prereq of module.prerequisites) {
    const progress = await prisma.learningProgress.findUnique({
      where: {
        userId_moduleId: {
          userId,
          moduleId: prereq.prerequisiteId,
        },
      },
    });

    // User must have completed the prerequisite module
    if (!progress || !progress.completedAt) {
      return false;
    }
  }

  return true;
};

/**
 * Get lesson by ID with optional user progress
 * @param lessonId - Lesson ID
 * @param userId - Optional user ID to include progress
 * @returns Lesson with module, quizzes, and optional progress
 */
export const getLessonById = async (
  lessonId: string,
  userId?: string
): Promise<Lesson & { module: any; quizzes: any[]; progress?: LessonProgress }> => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: true,
      quizzes: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!lesson) {
    throw new AppError(
      'Lección no encontrada',
      HTTP_STATUS.NOT_FOUND,
      'LESSON_NOT_FOUND'
    );
  }

  // Validate module is active
  if (!lesson.module.isActive) {
    throw new AppError(
      'El módulo de esta lección no está disponible',
      HTTP_STATUS.FORBIDDEN,
      'MODULE_INACTIVE'
    );
  }

  // If user is provided, check access and include progress
  if (userId) {
    const hasAccess = await validateModuleAccess(lesson.moduleId, userId);

    if (!hasAccess) {
      throw new AppError(
        'No tienes acceso a esta lección. Debes completar los módulos prerequisitos primero',
        HTTP_STATUS.FORBIDDEN,
        'ACCESS_DENIED'
      );
    }

    // Get or create learning progress for this module
    let learningProgress = await prisma.learningProgress.findUnique({
      where: {
        userId_moduleId: {
          userId,
          moduleId: lesson.moduleId,
        },
      },
    });

    if (!learningProgress) {
      learningProgress = await prisma.learningProgress.create({
        data: {
          userId,
          moduleId: lesson.moduleId,
          timeSpent: 0,
        },
      });
    }

    // Get user progress for this lesson
    const progress = await prisma.lessonProgress.findUnique({
      where: {
        progressId_lessonId: {
          progressId: learningProgress.id,
          lessonId,
        },
      },
    });

    return { ...lesson, progress: progress || undefined };
  }

  return lesson;
};

/**
 * Get next lesson in the same module
 * @param lessonId - Current lesson ID
 * @returns Next lesson or null if there isn't one
 */
export const getNextLesson = async (lessonId: string): Promise<Lesson | null> => {
  const currentLesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { moduleId: true, order: true },
  });

  if (!currentLesson) {
    throw new AppError(
      'Lección no encontrada',
      HTTP_STATUS.NOT_FOUND,
      'LESSON_NOT_FOUND'
    );
  }

  const nextLesson = await prisma.lesson.findFirst({
    where: {
      moduleId: currentLesson.moduleId,
      order: { gt: currentLesson.order },
    },
    orderBy: { order: 'asc' },
    include: {
      module: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return nextLesson;
};

/**
 * Get previous lesson in the same module
 * @param lessonId - Current lesson ID
 * @returns Previous lesson or null if there isn't one
 */
export const getPreviousLesson = async (lessonId: string): Promise<Lesson | null> => {
  const currentLesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { moduleId: true, order: true },
  });

  if (!currentLesson) {
    throw new AppError(
      'Lección no encontrada',
      HTTP_STATUS.NOT_FOUND,
      'LESSON_NOT_FOUND'
    );
  }

  const previousLesson = await prisma.lesson.findFirst({
    where: {
      moduleId: currentLesson.moduleId,
      order: { lt: currentLesson.order },
    },
    orderBy: { order: 'desc' },
    include: {
      module: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return previousLesson;
};

/**
 * Create a new lesson
 * @param data - Lesson creation data
 * @returns Created lesson
 */
export const createLesson = async (data: {
  moduleId: string;
  title: string;
  content: any;
  order: number;
  estimatedTime: number;
  aiGenerated?: boolean;
  sourcePrompt?: string;
}): Promise<Lesson> => {
  const { moduleId, title, content, order, estimatedTime, aiGenerated = false, sourcePrompt } = data;

  // Validate module exists and is active
  const module = await prisma.module.findUnique({
    where: { id: moduleId },
  });

  if (!module) {
    throw new AppError(
      'Módulo no encontrado',
      HTTP_STATUS.NOT_FOUND,
      'MODULE_NOT_FOUND'
    );
  }

  if (!module.isActive) {
    throw new AppError(
      'No se pueden agregar lecciones a un módulo inactivo',
      HTTP_STATUS.BAD_REQUEST,
      'MODULE_INACTIVE'
    );
  }

  // Validate content structure
  if (!validateLessonContent(content)) {
    throw new AppError(
      'El contenido de la lección debe tener un campo "type" y un array "sections" con al menos un elemento',
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_CONTENT_STRUCTURE'
    );
  }

  // Validate order is unique within module
  const existingLesson = await prisma.lesson.findFirst({
    where: {
      moduleId,
      order,
    },
  });

  if (existingLesson) {
    throw new AppError(
      `Ya existe una lección con el orden ${order} en este módulo`,
      HTTP_STATUS.CONFLICT,
      'DUPLICATE_ORDER'
    );
  }

  // Convert content to JSON string if it's an object
  const contentString = typeof content === 'string' ? content : JSON.stringify(content);

  const lesson = await prisma.lesson.create({
    data: {
      moduleId,
      title,
      content: contentString,
      order,
      estimatedTime,
      aiGenerated,
      sourcePrompt,
    },
    include: {
      module: true,
    },
  });

  return lesson;
};

/**
 * Update an existing lesson
 * @param lessonId - Lesson ID
 * @param data - Fields to update
 * @returns Updated lesson
 */
export const updateLesson = async (
  lessonId: string,
  data: {
    title?: string;
    content?: any;
    order?: number;
    estimatedTime?: number;
    aiGenerated?: boolean;
    sourcePrompt?: string;
  }
): Promise<Lesson> => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
  });

  if (!lesson) {
    throw new AppError(
      'Lección no encontrada',
      HTTP_STATUS.NOT_FOUND,
      'LESSON_NOT_FOUND'
    );
  }

  // If updating order, check for conflicts
  if (data.order !== undefined && data.order !== lesson.order) {
    const existingLesson = await prisma.lesson.findFirst({
      where: {
        moduleId: lesson.moduleId,
        order: data.order,
        id: { not: lessonId },
      },
    });

    if (existingLesson) {
      throw new AppError(
        `Ya existe una lección con el orden ${data.order} en este módulo`,
        HTTP_STATUS.CONFLICT,
        'DUPLICATE_ORDER'
      );
    }
  }

  // If updating content, validate structure
  if (data.content !== undefined) {
    if (!validateLessonContent(data.content)) {
      throw new AppError(
        'El contenido de la lección debe tener un campo "type" y un array "sections" con al menos un elemento',
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_CONTENT_STRUCTURE'
      );
    }
    // Convert to string if needed
    data.content = typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
  }

  const updatedLesson = await prisma.lesson.update({
    where: { id: lessonId },
    data,
    include: {
      module: true,
    },
  });

  return updatedLesson;
};

/**
 * Delete a lesson (hard delete)
 * @param lessonId - Lesson ID
 * @returns Confirmation message
 */
export const deleteLesson = async (lessonId: string): Promise<{ message: string }> => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
  });

  if (!lesson) {
    throw new AppError(
      'Lección no encontrada',
      HTTP_STATUS.NOT_FOUND,
      'LESSON_NOT_FOUND'
    );
  }

  // Delete in transaction to handle foreign key constraints
  await prisma.$transaction([
    // Delete all quizzes associated with this lesson
    prisma.quiz.deleteMany({
      where: { lessonId },
    }),
    // Delete all lesson progress records
    prisma.lessonProgress.deleteMany({
      where: { lessonId },
    }),
    // Delete the lesson
    prisma.lesson.delete({
      where: { id: lessonId },
    }),
  ]);

  return { message: 'Lección eliminada exitosamente' };
};

/**
 * Mark a lesson as completed by a user
 * @param userId - User ID
 * @param lessonId - Lesson ID
 * @param timeSpent - Time spent in minutes
 * @returns Updated progress with module completion info
 */
export const markLessonAsCompleted = async (
  userId: string,
  lessonId: string,
  timeSpent: number
): Promise<{
  lessonProgress: LessonProgress;
  moduleCompleted: boolean;
  moduleProgress?: LearningProgress;
}> => {
  // Validate user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(
      'Usuario no encontrado',
      HTTP_STATUS.NOT_FOUND,
      'USER_NOT_FOUND'
    );
  }

  // Validate lesson exists
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: true,
    },
  });

  if (!lesson) {
    throw new AppError(
      'Lección no encontrada',
      HTTP_STATUS.NOT_FOUND,
      'LESSON_NOT_FOUND'
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // Get or create module learning progress
    let moduleProgress = await tx.learningProgress.findUnique({
      where: {
        userId_moduleId: {
          userId,
          moduleId: lesson.moduleId,
        },
      },
    });

    if (!moduleProgress) {
      moduleProgress = await tx.learningProgress.create({
        data: {
          userId,
          moduleId: lesson.moduleId,
          timeSpent: 0,
        },
      });
    }

    // Update or create lesson progress
    const lessonProgress = await tx.lessonProgress.upsert({
      where: {
        progressId_lessonId: {
          progressId: moduleProgress.id,
          lessonId,
        },
      },
      update: {
        completed: true,
        timeSpent: {
          increment: timeSpent,
        },
        lastAccessed: new Date(),
      },
      create: {
        progressId: moduleProgress.id,
        lessonId,
        completed: true,
        timeSpent,
        lastAccessed: new Date(),
      },
    });

    // Update module progress time spent
    moduleProgress = await tx.learningProgress.update({
      where: {
        userId_moduleId: {
          userId,
          moduleId: lesson.moduleId,
        },
      },
      data: {
        timeSpent: {
          increment: timeSpent,
        },
      },
    });

    // Check if all lessons in the module are completed
    const totalLessons = await tx.lesson.count({
      where: { moduleId: lesson.moduleId },
    });

    const completedLessons = await tx.lessonProgress.count({
      where: {
        progressId: moduleProgress.id,
        completed: true,
      },
    });

    const moduleCompleted = completedLessons === totalLessons;

    // If module is completed, update learning progress
    if (moduleCompleted && !moduleProgress.completedAt) {
      moduleProgress = await tx.learningProgress.update({
        where: {
          userId_moduleId: {
            userId,
            moduleId: lesson.moduleId,
          },
        },
        data: {
          completedAt: new Date(),
        },
      });
    }

    return {
      lessonProgress,
      moduleCompleted,
      moduleProgress,
    };
  });

  return result;
};

/**
 * Record lesson access without marking as completed
 * @param userId - User ID
 * @param lessonId - Lesson ID
 * @returns Updated or created lesson progress
 */
export const recordLessonAccess = async (
  userId: string,
  lessonId: string
): Promise<LessonProgress> => {
  // Get the lesson to find its module
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { moduleId: true },
  });

  if (!lesson) {
    throw new AppError(
      'Lección no encontrada',
      HTTP_STATUS.NOT_FOUND,
      'LESSON_NOT_FOUND'
    );
  }

  // Get or create learning progress for the module
  let learningProgress = await prisma.learningProgress.findUnique({
    where: {
      userId_moduleId: {
        userId,
        moduleId: lesson.moduleId,
      },
    },
  });

  if (!learningProgress) {
    learningProgress = await prisma.learningProgress.create({
      data: {
        userId,
        moduleId: lesson.moduleId,
        timeSpent: 0,
      },
    });
  }

  // Update or create lesson progress
  const lessonProgress = await prisma.lessonProgress.upsert({
    where: {
      progressId_lessonId: {
        progressId: learningProgress.id,
        lessonId,
      },
    },
    update: {
      lastAccessed: new Date(),
    },
    create: {
      progressId: learningProgress.id,
      lessonId,
      completed: false,
      timeSpent: 0,
      lastAccessed: new Date(),
    },
  });

  return lessonProgress;
};
