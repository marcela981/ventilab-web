/**
 * Recommendation Service
 * Provides personalized content recommendations based on user level and performance
 */

import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES, ERROR_MESSAGES } from '../config/constants';
import { UserLevel, ModuleDifficulty, ModuleCategory } from '@prisma/client';

/**
 * Recommendation interface
 */
export interface Recommendation {
  moduleId: string;
  moduleTitle: string;
  reason: string;
  type: 'next_step' | 'reinforcement';
  estimatedTime: number;
  difficulty: ModuleDifficulty;
  category: ModuleCategory;
  order: number;
  relevanceScore: number; // Internal score for sorting
}

/**
 * Get personalized recommendations for a user
 *
 * @param userId - The ID of the user
 * @returns Array of up to 5 recommendations ordered by relevance
 * @throws {AppError} If user is not found
 */
export const getRecommendationsForUser = async (userId: string): Promise<Recommendation[]> => {
  try {
    // Fetch user with learning progress and all related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        learningProgress: {
          include: {
            module: {
              include: {
                prerequisites: {
                  include: {
                    prerequisite: true,
                  },
                },
              },
            },
            lessonProgress: {
              include: {
                lesson: {
                  include: {
                    quizzes: true,
                  },
                },
              },
            },
          },
        },
        quizAttempts: {
          include: {
            quiz: {
              include: {
                lesson: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError(
        ERROR_MESSAGES.USER_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.USER_NOT_FOUND
      );
    }

    // Get all active modules
    const allModules = await prisma.module.findMany({
      where: { isActive: true },
      include: {
        prerequisites: {
          include: {
            prerequisite: true,
          },
        },
        lessons: {
          include: {
            quizzes: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Calculate which modules user has started or completed
    const userModuleIds = new Set(user.learningProgress.map(p => p.moduleId));
    const completedModuleIds = new Set(
      user.learningProgress
        .filter(p => p.completedAt !== null)
        .map(p => p.moduleId)
    );

    // Calculate average score by category to identify weak areas
    const categoryScores = calculateCategoryScores(user.learningProgress);

    // Filter modules that user hasn't started yet
    const notStartedModules = allModules.filter(m => !userModuleIds.has(m.id));

    // Generate recommendations for not started modules
    const nextStepRecommendations = notStartedModules
      .filter(module => {
        // Only recommend modules matching user's current level
        if (module.difficulty !== user.userLevel) {
          return false;
        }

        // Check if prerequisites are met
        return arePrerequisitesMet(module, completedModuleIds);
      })
      .map(module => {
        const relevanceScore = calculateRelevanceScore(
          module,
          user.userLevel,
          categoryScores,
          allModules
        );

        return createRecommendation(module, 'next_step', relevanceScore, categoryScores);
      });

    // Generate reinforcement recommendations (modules in progress with low scores)
    const reinforcementRecommendations = await generateReinforcementRecommendations(
      user,
      allModules,
      categoryScores
    );

    // Combine all recommendations and sort by relevance
    const allRecommendations = [...nextStepRecommendations, ...reinforcementRecommendations]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5); // Return top 5

    console.log(`📚 [Recommendations] Generadas ${allRecommendations.length} recomendaciones para usuario ${user.email}`);

    return allRecommendations;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('❌ [Recommendations] Error al generar recomendaciones:', error);
    throw new AppError(
      'Error al generar recomendaciones',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }
};

/**
 * Calculate average scores by category
 */
function calculateCategoryScores(
  learningProgress: any[]
): Map<ModuleCategory, number> {
  const categoryScores = new Map<ModuleCategory, number>();
  const categoryCounts = new Map<ModuleCategory, number>();

  for (const progress of learningProgress) {
    if (progress.score !== null && progress.score !== undefined) {
      const category = progress.module.category;
      const currentScore = categoryScores.get(category) || 0;
      const currentCount = categoryCounts.get(category) || 0;

      categoryScores.set(category, currentScore + progress.score);
      categoryCounts.set(category, currentCount + 1);
    }
  }

  // Calculate averages
  const avgScores = new Map<ModuleCategory, number>();
  for (const [category, totalScore] of categoryScores.entries()) {
    const count = categoryCounts.get(category) || 1;
    avgScores.set(category, totalScore / count);
  }

  return avgScores;
}

/**
 * Check if all prerequisites for a module are met
 */
function arePrerequisitesMet(
  module: any,
  completedModuleIds: Set<string>
): boolean {
  // If module has no prerequisites, it's available
  if (!module.prerequisites || module.prerequisites.length === 0) {
    return true;
  }

  // Check if all prerequisite modules are completed
  return module.prerequisites.every((prereq: any) =>
    completedModuleIds.has(prereq.prerequisiteId)
  );
}

/**
 * Calculate relevance score for a module
 */
function calculateRelevanceScore(
  module: any,
  userLevel: UserLevel,
  categoryScores: Map<ModuleCategory, number>,
  allModules: any[]
): number {
  let score = 0;

  // 1. Match with user level (highest priority)
  if (module.difficulty === userLevel) {
    score += 100;
  }

  // 2. Boost score if category has low average (reinforce weak areas)
  const categoryScore = categoryScores.get(module.category);
  if (categoryScore !== undefined) {
    // Lower category score = higher boost (inverted)
    const boostFromWeakness = (100 - categoryScore) * 0.5;
    score += boostFromWeakness;
  } else {
    // New category - moderate boost
    score += 30;
  }

  // 3. Favor modules earlier in the sequence
  const maxOrder = Math.max(...allModules.map(m => m.order));
  const orderScore = ((maxOrder - module.order) / maxOrder) * 20;
  score += orderScore;

  // 4. Boost if it's the immediate next step (no prerequisites or all met)
  if (!module.prerequisites || module.prerequisites.length === 0) {
    score += 15; // Entry-level modules
  }

  return score;
}

/**
 * Create a recommendation object
 */
function createRecommendation(
  module: any,
  type: 'next_step' | 'reinforcement',
  relevanceScore: number,
  categoryScores: Map<ModuleCategory, number>
): Recommendation {
  let reason = '';

  if (type === 'next_step') {
    const categoryScore = categoryScores.get(module.category);

    if (categoryScore !== undefined && categoryScore < 75) {
      reason = `Para reforzar ${getCategoryDisplayName(module.category)} (área con menor desempeño)`;
    } else if (module.order <= 3) {
      reason = 'Siguiente paso fundamental en tu camino de aprendizaje';
    } else {
      reason = `Siguiente paso en ${getCategoryDisplayName(module.category)}`;
    }
  } else {
    reason = `Repasar ${getCategoryDisplayName(module.category)} para fortalecer conocimientos`;
  }

  return {
    moduleId: module.id,
    moduleTitle: module.title,
    reason,
    type,
    estimatedTime: module.estimatedTime,
    difficulty: module.difficulty,
    category: module.category,
    order: module.order,
    relevanceScore,
  };
}

/**
 * Generate reinforcement recommendations for modules in progress
 */
async function generateReinforcementRecommendations(
  user: any,
  allModules: any[],
  categoryScores: Map<ModuleCategory, number>
): Promise<Recommendation[]> {
  const reinforcements: Recommendation[] = [];

  // Find modules in progress (started but not completed)
  const inProgressModules = user.learningProgress.filter(
    (p: any) => p.completedAt === null
  );

  for (const progress of inProgressModules) {
    // Calculate quiz performance for this module
    const moduleQuizzes = progress.module.lessons.flatMap((l: any) => l.quizzes);
    const moduleQuizIds = new Set(moduleQuizzes.map((q: any) => q.id));

    const quizAttemptsForModule = user.quizAttempts.filter((qa: any) =>
      moduleQuizIds.has(qa.quizId)
    );

    if (quizAttemptsForModule.length > 0) {
      const correctAttempts = quizAttemptsForModule.filter((qa: any) => qa.isCorrect).length;
      const quizScore = (correctAttempts / quizAttemptsForModule.length) * 100;

      // If quiz score is low (< 70%), recommend for reinforcement
      if (quizScore < 70) {
        const module = allModules.find(m => m.id === progress.moduleId);
        if (module) {
          const relevanceScore = 80 + (70 - quizScore); // Higher priority for lower scores
          reinforcements.push(
            createRecommendation(module, 'reinforcement', relevanceScore, categoryScores)
          );
        }
      }
    }
  }

  return reinforcements;
}

/**
 * Get display name for category
 */
function getCategoryDisplayName(category: ModuleCategory): string {
  const categoryNames: Record<ModuleCategory, string> = {
    FUNDAMENTALS: 'Fundamentos',
    VENTILATION_PRINCIPLES: 'Principios de Ventilación',
    CLINICAL_APPLICATIONS: 'Aplicaciones Clínicas',
    ADVANCED_TECHNIQUES: 'Técnicas Avanzadas',
    TROUBLESHOOTING: 'Resolución de Problemas',
    PATIENT_SAFETY: 'Seguridad del Paciente',
  };

  return categoryNames[category] || category;
}
