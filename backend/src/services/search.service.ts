/**
 * Search Service
 * Business logic for search and autocomplete functionality
 * Handles searching and filtering across lessons and modules
 */

import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { HTTP_STATUS, ERROR_CODES, PAGINATION } from '../config/constants';
import { ModuleCategory, ModuleDifficulty } from '@prisma/client';
import { logSearch } from './searchAnalytics.service';

/**
 * Type definitions for service parameters and returns
 */

interface SearchFilters {
  categories?: ModuleCategory[];
  difficulties?: ModuleDifficulty[];
  durations?: number[]; // Estimated time ranges in minutes
  statuses?: ('completed' | 'in_progress' | 'not_started')[];
}

interface SearchContentParams {
  query: string;
  filters?: SearchFilters;
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'popularity' | 'duration';
  userId?: string;
}

interface SearchResultItem {
  type: 'lesson' | 'module';
  id: string;
  title: string;
  snippet: string;
  difficulty: ModuleDifficulty;
  estimatedTime: number;
  completedStatus?: 'completed' | 'in_progress' | 'not_started';
  parentModule?: {
    id: string;
    title: string;
    category: ModuleCategory;
  };
  score: number;
  category?: ModuleCategory;
}

interface SearchContentResult {
  results: SearchResultItem[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface SearchSuggestion {
  type: 'lesson' | 'module';
  id: string;
  title: string;
  additionalInfo: {
    category?: ModuleCategory;
    completed?: boolean;
  };
}

/**
 * Helper function to calculate relevance score
 *
 * @param text - Text to search in
 * @param query - Search query
 * @param isTitle - Whether the text is a title (higher weight)
 * @returns Relevance score (0-100)
 */
const calculateRelevanceScore = (text: string, query: string, isTitle: boolean): number => {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Exact match in title
  if (isTitle && lowerText === lowerQuery) {
    return 100;
  }

  // Exact match in content
  if (!isTitle && lowerText === lowerQuery) {
    return 30;
  }

  // Partial match in title
  if (isTitle && lowerText.includes(lowerQuery)) {
    return 70;
  }

  // Partial match in content
  if (!isTitle && lowerText.includes(lowerQuery)) {
    return 30;
  }

  return 0;
};

/**
 * Helper function to extract and highlight snippet from content
 *
 * @param content - JSON string content
 * @param query - Search query
 * @param maxLength - Maximum snippet length
 * @returns Snippet with highlighted query terms
 */
const extractSnippet = (content: string, query: string, maxLength: number = 150): string => {
  try {
    // Parse JSON content
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    
    // Extract text from sections
    let textContent = '';
    if (parsed.sections && Array.isArray(parsed.sections)) {
      for (const section of parsed.sections) {
        if (section.content) {
          textContent += section.content + ' ';
        }
        if (section.text) {
          textContent += section.text + ' ';
        }
      }
    }

    const lowerText = textContent.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const queryIndex = lowerText.indexOf(lowerQuery);

    if (queryIndex !== -1) {
      // Extract snippet around the query
      const start = Math.max(0, queryIndex - 50);
      const end = Math.min(textContent.length, queryIndex + query.length + 100);
      let snippet = textContent.substring(start, end);

      // Add ellipsis if truncated
      if (start > 0) snippet = '...' + snippet;
      if (end < textContent.length) snippet = snippet + '...';

      // Highlight the query using special markers
      const regex = new RegExp(`(${query})`, 'gi');
      snippet = snippet.replace(regex, '<<$1>>');

      return snippet;
    }

    // If query not found, return beginning of content
    const snippet = textContent.substring(0, maxLength);
    return snippet.length < textContent.length ? snippet + '...' : snippet;
  } catch (error) {
    // If parsing fails, return empty snippet
    return '';
  }
};

/**
 * Helper function to check if user has access to a module (prerequisites completed)
 *
 * @param moduleId - Module ID
 * @param userId - User ID
 * @returns True if user has access, false otherwise
 */
const hasModuleAccess = async (moduleId: string, userId: string): Promise<boolean> => {
  try {
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
  } catch (error) {
    console.error('Error checking module access:', error);
    return false;
  }
};

/**
 * Helper function to get user's completion status for a module or lesson
 *
 * @param userId - User ID
 * @param itemId - Module or Lesson ID
 * @param type - 'module' or 'lesson'
 * @returns Completion status
 */
const getCompletionStatus = async (
  userId: string,
  itemId: string,
  type: 'module' | 'lesson'
): Promise<'completed' | 'in_progress' | 'not_started'> => {
  try {
    if (type === 'module') {
      const progress = await prisma.learningProgress.findUnique({
        where: {
          userId_moduleId: {
            userId,
            moduleId: itemId,
          },
        },
        include: {
          lessonProgress: true,
        },
      });

      if (!progress) {
        return 'not_started';
      }

      if (progress.completedAt) {
        return 'completed';
      }

      // Check if any lessons are completed
      const hasProgress = progress.lessonProgress.some((lp) => lp.completed || lp.timeSpent > 0);
      return hasProgress ? 'in_progress' : 'not_started';
    } else {
      // For lessons, we need to find the learning progress first
      const lesson = await prisma.lesson.findUnique({
        where: { id: itemId },
        select: { moduleId: true },
      });

      if (!lesson) {
        return 'not_started';
      }

      const learningProgress = await prisma.learningProgress.findUnique({
        where: {
          userId_moduleId: {
            userId,
            moduleId: lesson.moduleId,
          },
        },
        include: {
          lessonProgress: {
            where: {
              lessonId: itemId,
            },
          },
        },
      });

      if (!learningProgress || learningProgress.lessonProgress.length === 0) {
        return 'not_started';
      }

      const lessonProgress = learningProgress.lessonProgress[0];
      if (lessonProgress.completed) {
        return 'completed';
      }

      return lessonProgress.timeSpent > 0 ? 'in_progress' : 'not_started';
    }
  } catch (error) {
    console.error('Error getting completion status:', error);
    return 'not_started';
  }
};

/**
 * Search for content across modules and lessons
 *
 * @param params - Search parameters including query, filters, pagination, and sorting
 * @returns Search results with pagination metadata
 */
export const searchContent = async (
  params: SearchContentParams
): Promise<SearchContentResult> => {
  try {
    const {
      query,
      filters,
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      sortBy = 'relevance',
      userId,
    } = params;

    // Validate query
    if (!query || query.trim().length === 0) {
      throw new AppError(
        'El término de búsqueda no puede estar vacío',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        true,
        ['Por favor, ingresa un término de búsqueda válido']
      );
    }

    if (query.trim().length < 2) {
      throw new AppError(
        'El término de búsqueda debe tener al menos 2 caracteres',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        true,
        ['Por favor, ingresa al menos 2 caracteres para buscar']
      );
    }

    // Validate and cap limit
    const validLimit = Math.min(limit, PAGINATION.MAX_LIMIT);

    // Build where clause for modules
    const moduleWhere: any = {
      isActive: true,
      OR: [
        {
          title: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: query,
            mode: 'insensitive',
          },
        },
      ],
    };

    // Apply category filter
    if (filters?.categories && filters.categories.length > 0) {
      moduleWhere.category = {
        in: filters.categories,
      };
    }

    // Apply difficulty filter
    if (filters?.difficulties && filters.difficulties.length > 0) {
      moduleWhere.difficulty = {
        in: filters.difficulties,
      };
    }

    // Apply duration filter
    if (filters?.durations && filters.durations.length > 0) {
      // Durations represent max minutes for ranges: [30, 60, 120]
      const maxDuration = Math.max(...filters.durations);
      moduleWhere.estimatedTime = {
        lte: maxDuration,
      };
    }

    // Search modules
    const modules = await prisma.module.findMany({
      where: moduleWhere,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        difficulty: true,
        estimatedTime: true,
        createdAt: true,
        _count: {
          select: {
            learningProgress: true,
          },
        },
      },
    });

    // Search lessons
    const lessonWhere: any = {
      module: {
        isActive: true,
      },
      OR: [
        {
          title: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          content: {
            contains: query,
            mode: 'insensitive',
          },
        },
      ],
    };

    // Apply filters for lessons based on parent module
    if (filters?.categories && filters.categories.length > 0) {
      lessonWhere.module = {
        ...lessonWhere.module,
        category: {
          in: filters.categories,
        },
      };
    }

    if (filters?.difficulties && filters.difficulties.length > 0) {
      lessonWhere.module = {
        ...lessonWhere.module,
        difficulty: {
          in: filters.difficulties,
        },
      };
    }

    if (filters?.durations && filters.durations.length > 0) {
      const maxDuration = Math.max(...filters.durations);
      lessonWhere.estimatedTime = {
        lte: maxDuration,
      };
    }

    const lessons = await prisma.lesson.findMany({
      where: lessonWhere,
      select: {
        id: true,
        title: true,
        content: true,
        estimatedTime: true,
        moduleId: true,
        createdAt: true,
        module: {
          select: {
            id: true,
            title: true,
            category: true,
            difficulty: true,
          },
        },
      },
    });

    // Process and score results
    const results: SearchResultItem[] = [];

    // Process modules
    for (const module of modules) {
      // Calculate relevance score
      const titleScore = calculateRelevanceScore(module.title, query, true);
      const descScore = module.description
        ? calculateRelevanceScore(module.description, query, false)
        : 0;
      const score = Math.max(titleScore, descScore);

      if (score === 0) continue;

      // Get completion status if userId provided
      let completedStatus: 'completed' | 'in_progress' | 'not_started' | undefined;
      if (userId) {
        completedStatus = await getCompletionStatus(userId, module.id, 'module');
      }

      // Create snippet from description
      const snippet = module.description
        ? extractSnippet(JSON.stringify({ sections: [{ content: module.description }] }), query)
        : module.title;

      results.push({
        type: 'module',
        id: module.id,
        title: module.title,
        snippet,
        difficulty: module.difficulty,
        estimatedTime: module.estimatedTime,
        completedStatus,
        category: module.category,
        score,
      });
    }

    // Process lessons
    for (const lesson of lessons) {
      // Skip if user doesn't have access to the parent module
      if (userId) {
        const hasAccess = await hasModuleAccess(lesson.moduleId, userId);
        if (!hasAccess) continue;
      }

      // Calculate relevance score
      const titleScore = calculateRelevanceScore(lesson.title, query, true);
      const contentScore = calculateRelevanceScore(lesson.content, query, false);
      const score = Math.max(titleScore, contentScore);

      if (score === 0) continue;

      // Get completion status if userId provided
      let completedStatus: 'completed' | 'in_progress' | 'not_started' | undefined;
      if (userId) {
        completedStatus = await getCompletionStatus(userId, lesson.id, 'lesson');
      }

      // Extract snippet from content
      const snippet = extractSnippet(lesson.content, query);

      results.push({
        type: 'lesson',
        id: lesson.id,
        title: lesson.title,
        snippet,
        difficulty: lesson.module.difficulty,
        estimatedTime: lesson.estimatedTime,
        completedStatus,
        parentModule: {
          id: lesson.module.id,
          title: lesson.module.title,
          category: lesson.module.category,
        },
        score,
      });
    }

    // Filter by status if requested
    let filteredResults = results;
    if (filters?.statuses && filters.statuses.length > 0 && userId) {
      filteredResults = results.filter((result) =>
        filters.statuses!.includes(result.completedStatus!)
      );
    }

    // Sort results
    switch (sortBy) {
      case 'relevance':
        filteredResults.sort((a, b) => b.score - a.score);
        break;
      case 'date':
        // Most recent first (already sorted by default from Prisma)
        break;
      case 'popularity':
        // For modules, use _count of learningProgress as popularity metric
        // For lessons, use parent module popularity
        filteredResults.sort((a, b) => {
          const aModule = a.type === 'module' ? modules.find((m) => m.id === a.id) : null;
          const bModule = b.type === 'module' ? modules.find((m) => m.id === b.id) : null;
          const aCount = aModule?._count.learningProgress || 0;
          const bCount = bModule?._count.learningProgress || 0;
          return bCount - aCount;
        });
        break;
      case 'duration':
        filteredResults.sort((a, b) => a.estimatedTime - b.estimatedTime);
        break;
    }

    // Apply pagination
    const total = filteredResults.length;
    const skip = (page - 1) * validLimit;
    const paginatedResults = filteredResults.slice(skip, skip + validLimit);

    // Log search for analytics (fire-and-forget, doesn't block response)
    logSearch({
      userId,
      query,
      filters,
      resultsCount: total,
      // sessionId can be passed from controller if available
    });

    return {
      results: paginatedResults,
      total,
      pagination: {
        page,
        limit: validLimit,
        totalPages: Math.ceil(total / validLimit),
      },
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Error in searchContent:', error);
    throw new AppError(
      'Error al realizar la búsqueda',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      true,
      ['Ocurrió un error al buscar contenido. Por favor, intenta nuevamente.']
    );
  }
};

/**
 * Get search suggestions for autocomplete functionality
 * Optimized for real-time search-as-you-type behavior
 *
 * @param query - Partial search query (at least 2 characters)
 * @param limit - Maximum number of suggestions (default 5)
 * @param userId - Optional user ID to personalize suggestions based on progress
 * @returns Array of search suggestions
 */
export const getSearchSuggestions = async (
  query: string,
  limit: number = 5,
  userId?: string
): Promise<SearchSuggestion[]> => {
  try {
    // Validate query length
    if (!query || query.trim().length < 2) {
      throw new AppError(
        'El término de búsqueda debe tener al menos 2 caracteres',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_INPUT,
        true,
        ['Por favor, ingresa al menos 2 caracteres para ver sugerencias']
      );
    }

    const trimmedQuery = query.trim();
    const suggestions: SearchSuggestion[] = [];

    // Get accessible module IDs if userId is provided
    let accessibleModuleIds: Set<string> | null = null;
    if (userId) {
      accessibleModuleIds = new Set<string>();

      // Get all modules
      const allModules = await prisma.module.findMany({
        where: { isActive: true },
        select: {
          id: true,
        },
      });

      // Check access for each module
      for (const module of allModules) {
        const hasAccess = await hasModuleAccess(module.id, userId);
        if (hasAccess) {
          accessibleModuleIds.add(module.id);
        }
      }
    }

    // Search modules (only fetch necessary fields for performance)
    const modules = await prisma.module.findMany({
      where: {
        isActive: true,
        title: {
          contains: trimmedQuery,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        title: true,
        category: true,
      },
      take: limit, // Limit at database level for performance
      orderBy: {
        title: 'asc', // Alphabetically
      },
    });

    // Add module suggestions with completion status
    for (const module of modules) {
      let completed: boolean | undefined;

      if (userId) {
        const progress = await prisma.learningProgress.findUnique({
          where: {
            userId_moduleId: {
              userId,
              moduleId: module.id,
            },
          },
          select: {
            completedAt: true,
          },
        });

        completed = !!progress?.completedAt;
      }

      suggestions.push({
        type: 'module',
        id: module.id,
        title: module.title,
        additionalInfo: {
          category: module.category,
          completed,
        },
      });
    }

    // Calculate remaining slots for lesson suggestions
    const remainingSlots = limit - suggestions.length;

    if (remainingSlots > 0) {
      // Build lesson where clause
      const lessonWhere: any = {
        title: {
          contains: trimmedQuery,
          mode: 'insensitive',
        },
        module: {
          isActive: true,
        },
      };

      // Filter by accessible modules if userId provided
      if (userId && accessibleModuleIds && accessibleModuleIds.size > 0) {
        lessonWhere.moduleId = {
          in: Array.from(accessibleModuleIds),
        };
      }

      // Search lessons (only fetch necessary fields)
      const lessons = await prisma.lesson.findMany({
        where: lessonWhere,
        select: {
          id: true,
          title: true,
          moduleId: true,
          module: {
            select: {
              id: true,
              category: true,
            },
          },
        },
        take: remainingSlots, // Limit at database level
        orderBy: {
          title: 'asc', // Alphabetically
        },
      });

      // Add lesson suggestions with completion status
      for (const lesson of lessons) {
        let completed: boolean | undefined;

        if (userId) {
          const status = await getCompletionStatus(userId, lesson.id, 'lesson');
          completed = status === 'completed';
        }

        suggestions.push({
          type: 'lesson',
          id: lesson.id,
          title: lesson.title,
          additionalInfo: {
            category: lesson.module.category,
            completed,
          },
        });
      }
    }

    // Sort suggestions: modules first, then lessons, maintaining alphabetical order within each type
    suggestions.sort((a, b) => {
      if (a.type === b.type) {
        return a.title.localeCompare(b.title);
      }
      return a.type === 'module' ? -1 : 1;
    });

    // Ensure we don't exceed the limit after combining results
    return suggestions.slice(0, limit);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error('Error in getSearchSuggestions:', error);
    throw new AppError(
      'Error al obtener sugerencias de búsqueda',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      true,
      ['Ocurrió un error al cargar las sugerencias. Por favor, intenta nuevamente.']
    );
  }
};

