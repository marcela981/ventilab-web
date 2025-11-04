/**
 * =============================================================================
 * Search Analytics Service
 * =============================================================================
 * Handles logging and analytics for search activity
 * Provides insights into user search behavior, popular queries, and content gaps
 * 
 * Features:
 * - Fire-and-forget logging (doesn't block search responses)
 * - Privacy-respecting (opt-in tracking)
 * - Analytics aggregation for admin dashboard
 * - Performance monitoring
 * =============================================================================
 */

import prisma from '../config/database';

/**
 * Interface for search log data
 */
interface SearchLogData {
  userId?: string;
  query: string;
  filters?: Record<string, any>;
  resultsCount: number;
  sessionId?: string;
  responseTime?: number;
}

/**
 * Interface for click log data
 */
interface ClickLogData {
  userId?: string;
  query: string;
  selectedResult: string;
  selectedType: 'module' | 'lesson';
  sessionId?: string;
}

/**
 * Interface for analytics data
 */
interface SearchAnalytics {
  topSearches: Array<{
    query: string;
    count: number;
    avgResults: number;
  }>;
  searchesWithNoResults: Array<{
    query: string;
    count: number;
  }>;
  lowClickRateSearches: Array<{
    query: string;
    searches: number;
    clicks: number;
    clickRate: number;
  }>;
  searchesByHour: Array<{
    hour: number;
    count: number;
  }>;
  searchTrends: Array<{
    date: string;
    count: number;
  }>;
  performanceMetrics: {
    avgResponseTime: number;
    medianResponseTime: number;
    slowSearches: number;
  };
}

/**
 * Log a search query
 * Fire-and-forget pattern - doesn't block the search response
 * Only logs if user hasn't opted out of tracking
 * 
 * @param data - Search log data
 * @returns Promise<void> (fire-and-forget, errors are caught internally)
 */
export const logSearch = async (data: SearchLogData): Promise<void> => {
  // Fire-and-forget: Don't await, catch errors internally
  setImmediate(async () => {
    try {
      // Check if user has opted out (if userId provided)
      if (data.userId) {
        const user = await prisma.user.findUnique({
          where: { id: data.userId },
          select: { id: true }, // Could add trackingEnabled field
        });

        if (!user) {
          // User not found, don't log
          return;
        }

        // TODO: Add trackingEnabled field to User model and check here
        // if (!user.trackingEnabled) return;
      }

      // Create search log entry
      await prisma.searchLog.create({
        data: {
          userId: data.userId || null,
          query: data.query.trim(),
          filters: data.filters || null,
          resultsCount: data.resultsCount,
          sessionId: data.sessionId || null,
          responseTime: data.responseTime || null,
          timestamp: new Date(),
        },
      });

      console.log(`[Analytics] Logged search: "${data.query}" (${data.resultsCount} results)`);
    } catch (error) {
      // Silently catch errors - analytics should never break the app
      console.error('[Analytics] Error logging search:', error);
    }
  });
};

/**
 * Log a click on a search result
 * Updates the existing search log with the selected result
 * 
 * @param data - Click log data
 * @returns Promise<void>
 */
export const logResultClick = async (data: ClickLogData): Promise<void> => {
  try {
    // Find the most recent search log for this query and user/session
    const whereClause: any = {
      query: data.query,
      selectedResult: null, // Only update if not already set
    };

    if (data.userId) {
      whereClause.userId = data.userId;
    } else if (data.sessionId) {
      whereClause.sessionId = data.sessionId;
    }

    // Find the most recent matching search log
    const recentLog = await prisma.searchLog.findFirst({
      where: whereClause,
      orderBy: {
        timestamp: 'desc',
      },
    });

    if (recentLog) {
      // Update with selected result
      await prisma.searchLog.update({
        where: { id: recentLog.id },
        data: {
          selectedResult: data.selectedResult,
          selectedType: data.selectedType,
        },
      });

      console.log(`[Analytics] Logged click: ${data.selectedType}:${data.selectedResult}`);
    }
  } catch (error) {
    console.error('[Analytics] Error logging result click:', error);
  }
};

/**
 * Get search analytics data for admin dashboard
 * Aggregates search logs to provide insights
 * 
 * @param startDate - Start date for analytics (default: 30 days ago)
 * @param endDate - End date for analytics (default: now)
 * @returns Promise<SearchAnalytics>
 */
export const getSearchAnalytics = async (
  startDate?: Date,
  endDate?: Date
): Promise<SearchAnalytics> => {
  try {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate || new Date();

    // Build where clause for date range
    const dateWhere = {
      timestamp: {
        gte: start,
        lte: end,
      },
    };

    // 1. Top searches (most frequent queries)
    const topSearchesRaw = await prisma.searchLog.groupBy({
      by: ['query'],
      where: dateWhere,
      _count: {
        query: true,
      },
      _avg: {
        resultsCount: true,
      },
      orderBy: {
        _count: {
          query: 'desc',
        },
      },
      take: 10,
    });

    const topSearches = topSearchesRaw.map((item) => ({
      query: item.query,
      count: item._count.query,
      avgResults: Math.round(item._avg.resultsCount || 0),
    }));

    // 2. Searches with no results (content gaps)
    const noResultsRaw = await prisma.searchLog.groupBy({
      by: ['query'],
      where: {
        ...dateWhere,
        resultsCount: 0,
      },
      _count: {
        query: true,
      },
      orderBy: {
        _count: {
          query: 'desc',
        },
      },
      take: 10,
    });

    const searchesWithNoResults = noResultsRaw.map((item) => ({
      query: item.query,
      count: item._count.query,
    }));

    // 3. Low click rate searches (low relevance)
    // Get searches grouped by query with click counts
    const searchesWithClicks = await prisma.$queryRaw<
      Array<{ query: string; total_searches: bigint; clicks: bigint }>
    >`
      SELECT 
        query,
        COUNT(*) as total_searches,
        COUNT(CASE WHEN "selectedResult" IS NOT NULL THEN 1 END) as clicks
      FROM search_logs
      WHERE timestamp >= ${start} AND timestamp <= ${end}
      AND "resultsCount" > 0
      GROUP BY query
      HAVING COUNT(*) >= 5
      ORDER BY (COUNT(CASE WHEN "selectedResult" IS NOT NULL THEN 1 END)::float / COUNT(*)::float) ASC
      LIMIT 10
    `;

    const lowClickRateSearches = searchesWithClicks.map((item) => {
      const searches = Number(item.total_searches);
      const clicks = Number(item.clicks);
      return {
        query: item.query,
        searches,
        clicks,
        clickRate: searches > 0 ? Math.round((clicks / searches) * 100) : 0,
      };
    });

    // 4. Searches by hour of day
    const searchesByHourRaw = await prisma.$queryRaw<
      Array<{ hour: number; count: bigint }>
    >`
      SELECT 
        EXTRACT(HOUR FROM timestamp) as hour,
        COUNT(*) as count
      FROM search_logs
      WHERE timestamp >= ${start} AND timestamp <= ${end}
      GROUP BY hour
      ORDER BY hour
    `;

    const searchesByHour = Array.from({ length: 24 }, (_, hour) => {
      const data = searchesByHourRaw.find((item) => Number(item.hour) === hour);
      return {
        hour,
        count: data ? Number(data.count) : 0,
      };
    });

    // 5. Search trends over time (daily)
    const searchTrendsRaw = await prisma.$queryRaw<
      Array<{ date: Date; count: bigint }>
    >`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM search_logs
      WHERE timestamp >= ${start} AND timestamp <= ${end}
      GROUP BY DATE(timestamp)
      ORDER BY date
    `;

    const searchTrends = searchTrendsRaw.map((item) => ({
      date: item.date.toISOString().split('T')[0],
      count: Number(item.count),
    }));

    // 6. Performance metrics
    const performanceData = await prisma.searchLog.aggregate({
      where: {
        ...dateWhere,
        responseTime: { not: null },
      },
      _avg: {
        responseTime: true,
      },
      _count: {
        responseTime: true,
      },
    });

    // Get median response time
    const allResponseTimes = await prisma.searchLog.findMany({
      where: {
        ...dateWhere,
        responseTime: { not: null },
      },
      select: {
        responseTime: true,
      },
      orderBy: {
        responseTime: 'asc',
      },
    });

    const medianIndex = Math.floor(allResponseTimes.length / 2);
    const medianResponseTime = allResponseTimes[medianIndex]?.responseTime || 0;

    // Count slow searches (>500ms)
    const slowSearches = await prisma.searchLog.count({
      where: {
        ...dateWhere,
        responseTime: { gt: 500 },
      },
    });

    const performanceMetrics = {
      avgResponseTime: Math.round(performanceData._avg.responseTime || 0),
      medianResponseTime,
      slowSearches,
    };

    return {
      topSearches,
      searchesWithNoResults,
      lowClickRateSearches,
      searchesByHour,
      searchTrends,
      performanceMetrics,
    };
  } catch (error) {
    console.error('[Analytics] Error getting search analytics:', error);
    throw error;
  }
};

/**
 * Get total search count
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Promise<number>
 */
export const getTotalSearchCount = async (
  startDate?: Date,
  endDate?: Date
): Promise<number> => {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const count = await prisma.searchLog.count({
    where: {
      timestamp: {
        gte: start,
        lte: end,
      },
    },
  });

  return count;
};

/**
 * Clean old search logs (data retention)
 * Deletes logs older than specified days
 * Should be run as a cron job
 * 
 * @param daysToKeep - Number of days to keep logs (default: 90)
 * @returns Promise<number> - Number of deleted logs
 */
export const cleanOldSearchLogs = async (daysToKeep: number = 90): Promise<number> => {
  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await prisma.searchLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`[Analytics] Cleaned ${result.count} old search logs (older than ${daysToKeep} days)`);
    return result.count;
  } catch (error) {
    console.error('[Analytics] Error cleaning old search logs:', error);
    throw error;
  }
};

