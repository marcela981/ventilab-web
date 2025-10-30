/**
 * Module Service
 * Business logic for module-related operations
 * Handles CRUD operations, prerequisites, and progress tracking
 */

import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES, PAGINATION } from '../config/constants';

/**
 * Type definitions for service parameters and returns
 */
interface GetAllModulesParams {
  category?: string;
  difficulty?: string;
  page?: number;
  limit?: number;
}

interface GetAllModulesResult {
  modules: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface CreateModuleData {
  title: string;
  description?: string;
  category: string;
  difficulty: string;
  estimatedTime: number;
  order: number;
  prerequisiteIds?: string[];
  thumbnail?: string;
}

interface UpdateModuleData {
  title?: string;
  description?: string;
  difficulty?: string;
  estimatedTime?: number;
  order?: number;
  isActive?: boolean;
  thumbnail?: string;
}

/**
 * Get all modules with filtering and pagination
 *
 * @param params - Filter and pagination parameters
 * @returns Modules with pagination metadata
 */
export const getAllModules = async (
  params: GetAllModulesParams
): Promise<GetAllModulesResult> => {
  try {
    const {
      category,
      difficulty,
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
    } = params;

    // Validate and cap limit
    const validLimit = Math.min(limit, PAGINATION.MAX_LIMIT);
    const skip = (page - 1) * validLimit;

    // Build where clause for filtering
    const where: any = {
      isActive: true, // Only return active modules
    };

    if (category) {
      where.category = category;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    // Execute queries in parallel for performance
    const [modules, total] = await Promise.all([
      prisma.module.findMany({
        where,
        skip,
        take: validLimit,
        orderBy: {
          order: 'asc', // Order by display order
        },
        include: {
          _count: {
            select: {
              lessons: true, // Include lesson count
            },
          },
          prerequisites: {
            include: {
              prerequisite: {
                select: {
                  id: true,
                  title: true,
                  difficulty: true,
                },
              },
            },
          },
        },
      }),
      prisma.module.count({ where }),
    ]);

    return {
      modules,
      pagination: {
        total,
        page,
        limit: validLimit,
        totalPages: Math.ceil(total / validLimit),
      },
    };
  } catch (error) {
    console.error('Error in getAllModules:', error);
    throw new AppError(
      'Failed to retrieve modules',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Get a single module by ID
 *
 * @param moduleId - Module ID
 * @param userId - Optional user ID to include progress
 * @returns Module with prerequisites and optional progress
 */
export const getModuleById = async (
  moduleId: string,
  userId?: string
): Promise<any> => {
  try {
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        _count: {
          select: {
            lessons: true,
          },
        },
        prerequisites: {
          include: {
            prerequisite: {
              select: {
                id: true,
                title: true,
                description: true,
                difficulty: true,
                category: true,
                estimatedTime: true,
              },
            },
          },
        },
        dependentModules: {
          include: {
            module: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        ...(userId && {
          learningProgress: {
            where: {
              userId,
            },
            include: {
              lessonProgress: {
                select: {
                  lessonId: true,
                  completed: true,
                  timeSpent: true,
                },
              },
            },
          },
        }),
      },
    });

    if (!module) {
      throw new AppError(
        'Módulo no encontrado',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND,
        true,
        ['El módulo solicitado no existe o ha sido eliminado']
      );
    }

    return module;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Error in getModuleById:', error);
    throw new AppError(
      'Failed to retrieve module',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Create a new module
 *
 * @param data - Module creation data
 * @returns Created module with prerequisites
 */
export const createModule = async (data: CreateModuleData): Promise<any> => {
  try {
    const { title, prerequisiteIds, ...moduleData } = data;

    // Validate that no module with same title exists
    const existingModule = await prisma.module.findFirst({
      where: {
        title: {
          equals: title,
          mode: 'insensitive', // Case-insensitive search
        },
      },
    });

    if (existingModule) {
      throw new AppError(
        'Ya existe un módulo con este título',
        HTTP_STATUS.CONFLICT,
        'DUPLICATE_MODULE_TITLE',
        true,
        ['Por favor, elige un título diferente para el módulo']
      );
    }

    // Validate prerequisite modules exist
    if (prerequisiteIds && prerequisiteIds.length > 0) {
      const prerequisites = await prisma.module.findMany({
        where: {
          id: {
            in: prerequisiteIds,
          },
        },
      });

      if (prerequisites.length !== prerequisiteIds.length) {
        throw new AppError(
          'Uno o más módulos prerequisito no existen',
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_INPUT,
          true,
          ['Verifica que todos los IDs de prerequisitos sean válidos']
        );
      }
    }

    // Create module and prerequisites in a transaction
    const module = await prisma.$transaction(async (tx) => {
      // Create the module
      const newModule = await tx.module.create({
        data: {
          title,
          ...moduleData,
        },
      });

      // Create prerequisite relationships if any
      if (prerequisiteIds && prerequisiteIds.length > 0) {
        await tx.modulePrerequisite.createMany({
          data: prerequisiteIds.map((prereqId) => ({
            moduleId: newModule.id,
            prerequisiteId: prereqId,
          })),
        });
      }

      // Fetch complete module with prerequisites
      return await tx.module.findUnique({
        where: { id: newModule.id },
        include: {
          prerequisites: {
            include: {
              prerequisite: {
                select: {
                  id: true,
                  title: true,
                  difficulty: true,
                },
              },
            },
          },
        },
      });
    });

    return module;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Error in createModule:', error);
    throw new AppError(
      'Failed to create module',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Update an existing module
 *
 * @param moduleId - Module ID
 * @param data - Update data
 * @returns Updated module
 */
export const updateModule = async (
  moduleId: string,
  data: UpdateModuleData
): Promise<any> => {
  try {
    // Validate module exists
    const existingModule = await prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!existingModule) {
      throw new AppError(
        'Módulo no encontrado',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND,
        true,
        ['El módulo que intentas actualizar no existe']
      );
    }

    // If updating order, check for conflicts
    if (data.order !== undefined && data.order !== existingModule.order) {
      const conflictingModule = await prisma.module.findFirst({
        where: {
          order: data.order,
          id: {
            not: moduleId,
          },
        },
      });

      if (conflictingModule) {
        throw new AppError(
          'Ya existe un módulo con ese orden',
          HTTP_STATUS.CONFLICT,
          'DUPLICATE_ORDER',
          true,
          [
            `El módulo "${conflictingModule.title}" ya tiene el orden ${data.order}`,
          ]
        );
      }
    }

    // Update the module
    const updatedModule = await prisma.module.update({
      where: { id: moduleId },
      data,
      include: {
        _count: {
          select: {
            lessons: true,
          },
        },
        prerequisites: {
          include: {
            prerequisite: {
              select: {
                id: true,
                title: true,
                difficulty: true,
              },
            },
          },
        },
      },
    });

    return updatedModule;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Error in updateModule:', error);
    throw new AppError(
      'Failed to update module',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Delete a module (soft delete)
 *
 * @param moduleId - Module ID
 * @returns Confirmation message
 */
export const deleteModule = async (moduleId: string): Promise<string> => {
  try {
    // Validate module exists
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        lessons: {
          where: {
            // Check for active lessons
            // Assuming lessons don't have isActive flag, check if any exist
          },
        },
      },
    });

    if (!module) {
      throw new AppError(
        'Módulo no encontrado',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND,
        true,
        ['El módulo que intentas eliminar no existe']
      );
    }

    // Check if module has lessons
    if (module.lessons.length > 0) {
      throw new AppError(
        'No se puede eliminar un módulo con lecciones',
        HTTP_STATUS.BAD_REQUEST,
        'MODULE_HAS_LESSONS',
        true,
        [
          `Este módulo tiene ${module.lessons.length} lecciones asociadas`,
          'Elimina las lecciones primero o desactiva el módulo',
        ]
      );
    }

    // Soft delete by setting isActive to false
    await prisma.module.update({
      where: { id: moduleId },
      data: {
        isActive: false,
      },
    });

    return `Módulo "${module.title}" desactivado exitosamente`;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Error in deleteModule:', error);
    throw new AppError(
      'Failed to delete module',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Check for circular dependencies recursively
 *
 * @param moduleId - Module to check
 * @param prerequisiteId - Prerequisite being added
 * @param visited - Set of visited module IDs
 * @returns True if circular dependency detected
 */
const hasCircularDependency = async (
  moduleId: string,
  prerequisiteId: string,
  visited: Set<string> = new Set()
): Promise<boolean> => {
  // If we've visited this node, we have a cycle
  if (visited.has(prerequisiteId)) {
    return true;
  }

  // Add to visited set
  visited.add(prerequisiteId);

  // Get all prerequisites of the prerequisite
  const prerequisites = await prisma.modulePrerequisite.findMany({
    where: {
      moduleId: prerequisiteId,
    },
    select: {
      prerequisiteId: true,
    },
  });

  // Check if any prerequisite is the original module (circular)
  for (const prereq of prerequisites) {
    if (prereq.prerequisiteId === moduleId) {
      return true;
    }

    // Recursively check prerequisites
    const hasCircular = await hasCircularDependency(
      moduleId,
      prereq.prerequisiteId,
      visited
    );

    if (hasCircular) {
      return true;
    }
  }

  return false;
};

/**
 * Add a prerequisite to a module
 *
 * @param moduleId - Module ID
 * @param prerequisiteId - Prerequisite module ID
 * @returns Updated module
 */
export const addPrerequisite = async (
  moduleId: string,
  prerequisiteId: string
): Promise<any> => {
  try {
    // Validate both modules exist
    const [module, prerequisite] = await Promise.all([
      prisma.module.findUnique({ where: { id: moduleId } }),
      prisma.module.findUnique({ where: { id: prerequisiteId } }),
    ]);

    if (!module) {
      throw new AppError(
        'Módulo no encontrado',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND,
        true,
        ['El módulo especificado no existe']
      );
    }

    if (!prerequisite) {
      throw new AppError(
        'Módulo prerequisito no encontrado',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND,
        true,
        ['El módulo prerequisito especificado no existe']
      );
    }

    // Cannot add itself as prerequisite
    if (moduleId === prerequisiteId) {
      throw new AppError(
        'Un módulo no puede ser prerequisito de sí mismo',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        true,
        ['Selecciona un módulo diferente como prerequisito']
      );
    }

    // Check for circular dependencies
    const hasCircular = await hasCircularDependency(moduleId, prerequisiteId);

    if (hasCircular) {
      throw new AppError(
        'No se puede agregar este prerequisito',
        HTTP_STATUS.BAD_REQUEST,
        'CIRCULAR_DEPENDENCY',
        true,
        [
          'Agregar este prerequisito crearía una dependencia circular',
          'Revisa la cadena de prerequisitos para evitar ciclos',
        ]
      );
    }

    // Check if prerequisite already exists
    const existingPrereq = await prisma.modulePrerequisite.findFirst({
      where: {
        moduleId,
        prerequisiteId,
      },
    });

    if (existingPrereq) {
      throw new AppError(
        'Este prerequisito ya existe',
        HTTP_STATUS.CONFLICT,
        'DUPLICATE_PREREQUISITE',
        true,
        ['El módulo ya tiene este prerequisito configurado']
      );
    }

    // Create the prerequisite relationship
    await prisma.modulePrerequisite.create({
      data: {
        moduleId,
        prerequisiteId,
      },
    });

    // Return updated module with prerequisites
    return await getModuleById(moduleId);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Error in addPrerequisite:', error);
    throw new AppError(
      'Failed to add prerequisite',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Remove a prerequisite from a module
 *
 * @param moduleId - Module ID
 * @param prerequisiteId - Prerequisite module ID
 * @returns Confirmation message
 */
export const removePrerequisite = async (
  moduleId: string,
  prerequisiteId: string
): Promise<string> => {
  try {
    // Check if prerequisite relationship exists
    const prerequisite = await prisma.modulePrerequisite.findFirst({
      where: {
        moduleId,
        prerequisiteId,
      },
    });

    if (!prerequisite) {
      throw new AppError(
        'Relación de prerequisito no encontrada',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND,
        true,
        ['Este prerequisito no está configurado para el módulo']
      );
    }

    // Delete the prerequisite relationship
    await prisma.modulePrerequisite.delete({
      where: {
        id: prerequisite.id,
      },
    });

    return 'Prerequisito eliminado exitosamente';
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Error in removePrerequisite:', error);
    throw new AppError(
      'Failed to remove prerequisite',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Get all lessons for a module
 *
 * @param moduleId - Module ID
 * @param userId - Optional user ID to include progress
 * @returns Array of lessons
 */
export const getModuleLessons = async (
  moduleId: string,
  userId?: string
): Promise<any[]> => {
  try {
    // Validate module exists and is active
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw new AppError(
        'Módulo no encontrado',
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.NOT_FOUND,
        true,
        ['El módulo especificado no existe']
      );
    }

    if (!module.isActive) {
      throw new AppError(
        'Módulo no activo',
        HTTP_STATUS.BAD_REQUEST,
        'MODULE_INACTIVE',
        true,
        ['Este módulo no está disponible actualmente']
      );
    }

    // Get lessons with optional progress
    const lessons = await prisma.lesson.findMany({
      where: {
        moduleId,
      },
      orderBy: {
        order: 'asc',
      },
      include: {
        _count: {
          select: {
            quizzes: true,
          },
        },
        ...(userId && {
          lessonProgress: {
            where: {
              learningProgress: {
                userId,
              },
            },
            select: {
              completed: true,
              timeSpent: true,
              lastAccessed: true,
            },
          },
        }),
      },
    });

    return lessons;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Error in getModuleLessons:', error);
    throw new AppError(
      'Failed to retrieve lessons',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Get user's progress in a module
 *
 * @param userId - User ID
 * @param moduleId - Module ID
 * @returns Comprehensive progress information
 */
export const getUserModuleProgress = async (
  userId: string,
  moduleId: string
): Promise<any> => {
  try {
    // Get or create learning progress
    let progress = await prisma.learningProgress.findUnique({
      where: {
        userId_moduleId: {
          userId,
          moduleId,
        },
      },
      include: {
        lessonProgress: {
          include: {
            lesson: {
              select: {
                id: true,
                title: true,
                order: true,
                estimatedTime: true,
              },
            },
          },
          orderBy: {
            lesson: {
              order: 'asc',
            },
          },
        },
        module: {
          select: {
            title: true,
            estimatedTime: true,
            _count: {
              select: {
                lessons: true,
              },
            },
          },
        },
      },
    });

    // If no progress exists, create initial record
    if (!progress) {
      progress = await prisma.learningProgress.create({
        data: {
          userId,
          moduleId,
          timeSpent: 0,
        },
        include: {
          lessonProgress: {
            include: {
              lesson: {
                select: {
                  id: true,
                  title: true,
                  order: true,
                  estimatedTime: true,
                },
              },
            },
          },
          module: {
            select: {
              title: true,
              estimatedTime: true,
              _count: {
                select: {
                  lessons: true,
                },
              },
            },
          },
        },
      });
    }

    // Calculate statistics
    const totalLessons = progress.module._count.lessons;
    const completedLessons = progress.lessonProgress.filter(
      (lp) => lp.completed
    ).length;
    const completionPercentage =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      progress: {
        id: progress.id,
        completedAt: progress.completedAt,
        timeSpent: progress.timeSpent,
        score: progress.score,
      },
      module: {
        id: moduleId,
        title: progress.module.title,
        estimatedTime: progress.module.estimatedTime,
      },
      statistics: {
        totalLessons,
        completedLessons,
        completionPercentage,
        remainingLessons: totalLessons - completedLessons,
      },
      lessonProgress: progress.lessonProgress,
    };
  } catch (error) {
    console.error('Error in getUserModuleProgress:', error);
    throw new AppError(
      'Failed to retrieve progress',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
};
