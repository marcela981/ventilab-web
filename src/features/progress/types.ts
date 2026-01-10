/**
 * Tipos TypeScript para el sistema de progreso gamificado
 */

export interface UserProgress {
  xp: number;
  level: number;
  streak: number;
  totalLessonsCompleted: number;
  totalTimeSpent: number; // en minutos
}

export interface SkillNode {
  id: string;
  title: string;
  description: string;
  masteryLevel: 'locked' | 'beginner' | 'intermediate' | 'advanced' | 'master';
  dependencies: string[]; // IDs de nodos requeridos
  xpReward: number;
  progressPct?: number; // Porcentaje de progreso (0-100)
}

export interface ModuleMilestone {
  id: string;
  moduleId: string;
  title: string;
  icon?: string;
  progress: number; // 0-100
  completed: boolean;
  unlockedAt?: Date;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'lesson' | 'streak' | 'skill' | 'challenge' | 'special';
  unlocked: boolean;
  unlockedAt?: Date;
  hint?: string; // pista para logros bloqueados
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  // Progreso incremental (opcional)
  progress?: {
    current: number;
    target: number;
    percentage: number;
  };
}

export interface Challenge {
  id: string;
  type: 'daily' | 'weekly';
  title: string;
  description: string;
  duration: number; // en minutos
  xpReward: number;
  completed: boolean;
  deadline?: Date;
  progress?: number; // 0-100
}

export interface BossFight {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  stars: 0 | 1 | 2 | 3; // 0 = no completado
  completedAt?: Date;
  moduleId: string;
  // Detalles de las estrellas
  starSecurity?: boolean; // Estrella de seguridad
  starEfficacy?: boolean; // Estrella de eficacia
  starExplanation?: boolean; // Estrella de explicación
  // Estadísticas
  attempts?: number; // Número de intentos
  bestScore?: number; // Mejor puntuación (0-100)
  // Estado bloqueado
  locked?: boolean; // Si está bloqueado
  lockHint?: string; // Pista para desbloquear
}

export interface ErrorTrend {
  topic: string;
  errorCount: number;
  lastErrorDate: Date;
  improvementRate: number; // porcentaje de mejora
}

export interface TrendInsight {
  conceptId: string;
  conceptName: string; // Nombre del concepto/tópico
  incorrectRatePct: number; // Porcentaje de tasa de error (0-100)
  attempts?: number; // Número de intentos
  lastAttemptDate?: Date; // Fecha del último intento
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar?: string;
  xp: number;
  level: number;
  rank: number;
}

export interface LeaderboardSlice {
  personalBest?: LeaderboardEntry; // Mejor marca personal
  cohortPercentile?: number; // Percentil en la cohorte (0-100)
  cohortSize?: number; // Tamaño de la cohorte
  isOptedIn?: boolean; // Si el usuario optó por aparecer en el leaderboard
}

export interface StudySession {
  date: Date;
  duration: number; // en minutos
  lessonsCompleted: number;
}

export interface NextStep {
  moduleId: string;
  moduleTitle: string;
  lessonId?: string;
  lessonTitle?: string;
  type: 'lesson' | 'quiz' | 'practice';
}

export interface Feedback {
  type: 'up' | 'back' | 'forward';
  message: string;
  action?: () => void;
}

export interface NarrativeEvent {
  level: number;
  title: string;
  description: string;
  role: string; // ej: "Aprendiz", "Experto", "Maestro"
}

export interface StreakInfo {
  streak: number;
  lastSessionDate: string | null;
  isActive: boolean;
  longestStreak?: number; // Racha más larga alcanzada
  hasFreezeToken?: boolean; // Si tiene comodín disponible
}

export interface TodayOverview {
  xpToday: number;
  level: number;
  roleSubtitle: string; // ej: "Aprendiz", "Experto", "Maestro"
  nextStep?: {
    title: string;
    duration: number; // en minutos
    xpReward: number;
  };
}

export interface StudyEta {
  completionDate: Date | string; // Fecha estimada de finalización del módulo
  moduleId?: string;
  moduleTitle?: string;
}

