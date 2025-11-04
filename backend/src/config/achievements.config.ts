// =============================================================================
// VentyLab Achievement System Configuration
// =============================================================================
// This file contains the complete configuration for all achievement types
// in the gamification system. Each achievement is defined with its metadata,
// visual properties, point values, and unlock conditions.
// =============================================================================

/**
 * Achievement rarity levels - determines visual styling and perceived value
 * COMMON: Easy to obtain, basic achievements
 * RARE: Moderately difficult, requires consistent effort
 * EPIC: Very difficult, prestigious achievements
 */
export type AchievementRarity = 'COMMON' | 'RARE' | 'EPIC';

/**
 * Achievement categories - groups achievements by theme/purpose
 * INICIO: First steps and initial exploration
 * PROGRESO: Learning progress and completion milestones
 * CONSISTENCIA: Consistency and study habits
 * EXCELENCIA: Excellence in performance and mastery
 * ESPECIAL: Special achievements for unique actions
 */
export type AchievementCategory = 'INICIO' | 'PROGRESO' | 'CONSISTENCIA' | 'EXCELENCIA' | 'ESPECIAL';

/**
 * Complete achievement definition with all metadata
 * @interface AchievementDefinition
 */
export interface AchievementDefinition {
  /** Type identifier matching the AchievementType enum in Prisma schema */
  type: string;
  
  /** Display title in Spanish for the achievement */
  title: string;
  
  /** Detailed description explaining how to unlock this achievement */
  description: string;
  
  /** Material Icons name or custom icon path */
  icon: string;
  
  /** Points awarded when unlocked (10-100 based on difficulty) */
  points: number;
  
  /** Rarity level determining visual styling */
  rarity: AchievementRarity;
  
  /** Category for grouping and filtering achievements */
  category: AchievementCategory;
  
  /** Human-readable condition or criteria for unlocking (for display purposes) */
  condition: string;
}

/**
 * Complete achievement definitions mapped by achievement type
 * This object serves as the single source of truth for all achievement metadata
 */
export const ACHIEVEMENT_DEFINITIONS: Record<string, AchievementDefinition> = {
  // =============================================================================
  // INICIO - First Steps & Exploration
  // =============================================================================
  
  FIRST_LESSON: {
    type: 'FIRST_LESSON',
    title: 'Primera Lección',
    description: 'Completa tu primera lección en VentyLab',
    icon: 'school',
    points: 10,
    rarity: 'COMMON',
    category: 'INICIO',
    condition: 'Completar 1 lección'
  },
  
  FIRST_MODULE: {
    type: 'FIRST_MODULE',
    title: 'Primer Módulo',
    description: 'Completa tu primer módulo completo de aprendizaje',
    icon: 'library_books',
    points: 25,
    rarity: 'COMMON',
    category: 'INICIO',
    condition: 'Completar 1 módulo'
  },
  
  EXPLORING: {
    type: 'EXPLORING',
    title: 'Explorador Curioso',
    description: 'Accede a 5 lecciones diferentes para conocer el contenido',
    icon: 'explore',
    points: 15,
    rarity: 'COMMON',
    category: 'INICIO',
    condition: 'Acceder a 5 lecciones diferentes'
  },
  
  // =============================================================================
  // PROGRESO - Lesson Completion Milestones
  // =============================================================================
  
  LESSONS_10: {
    type: 'LESSONS_10',
    title: 'Aprendiz Dedicado',
    description: 'Completa 10 lecciones en total',
    icon: 'emoji_events',
    points: 30,
    rarity: 'COMMON',
    category: 'PROGRESO',
    condition: 'Completar 10 lecciones'
  },
  
  LESSONS_25: {
    type: 'LESSONS_25',
    title: 'Estudiante Comprometido',
    description: 'Completa 25 lecciones en total',
    icon: 'workspace_premium',
    points: 50,
    rarity: 'RARE',
    category: 'PROGRESO',
    condition: 'Completar 25 lecciones'
  },
  
  LESSONS_50: {
    type: 'LESSONS_50',
    title: 'Maestro del Conocimiento',
    description: 'Completa 50 lecciones en total',
    icon: 'military_tech',
    points: 75,
    rarity: 'EPIC',
    category: 'PROGRESO',
    condition: 'Completar 50 lecciones'
  },
  
  // =============================================================================
  // PROGRESO - Specific Module Completion
  // =============================================================================
  
  MODULE_COMPLETE: {
    type: 'MODULE_COMPLETE',
    title: 'Módulo Completado',
    description: 'Completa cualquier módulo del curso',
    icon: 'check_circle',
    points: 20,
    rarity: 'COMMON',
    category: 'PROGRESO',
    condition: 'Completar cualquier módulo'
  },
  
  MODULE_FUNDAMENTALS: {
    type: 'MODULE_FUNDAMENTALS',
    title: 'Fundamentos Dominados',
    description: 'Completa el módulo de Fundamentos de Ventilación Mecánica',
    icon: 'foundation',
    points: 35,
    rarity: 'RARE',
    category: 'PROGRESO',
    condition: 'Completar el módulo de Fundamentos'
  },
  
  MODULE_VENTILATION: {
    type: 'MODULE_VENTILATION',
    title: 'Experto en Ventilación',
    description: 'Completa el módulo de Principios de Ventilación',
    icon: 'air',
    points: 40,
    rarity: 'RARE',
    category: 'PROGRESO',
    condition: 'Completar el módulo de Ventilación'
  },
  
  MODULE_CLINICAL: {
    type: 'MODULE_CLINICAL',
    title: 'Aplicación Clínica',
    description: 'Completa el módulo de Aplicaciones Clínicas',
    icon: 'local_hospital',
    points: 45,
    rarity: 'RARE',
    category: 'PROGRESO',
    condition: 'Completar el módulo de Aplicaciones Clínicas'
  },
  
  MODULE_ADVANCED: {
    type: 'MODULE_ADVANCED',
    title: 'Técnicas Avanzadas',
    description: 'Completa el módulo de Técnicas Avanzadas de Ventilación',
    icon: 'biotech',
    points: 50,
    rarity: 'RARE',
    category: 'PROGRESO',
    condition: 'Completar el módulo de Técnicas Avanzadas'
  },
  
  // =============================================================================
  // PROGRESO - Level Mastery
  // =============================================================================
  
  ALL_BEGINNER: {
    type: 'ALL_BEGINNER',
    title: 'Principiante Completo',
    description: 'Completa todos los módulos de nivel Principiante',
    icon: 'school',
    points: 60,
    rarity: 'RARE',
    category: 'PROGRESO',
    condition: 'Completar todos los módulos de nivel Principiante'
  },
  
  ALL_INTERMEDIATE: {
    type: 'ALL_INTERMEDIATE',
    title: 'Intermedio Avanzado',
    description: 'Completa todos los módulos de nivel Intermedio',
    icon: 'stars',
    points: 75,
    rarity: 'EPIC',
    category: 'PROGRESO',
    condition: 'Completar todos los módulos de nivel Intermedio'
  },
  
  ALL_ADVANCED: {
    type: 'ALL_ADVANCED',
    title: 'Experto Avanzado',
    description: 'Completa todos los módulos de nivel Avanzado',
    icon: 'verified',
    points: 90,
    rarity: 'EPIC',
    category: 'PROGRESO',
    condition: 'Completar todos los módulos de nivel Avanzado'
  },
  
  COMPLETE_KNOWLEDGE: {
    type: 'COMPLETE_KNOWLEDGE',
    title: 'Conocimiento Total',
    description: 'Completa todos los módulos disponibles en VentyLab',
    icon: 'emoji_objects',
    points: 100,
    rarity: 'EPIC',
    category: 'PROGRESO',
    condition: 'Completar todos los módulos de la plataforma'
  },
  
  MASTER_LEVEL: {
    type: 'MASTER_LEVEL',
    title: 'Maestro VentyLab',
    description: 'Alcanza el nivel de maestría en tu viaje de aprendizaje',
    icon: 'auto_awesome',
    points: 100,
    rarity: 'EPIC',
    category: 'PROGRESO',
    condition: 'Alcanzar el nivel Maestro'
  },
  
  // =============================================================================
  // CONSISTENCIA - Learning Streaks
  // =============================================================================
  
  STREAK_3_DAYS: {
    type: 'STREAK_3_DAYS',
    title: 'Inicio de Racha',
    description: 'Estudia durante 3 días consecutivos',
    icon: 'local_fire_department',
    points: 20,
    rarity: 'COMMON',
    category: 'CONSISTENCIA',
    condition: 'Estudiar 3 días consecutivos'
  },
  
  STREAK_7_DAYS: {
    type: 'STREAK_7_DAYS',
    title: 'Racha Semanal',
    description: 'Mantén una racha de estudio de 7 días consecutivos',
    icon: 'local_fire_department',
    points: 40,
    rarity: 'RARE',
    category: 'CONSISTENCIA',
    condition: 'Estudiar 7 días consecutivos'
  },
  
  STREAK_30_DAYS: {
    type: 'STREAK_30_DAYS',
    title: 'Racha Imparable',
    description: 'Mantén una racha de estudio de 30 días consecutivos',
    icon: 'whatshot',
    points: 100,
    rarity: 'EPIC',
    category: 'CONSISTENCIA',
    condition: 'Estudiar 30 días consecutivos'
  },
  
  // =============================================================================
  // CONSISTENCIA - Time-Based Learning Habits
  // =============================================================================
  
  MORNING_LEARNER: {
    type: 'MORNING_LEARNER',
    title: 'Madrugador Estudioso',
    description: 'Estudia antes de las 7:00 AM y aprovecha la mañana',
    icon: 'wb_sunny',
    points: 25,
    rarity: 'COMMON',
    category: 'CONSISTENCIA',
    condition: 'Estudiar antes de las 7:00 AM'
  },
  
  NIGHT_OWL: {
    type: 'NIGHT_OWL',
    title: 'Búho Nocturno',
    description: 'Estudia después de las 10:00 PM durante la noche',
    icon: 'nightlight',
    points: 25,
    rarity: 'COMMON',
    category: 'CONSISTENCIA',
    condition: 'Estudiar después de las 10:00 PM'
  },
  
  DEDICATED_STUDENT: {
    type: 'DEDICATED_STUDENT',
    title: 'Estudiante Dedicado',
    description: 'Demuestra dedicación constante en tu aprendizaje',
    icon: 'volunteer_activism',
    points: 50,
    rarity: 'RARE',
    category: 'CONSISTENCIA',
    condition: 'Mostrar dedicación consistente al aprendizaje'
  },
  
  // =============================================================================
  // EXCELENCIA - Quiz Excellence & Performance
  // =============================================================================
  
  PERFECT_QUIZ: {
    type: 'PERFECT_QUIZ',
    title: 'Quiz Perfecto',
    description: 'Obtén un 100% de aciertos en un quiz',
    icon: 'grade',
    points: 20,
    rarity: 'COMMON',
    category: 'EXCELENCIA',
    condition: 'Obtener 100% en un quiz'
  },
  
  FIVE_PERFECT_QUIZZES: {
    type: 'FIVE_PERFECT_QUIZZES',
    title: 'Perfección Absoluta',
    description: 'Obtén 100% en 5 quizzes consecutivos',
    icon: 'stars',
    points: 80,
    rarity: 'EPIC',
    category: 'EXCELENCIA',
    condition: 'Obtener 100% en 5 quizzes consecutivos'
  },
  
  SPEED_LEARNER: {
    type: 'SPEED_LEARNER',
    title: 'Aprendiz Veloz',
    description: 'Completa lecciones más rápido que el tiempo estimado',
    icon: 'flash_on',
    points: 35,
    rarity: 'RARE',
    category: 'EXCELENCIA',
    condition: 'Completar lecciones más rápido que el tiempo estimado'
  },
  
  // =============================================================================
  // ESPECIAL - Review & Practice
  // =============================================================================
  
  REVIEWING_PRO: {
    type: 'REVIEWING_PRO',
    title: 'Maestro del Repaso',
    description: 'Revisa 10 lecciones que ya habías completado anteriormente',
    icon: 'refresh',
    points: 40,
    rarity: 'RARE',
    category: 'ESPECIAL',
    condition: 'Revisar 10 lecciones completadas'
  },
  
  // =============================================================================
  // ESPECIAL - Platform Engagement
  // =============================================================================
  
  CURIOUS_SEARCHER: {
    type: 'CURIOUS_SEARCHER',
    title: 'Buscador Curioso',
    description: 'Utiliza la función de búsqueda 20 veces',
    icon: 'search',
    points: 30,
    rarity: 'RARE',
    category: 'ESPECIAL',
    condition: 'Usar la búsqueda 20 veces'
  },
  
  FEEDBACK_CONTRIBUTOR: {
    type: 'FEEDBACK_CONTRIBUTOR',
    title: 'Contribuidor Activo',
    description: 'Contribuye con retroalimentación para mejorar la plataforma',
    icon: 'feedback',
    points: 45,
    rarity: 'RARE',
    category: 'ESPECIAL',
    condition: 'Contribuir con feedback al sistema'
  }
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get achievement definition by type
 * @param type - Achievement type from AchievementType enum
 * @returns Achievement definition or undefined if not found
 */
export const getAchievementDefinition = (type: string): AchievementDefinition | undefined => {
  return ACHIEVEMENT_DEFINITIONS[type];
};

/**
 * Get all achievements by category
 * @param category - Achievement category to filter by
 * @returns Array of achievement definitions
 */
export const getAchievementsByCategory = (category: AchievementCategory): AchievementDefinition[] => {
  return Object.values(ACHIEVEMENT_DEFINITIONS).filter(
    achievement => achievement.category === category
  );
};

/**
 * Get all achievements by rarity
 * @param rarity - Achievement rarity to filter by
 * @returns Array of achievement definitions
 */
export const getAchievementsByRarity = (rarity: AchievementRarity): AchievementDefinition[] => {
  return Object.values(ACHIEVEMENT_DEFINITIONS).filter(
    achievement => achievement.rarity === rarity
  );
};

/**
 * Get all achievement types as array
 * @returns Array of all achievement type strings
 */
export const getAllAchievementTypes = (): string[] => {
  return Object.keys(ACHIEVEMENT_DEFINITIONS);
};

/**
 * Calculate total possible points from all achievements
 * @returns Total points available
 */
export const getTotalPossiblePoints = (): number => {
  return Object.values(ACHIEVEMENT_DEFINITIONS).reduce(
    (total, achievement) => total + achievement.points,
    0
  );
};

// =============================================================================
// Export Summary Statistics
// =============================================================================

/**
 * Summary statistics about the achievement system
 */
export const ACHIEVEMENT_STATS = {
  total: Object.keys(ACHIEVEMENT_DEFINITIONS).length,
  byRarity: {
    COMMON: getAchievementsByRarity('COMMON').length,
    RARE: getAchievementsByRarity('RARE').length,
    EPIC: getAchievementsByRarity('EPIC').length
  },
  byCategory: {
    INICIO: getAchievementsByCategory('INICIO').length,
    PROGRESO: getAchievementsByCategory('PROGRESO').length,
    CONSISTENCIA: getAchievementsByCategory('CONSISTENCIA').length,
    EXCELENCIA: getAchievementsByCategory('EXCELENCIA').length,
    ESPECIAL: getAchievementsByCategory('ESPECIAL').length
  },
  totalPoints: getTotalPossiblePoints()
};

