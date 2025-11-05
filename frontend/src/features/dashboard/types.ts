/**
 * Tipos TypeScript para el Dashboard del Módulo de Enseñanza
 */

// OverviewToday - Para DashboardOverviewCard
export interface OverviewToday {
  lessonTitle?: string; // Título de la lección donde quedó
  estMin?: number; // Tiempo estimado en minutos
  progressPercent?: number; // Progreso de la lección (0-100)
  xpToday: number;
  level: number;
  role: string; // Ej: "Estudiante", "Aprendiz", etc.
}

export interface DashboardOverview {
  xpToday: number;
  level: number;
  levelProgress: number; // 0-100
  role: string; // Ej: "Estudiante", "Aprendiz", etc.
  streak?: number; // Días consecutivos de estudio
}

export interface KPI {
  label: string;
  value: string | number;
  icon?: string;
  trend?: 'up' | 'down' | 'stable';
}

// KPISet - Para KPIsStrip
export interface KPISet {
  xpTotal: number;
  level: number;
  streak: number; // Días consecutivos
  moduleMastery: number; // Porcentaje de dominio del módulo (0-100)
}

export interface QuickAction {
  id: string;
  label: string;
  subtitle?: string; // Subtítulo opcional
  icon: string;
  onClick: () => void;
  badge?: string | number;
  disabled?: boolean;
}

export interface WeeklyObjective {
  id: string;
  title: string;
  progress: number; // 0-100
  target: number;
  current: number;
  unit?: string;
}

// WeeklyGoal - Para WeeklyPlan
export interface WeeklyGoal {
  id: string;
  title: string;
  progress: number; // 0-100
  current: number;
  target: number;
  unit: string; // Ej: "lecciones", "min", "módulos"
}

export interface CaseSpotlight {
  id: string;
  title: string;
  description: string;
  difficulty: 'básico' | 'intermedio' | 'avanzado';
  reward: {
    xp: number;
    badge?: string;
  };
  estimatedTime: number; // minutos
  onClick: () => void;
}

// SpotlightCase - Para CaseSpotlight
export interface SpotlightCase {
  id: string;
  title: string;
  difficulty: 'básico' | 'intermedio' | 'avanzado';
  estMin: number; // minutos
  rewardXP: number;
  summary: string;
  tags?: string[];
}

export interface Recommendation {
  id: string;
  type: 'lesson' | 'module' | 'simulation' | 'practice';
  title: string;
  description: string;
  progress?: number; // 0-100
  estimatedTime?: number; // minutos
  onClick: () => void;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'announcement';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// NotificationItem - Para NotificationsCenter
export interface NotificationItem {
  id: string;
  type: 'info' | 'warning' | 'success' | 'announcement';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface ScheduleItem {
  id: string;
  title: string;
  date: Date;
  time?: string;
  type: 'lesson' | 'exam' | 'review' | 'deadline';
  location?: string;
}

export interface ActivityItem {
  id: string;
  type: 'lesson_completed' | 'module_completed' | 'achievement_unlocked' | 'streak_milestone';
  title: string;
  description: string;
  timestamp: Date;
  icon?: string;
  xpDelta?: number; // XP ganado/perdido
}

export interface TodoTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high';
}

// TaskItem - Para TasksTodo
export interface TaskItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface CohortStats {
  percentile: number; // 0-100
  totalStudents: number;
  activeToday: number;
  averageXP: number;
  userXP: number;
}

// CohortSnapshot - Para CohortPulse
export interface CohortSnapshot {
  percentile: number; // 0-100
  activeUsers: number;
  sessionsPerWeek: number; // Media de sesiones por semana
}

export interface TimerState {
  isRunning: boolean;
  minutes: number;
  seconds: number;
  mode: 'work' | 'break';
  cycles: number;
}

// FocusTimerState - Para FocusTimer
export interface FocusTimerState {
  isRunning: boolean;
  minutes: number;
  seconds: number;
  mode: 'work' | 'break';
  cycles: number;
}

export interface DashboardData {
  overview: DashboardOverview | OverviewToday; // Soporta ambos tipos para compatibilidad
  kpis: KPI[] | KPISet; // Soporta ambos tipos para compatibilidad
  quickActions: QuickAction[];
  weeklyObjectives: WeeklyObjective[];
  caseSpotlight?: CaseSpotlight | SpotlightCase;
  recommendations: Recommendation[];
  notifications: Notification[] | NotificationItem[];
  schedule: ScheduleItem[];
  activities: ActivityItem[];
  todos: TodoTask[] | TaskItem[];
  cohortStats?: CohortStats | CohortSnapshot;
  timerState?: FocusTimerState;
}

