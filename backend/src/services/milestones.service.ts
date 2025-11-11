/**
 * Milestones Service
 * Generates milestones based on progress thresholds and business rules
 */

import prisma from '../config/database';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface Milestone {
  id: string;
  title: string;
  description: string;
  progress: number; // 0-1
  completedAt?: string; // ISO 8601 string
  icon?: string;
}

// =============================================================================
// MILESTONE DEFINITIONS
// =============================================================================

interface MilestoneDefinition {
  id: string;
  title: string;
  description: string;
  icon?: string;
  calculateProgress: (stats: UserProgressStats) => number;
  isCompleted: (stats: UserProgressStats) => boolean;
  getCompletedAt?: (stats: UserProgressStats) => Date | null;
}

interface UserProgressStats {
  completedLessons: number;
  totalLessons: number;
  completedModules: number;
  totalModules: number;
  streakDays: number;
  xpTotal: number;
  moduleProgressMap: Map<string, number>; // moduleId -> progress (0-1)
}

// =============================================================================
// MILESTONE CALCULATORS
// =============================================================================

/**
 * Milestone definitions with their calculation logic
 */
const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  // Progress milestones
  {
    id: 'milestone-first-lesson',
    title: 'Primera Lección Completada',
    description: 'Completa tu primera lección',
    icon: '🎓',
    calculateProgress: (stats) => Math.min(stats.completedLessons / 1, 1),
    isCompleted: (stats) => stats.completedLessons >= 1,
    getCompletedAt: (stats) => stats.completedLessons >= 1 ? new Date() : null
  },
  {
    id: 'milestone-three-lessons',
    title: 'Tres Lecciones Completadas',
    description: 'Completa 3 lecciones del curso',
    icon: '⭐',
    calculateProgress: (stats) => Math.min(stats.completedLessons / 3, 1),
    isCompleted: (stats) => stats.completedLessons >= 3
  },
  {
    id: 'milestone-module-1-complete',
    title: 'Módulo 1 Completado',
    description: 'Termina todas las lecciones del Módulo 1',
    icon: '📚',
    calculateProgress: (stats) => {
      // Assuming module-1 or similar ID exists
      const module1Progress = stats.moduleProgressMap.get('module-1') || 0;
      return module1Progress;
    },
    isCompleted: (stats) => {
      const module1Progress = stats.moduleProgressMap.get('module-1') || 0;
      return module1Progress >= 1.0;
    }
  },
  // Consistency milestones
  {
    id: 'milestone-streak-7',
    title: 'Racha de 7 Días',
    description: 'Mantén una racha de estudio de 7 días consecutivos',
    icon: '🔥',
    calculateProgress: (stats) => Math.min(stats.streakDays / 7, 1),
    isCompleted: (stats) => stats.streakDays >= 7
  },
  {
    id: 'milestone-streak-14',
    title: 'Racha de 14 Días',
    description: 'Mantén una racha de estudio de 14 días consecutivos',
    icon: '🔥🔥',
    calculateProgress: (stats) => Math.min(stats.streakDays / 14, 1),
    isCompleted: (stats) => stats.streakDays >= 14
  },
  // Mastery milestone
  {
    id: 'milestone-mastery-critical',
    title: 'Maestría en Módulo Crítico',
    description: 'Alcanza ≥85% de promedio en un módulo crítico',
    icon: '🏆',
    calculateProgress: (stats) => {
      // Find highest progress module that's ≥ 0.85
      let maxProgress = 0;
      for (const progress of stats.moduleProgressMap.values()) {
        if (progress >= 0.85 && progress > maxProgress) {
          maxProgress = progress;
        }
      }
      return Math.min(maxProgress / 0.85, 1); // Normalize to 0-1
    },
    isCompleted: (stats) => {
      for (const progress of stats.moduleProgressMap.values()) {
        if (progress >= 0.85) {
          return true;
        }
      }
      return false;
    }
  }
];

// =============================================================================
// MAIN SERVICE FUNCTIONS
// =============================================================================

/**
 * Get all milestones for a user with progress
 * 
 * @param userId - User ID
 * @returns Array of Milestone with progress
 */
export async function getUserMilestones(userId: string): Promise<Milestone[]> {
  // Get user progress stats
  const stats = await getUserProgressStats(userId);

  // Calculate milestones
  const milestones: Milestone[] = MILESTONE_DEFINITIONS.map(def => {
    const progress = def.calculateProgress(stats);
    const completed = def.isCompleted(stats);
    const completedAt = completed && def.getCompletedAt
      ? def.getCompletedAt(stats)?.toISOString()
      : undefined;

    return {
      id: def.id,
      title: def.title,
      description: def.description,
      progress: Math.max(0, Math.min(1, progress)), // Clamp to 0-1
      completedAt,
      icon: def.icon
    };
  });

  // Sort: active (not completed) first, then completed
  milestones.sort((a, b) => {
    const aCompleted = a.completedAt !== undefined;
    const bCompleted = b.completedAt !== undefined;
    
    if (aCompleted === bCompleted) {
      // Both same status, sort by progress descending
      return b.progress - a.progress;
    }
    
    // Active (not completed) comes first
    return aCompleted ? 1 : -1;
  });

  return milestones;
}

/**
 * Get user progress stats for milestone calculations
 * 
 * @param userId - User ID
 * @returns UserProgressStats object
 */
async function getUserProgressStats(userId: string): Promise<UserProgressStats> {
  // Get all modules
  const allModules = await prisma.module.findMany({
    where: { isActive: true },
    select: { id: true }
  });

  // Get all lessons
  const allLessons = await prisma.lesson.findMany({
    select: { id: true }
  });

  // Get user's learning progress
  const userProgress = await prisma.learningProgress.findMany({
    where: { userId },
    include: {
      lessonProgress: {
        where: { completed: true },
        select: { lessonId: true }
      },
      module: {
        select: { id: true }
      }
    }
  });

  // Calculate completed lessons
  const completedLessons = userProgress.reduce(
    (sum, lp) => sum + lp.lessonProgress.length,
    0
  );

  // Calculate completed modules
  const completedModules = userProgress.filter(p => p.completedAt !== null).length;

  // Get streak (from learning sessions)
  const sessions = await prisma.learningSession.findMany({
    where: { userId },
    orderBy: { startTime: 'desc' },
    select: { startTime: true }
  });

  const streakDays = calculateStreak(sessions);

  // Calculate XP (assuming 100 XP per completed lesson)
  const xpTotal = completedLessons * 100;

  // Build module progress map
  const moduleProgressMap = new Map<string, number>();
  for (const lp of userProgress) {
    const moduleId = lp.moduleId;
    
    // Get total lessons for this module
    const moduleLessons = await prisma.lesson.findMany({
      where: { moduleId },
      select: { id: true }
    });
    
    const totalLessons = moduleLessons.length;
    const completedLessonsInModule = lp.lessonProgress.length;
    
    const progress = totalLessons > 0
      ? completedLessonsInModule / totalLessons
      : 0;
    
    moduleProgressMap.set(moduleId, progress);
  }

  return {
    completedLessons,
    totalLessons: allLessons.length,
    completedModules,
    totalModules: allModules.length,
    streakDays,
    xpTotal,
    moduleProgressMap
  };
}

/**
 * Calculate streak from learning sessions
 * 
 * @param sessions - Array of learning sessions ordered by startTime DESC
 * @returns Number of consecutive days
 */
function calculateStreak(sessions: Array<{ startTime: Date }>): number {
  if (!sessions || sessions.length === 0) {
    return 0;
  }

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Group sessions by day
  const sessionsByDay = new Set<string>();
  sessions.forEach(session => {
    const sessionDate = new Date(session.startTime);
    sessionDate.setHours(0, 0, 0, 0);
    const dateKey = sessionDate.toISOString().split('T')[0];
    sessionsByDay.add(dateKey);
  });

  // Count consecutive days from today backwards
  let currentDate = new Date(today);
  
  // Check if there's a session today or yesterday to start the streak
  const todayKey = currentDate.toISOString().split('T')[0];
  currentDate.setDate(currentDate.getDate() - 1);
  const yesterdayKey = currentDate.toISOString().split('T')[0];

  if (!sessionsByDay.has(todayKey) && !sessionsByDay.has(yesterdayKey)) {
    return 0; // Streak is broken
  }

  // Start counting from today or yesterday
  currentDate = new Date(today);
  if (!sessionsByDay.has(todayKey)) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  while (true) {
    const dateKey = currentDate.toISOString().split('T')[0];
    
    if (sessionsByDay.has(dateKey)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break; // Streak is broken
    }
  }

  return streak;
}

