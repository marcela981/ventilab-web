/**
 * VENTYLAB - PROFILE MODULE CONTRACTS (Frontend)
 * Frontend contracts for user profile UI
 */

import {
  UserProfile,
  UserPreferences,
  UserActivitySummary,
} from '../../../ventylab-server/src/contracts/profile.contracts';

// Re-export backend types
export {
  UserProfile,
  UserPreferences,
  UserActivitySummary,
};

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Return type for useProfile hook
 * Manages user profile data
 */
export interface UseProfileReturn {
  /** User profile */
  profile: UserProfile | null;
  
  /** User preferences */
  preferences: UserPreferences | null;
  
  /** Activity summary */
  activitySummary: UserActivitySummary | null;
  
  /** Whether data is loading */
  loading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Actions */
  actions: {
    /** Update profile */
    updateProfile: (data: UpdateProfileData) => Promise<void>;
    
    /** Update preferences */
    updatePreferences: (data: Partial<UserPreferences>) => Promise<void>;
    
    /** Upload avatar */
    uploadAvatar: (file: File) => Promise<void>;
    
    /** Refetch data */
    refetch: () => Promise<void>;
  };
}

/**
 * Return type for usePasswordChange hook
 * Manages password change
 */
export interface UsePasswordChangeReturn {
  /** Change password */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  
  /** Whether operation is in progress */
  isLoading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Success flag */
  success: boolean;
  
  /** Actions */
  actions: {
    /** Reset state */
    reset: () => void;
  };
}

/**
 * Return type for useEmailUpdate hook
 * Manages email update
 */
export interface UseEmailUpdateReturn {
  /** Update email */
  updateEmail: (newEmail: string, password: string) => Promise<void>;
  
  /** Whether operation is in progress */
  isLoading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Success flag */
  success: boolean;
  
  /** Verification sent */
  verificationSent: boolean;
  
  /** Actions */
  actions: {
    /** Reset state */
    reset: () => void;
  };
}

/**
 * Return type for useActivityHistory hook
 * Fetches user activity history
 */
export interface UseActivityHistoryReturn {
  /** Activity items */
  activities: ActivityItem[];
  
  /** Whether data is loading */
  loading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Actions */
  actions: {
    /** Load more activities */
    loadMore: () => Promise<void>;
    
    /** Refetch */
    refetch: () => Promise<void>;
  };
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Props for ProfileCard component
 */
export interface ProfileCardProps {
  /** User profile */
  profile: UserProfile;
  
  /** Whether card is editable */
  editable?: boolean;
  
  /** Callback when edit clicked */
  onEdit?: () => void;
  
  /** Variant */
  variant?: 'default' | 'compact' | 'detailed';
}

/**
 * Props for ProfileForm component
 */
export interface ProfileFormProps {
  /** Initial data */
  initialData: UserProfile;
  
  /** Callback when form is submitted */
  onSubmit: (data: UpdateProfileData) => Promise<void>;
  
  /** Callback when cancel */
  onCancel?: () => void;
  
  /** Whether form is loading */
  isLoading?: boolean;
}

/**
 * Props for AvatarUpload component
 */
export interface AvatarUploadProps {
  /** Current avatar URL */
  currentAvatar?: string;
  
  /** Callback when file is selected */
  onUpload: (file: File) => Promise<void>;
  
  /** Whether upload is in progress */
  isUploading?: boolean;
  
  /** Size */
  size?: 'small' | 'medium' | 'large';
}

/**
 * Props for PasswordChangeForm component
 */
export interface PasswordChangeFormProps {
  /** Callback when form is submitted */
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>;
  
  /** Callback when cancel */
  onCancel?: () => void;
  
  /** Whether form is loading */
  isLoading?: boolean;
}

/**
 * Props for EmailUpdateForm component
 */
export interface EmailUpdateFormProps {
  /** Current email */
  currentEmail: string;
  
  /** Callback when form is submitted */
  onSubmit: (newEmail: string, password: string) => Promise<void>;
  
  /** Callback when cancel */
  onCancel?: () => void;
  
  /** Whether form is loading */
  isLoading?: boolean;
}

/**
 * Props for PreferencesPanel component
 */
export interface PreferencesPanelProps {
  /** Current preferences */
  preferences: UserPreferences;
  
  /** Callback when preferences change */
  onChange: (preferences: Partial<UserPreferences>) => Promise<void>;
  
  /** Whether save is in progress */
  isSaving?: boolean;
}

/**
 * Props for ActivitySummaryCard component
 */
export interface ActivitySummaryCardProps {
  /** Activity summary data */
  summary: UserActivitySummary;
  
  /** Variant */
  variant?: 'default' | 'compact' | 'detailed';
}

/**
 * Props for ActivityTimeline component
 */
export interface ActivityTimelineProps {
  /** Activity items */
  activities: ActivityItem[];
  
  /** Whether more activities are available */
  hasMore?: boolean;
  
  /** Callback to load more */
  onLoadMore?: () => void;
  
  /** Whether loading */
  loading?: boolean;
}

/**
 * Props for StatCard component
 */
export interface StatCardProps {
  /** Stat title */
  title: string;
  
  /** Stat value */
  value: number | string;
  
  /** Icon */
  icon?: string;
  
  /** Color */
  color?: string;
  
  /** Trend */
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  
  /** Unit */
  unit?: string;
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

/**
 * Data for updating profile
 */
export interface UpdateProfileData {
  /** Name */
  name?: string;
  
  /** Phone */
  phone?: string;
  
  /** Department */
  department?: string;
  
  /** Bio */
  bio?: string;
}

/**
 * Activity item
 */
export interface ActivityItem {
  /** Activity ID */
  id: string;
  
  /** Activity type */
  type: 'lesson_completed' | 'evaluation_taken' | 'simulator_session' | 'module_started' | 'achievement_earned';
  
  /** Title */
  title: string;
  
  /** Description */
  description: string;
  
  /** Timestamp */
  timestamp: Date;
  
  /** Icon */
  icon?: string;
  
  /** Color */
  color?: string;
  
  /** Additional data */
  metadata?: any;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * Profile UI state
 */
export interface ProfileUIState {
  /** Active section */
  activeSection: 'profile' | 'security' | 'preferences' | 'activity';
  
  /** Edit mode */
  editMode: boolean;
  
  /** Show avatar upload dialog */
  showAvatarUpload: boolean;
  
  /** Show password change dialog */
  showPasswordChange: boolean;
  
  /** Show email update dialog */
  showEmailUpdate: boolean;
}

/**
 * Security settings
 */
export interface SecuritySettings {
  /** Two-factor authentication enabled */
  twoFactorEnabled: boolean;
  
  /** Session timeout (minutes) */
  sessionTimeout: number;
  
  /** Login notifications */
  loginNotifications: boolean;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  /** Email notifications */
  email: {
    courseUpdates: boolean;
    evaluationReminders: boolean;
    achievements: boolean;
    weeklyDigest: boolean;
  };
  
  /** Push notifications */
  push: {
    lessonReminders: boolean;
    evaluationDeadlines: boolean;
    newContent: boolean;
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Profile validation rules
 */
export interface ProfileValidation {
  /** Name validation */
  name: {
    min: number;
    max: number;
    required: boolean;
  };
  
  /** Phone validation */
  phone: {
    pattern: RegExp;
    required: boolean;
  };
  
  /** Bio validation */
  bio: {
    max: number;
  };
  
  /** Avatar validation */
  avatar: {
    maxSize: number; // bytes
    allowedFormats: string[];
  };
}

/**
 * Password validation rules
 */
export interface PasswordValidation {
  /** Minimum length */
  minLength: number;
  
  /** Require uppercase */
  requireUppercase: boolean;
  
  /** Require lowercase */
  requireLowercase: boolean;
  
  /** Require number */
  requireNumber: boolean;
  
  /** Require special character */
  requireSpecial: boolean;
}

/**
 * Password strength
 */
export interface PasswordStrength {
  /** Score (0-4) */
  score: number;
  
  /** Label */
  label: 'weak' | 'fair' | 'good' | 'strong';
  
  /** Color */
  color: string;
  
  /** Suggestions */
  suggestions: string[];
}

// ============================================================================
// ACHIEVEMENTS AND BADGES
// ============================================================================

/**
 * Achievement/Badge
 */
export interface Achievement {
  /** Achievement ID */
  id: string;
  
  /** Title */
  title: string;
  
  /** Description */
  description: string;
  
  /** Icon */
  icon: string;
  
  /** Color */
  color: string;
  
  /** Whether unlocked */
  unlocked: boolean;
  
  /** Unlock date */
  unlockedAt?: Date;
  
  /** Progress (0-100) */
  progress?: number;
  
  /** Criteria */
  criteria: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Profile validation constants
 */
export const PROFILE_VALIDATION_RULES: ProfileValidation = {
  name: {
    min: 2,
    max: 100,
    required: true,
  },
  phone: {
    pattern: /^\+?[1-9]\d{1,14}$/,
    required: false,
  },
  bio: {
    max: 500,
  },
  avatar: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
  },
};

/**
 * Password validation constants
 */
export const PASSWORD_VALIDATION_RULES: PasswordValidation = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false,
};

/**
 * Activity type labels
 */
export const ACTIVITY_TYPE_LABELS = {
  lesson_completed: 'Lección Completada',
  evaluation_taken: 'Evaluación Realizada',
  simulator_session: 'Sesión de Simulador',
  module_started: 'Módulo Iniciado',
  achievement_earned: 'Logro Desbloqueado',
} as const;

/**
 * Activity type icons
 */
export const ACTIVITY_TYPE_ICONS = {
  lesson_completed: 'check_circle',
  evaluation_taken: 'assignment',
  simulator_session: 'science',
  module_started: 'play_circle',
  achievement_earned: 'emoji_events',
} as const;

/**
 * Activity type colors
 */
export const ACTIVITY_TYPE_COLORS = {
  lesson_completed: '#10b981',
  evaluation_taken: '#3b82f6',
  simulator_session: '#f59e0b',
  module_started: '#8b5cf6',
  achievement_earned: '#ec4899',
} as const;

/**
 * Password strength thresholds
 */
export const PASSWORD_STRENGTH_THRESHOLDS = {
  WEAK: 1,
  FAIR: 2,
  GOOD: 3,
  STRONG: 4,
};

/**
 * Password strength labels
 */
export const PASSWORD_STRENGTH_LABELS: Record<number, string> = {
  0: 'Muy débil',
  1: 'Débil',
  2: 'Regular',
  3: 'Buena',
  4: 'Fuerte',
};

/**
 * Password strength colors
 */
export const PASSWORD_STRENGTH_COLORS: Record<number, string> = {
  0: '#ef4444',
  1: '#f59e0b',
  2: '#f59e0b',
  3: '#10b981',
  4: '#10b981',
};
