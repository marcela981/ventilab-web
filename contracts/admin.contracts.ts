/**
 * VENTYLAB - ADMIN MODULE CONTRACTS (Frontend)
 * Frontend contracts for administration and analytics UI
 */

import {
  User,
  Group,
  UserRole,
  AccountStatus,
  StudentWithProgress,
  StudentDetailedProgress,
  GroupStatistics,
  PlatformStatistics,
} from '../../../ventylab-server/src/contracts/admin.contracts';

// Re-export backend types
export {
  User,
  Group,
  UserRole,
  AccountStatus,
  StudentWithProgress,
  StudentDetailedProgress,
  GroupStatistics,
  PlatformStatistics,
};

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Return type for useStudents hook
 * Fetches and manages students list
 */
export interface UseStudentsReturn {
  /** Students with progress */
  students: StudentWithProgress[];
  
  /** Total students count */
  total: number;
  
  /** Current page */
  page: number;
  
  /** Page size */
  limit: number;
  
  /** Whether students are loading */
  loading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Active filters */
  filters: StudentFilters;
  
  /** Actions */
  actions: {
    /** Set filters */
    setFilters: (filters: Partial<StudentFilters>) => void;
    
    /** Clear filters */
    clearFilters: () => void;
    
    /** Go to page */
    goToPage: (page: number) => void;
    
    /** Refetch students */
    refetch: () => Promise<void>;
  };
}

/**
 * Return type for useStudentDetails hook
 * Fetches detailed progress for single student
 */
export interface UseStudentDetailsReturn {
  /** Student details */
  student: User | null;
  
  /** Detailed progress */
  progress: StudentDetailedProgress | null;
  
  /** Whether data is loading */
  loading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Actions */
  actions: {
    /** Refetch data */
    refetch: () => Promise<void>;
  };
}

/**
 * Return type for useGroups hook
 * Manages groups list
 */
export interface UseGroupsReturn {
  /** Groups list */
  groups: Group[];
  
  /** Whether groups are loading */
  loading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Actions */
  actions: {
    /** Create group */
    createGroup: (data: CreateGroupData) => Promise<void>;
    
    /** Update group */
    updateGroup: (groupId: string, data: Partial<CreateGroupData>) => Promise<void>;
    
    /** Delete group */
    deleteGroup: (groupId: string) => Promise<void>;
    
    /** Refetch groups */
    refetch: () => Promise<void>;
  };
}

/**
 * Return type for useStatistics hook
 * Fetches analytics and statistics
 */
export interface UseStatisticsReturn {
  /** Statistics data */
  statistics: PlatformStatistics | GroupStatistics | null;
  
  /** Whether statistics are loading */
  loading: boolean;
  
  /** Error */
  error: Error | null;
  
  /** Actions */
  actions: {
    /** Refresh statistics */
    refresh: () => Promise<void>;
    
    /** Change period */
    changePeriod: (period: string) => void;
  };
}

/**
 * Return type for useUserManagement hook
 * Manages user CRUD operations
 */
export interface UseUserManagementReturn {
  /** Create user */
  createUser: (data: CreateUserData) => Promise<void>;
  
  /** Update user */
  updateUser: (userId: string, data: Partial<UpdateUserData>) => Promise<void>;
  
  /** Delete user */
  deleteUser: (userId: string) => Promise<void>;
  
  /** Assign to group */
  assignToGroup: (userId: string, groupId: string) => Promise<void>;
  
  /** Assign teacher */
  assignTeacher: (studentId: string, teacherId: string) => Promise<void>;
  
  /** Whether operation is in progress */
  isLoading: boolean;
  
  /** Error */
  error: Error | null;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

/**
 * Props for StudentsTable component
 */
export interface StudentsTableProps {
  /** Students data */
  students: StudentWithProgress[];
  
  /** Whether table is loading */
  loading?: boolean;
  
  /** Callback when student is selected */
  onStudentSelect?: (studentId: string) => void;
  
  /** Callback when bulk action */
  onBulkAction?: (action: string, studentIds: string[]) => void;
  
  /** Show selection checkboxes */
  showSelection?: boolean;
}

/**
 * Props for StudentDetailsPanel component
 */
export interface StudentDetailsPanelProps {
  /** Student ID */
  studentId: string;
  
  /** Callback when close */
  onClose?: () => void;
  
  /** Whether panel is open */
  open?: boolean;
}

/**
 * Props for GroupCard component
 */
export interface GroupCardProps {
  /** Group data */
  group: Group;
  
  /** Students count */
  studentsCount: number;
  
  /** Callback when group is clicked */
  onClick?: (groupId: string) => void;
  
  /** Callback when edit */
  onEdit?: (groupId: string) => void;
  
  /** Callback when delete */
  onDelete?: (groupId: string) => void;
}

/**
 * Props for StatisticsPanel component
 */
export interface StatisticsPanelProps {
  /** Statistics data */
  statistics: PlatformStatistics | GroupStatistics;
  
  /** Type of statistics */
  type: 'platform' | 'group';
  
  /** Whether to show charts */
  showCharts?: boolean;
  
  /** Variant */
  variant?: 'default' | 'compact' | 'detailed';
}

/**
 * Props for UserForm component
 */
export interface UserFormProps {
  /** Initial data (for edit) */
  initialData?: Partial<User>;
  
  /** Callback when form is submitted */
  onSubmit: (data: CreateUserData | UpdateUserData) => Promise<void>;
  
  /** Callback when cancel */
  onCancel?: () => void;
  
  /** Form mode */
  mode: 'create' | 'edit';
}

/**
 * Props for GroupForm component
 */
export interface GroupFormProps {
  /** Initial data (for edit) */
  initialData?: Partial<Group>;
  
  /** Callback when form is submitted */
  onSubmit: (data: CreateGroupData) => Promise<void>;
  
  /** Callback when cancel */
  onCancel?: () => void;
  
  /** Form mode */
  mode: 'create' | 'edit';
}

/**
 * Props for FiltersPanel component
 */
export interface FiltersPanelProps {
  /** Current filters */
  filters: StudentFilters;
  
  /** Callback when filters change */
  onFiltersChange: (filters: Partial<StudentFilters>) => void;
  
  /** Available groups */
  groups: Group[];
  
  /** Available teachers */
  teachers: User[];
}

/**
 * Props for AnalyticsChart component
 */
export interface AnalyticsChartProps {
  /** Chart data */
  data: ChartData;
  
  /** Chart type */
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  
  /** Chart title */
  title: string;
  
  /** Chart height */
  height?: number;
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

/**
 * Data for creating user
 */
export interface CreateUserData {
  /** Email */
  email: string;
  
  /** Name */
  name: string;
  
  /** Password */
  password: string;
  
  /** Role */
  role: UserRole;
  
  /** Group ID (for students) */
  groupId?: string;
  
  /** Teacher ID (for students) */
  assignedTeacherId?: string;
  
  /** Phone */
  phone?: string;
  
  /** Department */
  department?: string;
}

/**
 * Data for updating user
 */
export interface UpdateUserData {
  /** Name */
  name?: string;
  
  /** Email */
  email?: string;
  
  /** Role */
  role?: UserRole;
  
  /** Status */
  status?: AccountStatus;
  
  /** Group ID */
  groupId?: string;
  
  /** Teacher ID */
  assignedTeacherId?: string;
  
  /** Phone */
  phone?: string;
  
  /** Department */
  department?: string;
}

/**
 * Data for creating group
 */
export interface CreateGroupData {
  /** Name */
  name: string;
  
  /** Description */
  description?: string;
  
  /** Teacher ID */
  teacherId: string;
  
  /** Semester */
  semester?: string;
  
  /** Academic year */
  academicYear?: string;
  
  /** Max students */
  maxStudents?: number;
}

// ============================================================================
// FILTERS AND SEARCH
// ============================================================================

/**
 * Student filters
 */
export interface StudentFilters {
  /** Group ID */
  groupId?: string;
  
  /** Teacher ID */
  teacherId?: string;
  
  /** Search query */
  search?: string;
  
  /** Status */
  status?: AccountStatus;
  
  /** Progress range */
  progressRange?: {
    min: number;
    max: number;
  };
  
  /** Sort by */
  sortBy?: 'name' | 'email' | 'progress' | 'lastActivity' | 'createdAt';
  
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// ANALYTICS DATA TYPES
// ============================================================================

/**
 * Chart data
 */
export interface ChartData {
  /** Labels */
  labels: string[];
  
  /** Datasets */
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }[];
}

/**
 * Metric card data
 */
export interface MetricCardData {
  /** Metric title */
  title: string;
  
  /** Current value */
  value: number | string;
  
  /** Change from previous period */
  change?: number;
  
  /** Unit */
  unit?: string;
  
  /** Icon */
  icon?: string;
  
  /** Color */
  color?: string;
}

/**
 * Activity timeline item
 */
export interface TimelineItem {
  /** Item ID */
  id: string;
  
  /** Activity type */
  type: string;
  
  /** Description */
  description: string;
  
  /** Actor */
  actor: {
    id: string;
    name: string;
  };
  
  /** Timestamp */
  timestamp: Date;
  
  /** Additional metadata */
  metadata?: any;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * Admin UI state
 */
export interface AdminUIState {
  /** Active tab */
  activeTab: 'students' | 'groups' | 'statistics' | 'settings';
  
  /** Selected student IDs */
  selectedStudents: Set<string>;
  
  /** Filters panel open */
  filtersPanelOpen: boolean;
  
  /** Details panel open */
  detailsPanelOpen: boolean;
  
  /** Selected student ID (for details) */
  selectedStudentId: string | null;
}

/**
 * Bulk action
 */
export interface BulkAction {
  /** Action type */
  type: 'assign_group' | 'assign_teacher' | 'update_status' | 'delete';
  
  /** Action label */
  label: string;
  
  /** Action icon */
  icon?: string;
  
  /** Confirmation required */
  requiresConfirmation: boolean;
  
  /** Handler */
  handler: (studentIds: string[]) => Promise<void>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * User role labels
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.STUDENT]: 'Estudiante',
  [UserRole.TEACHER]: 'Profesor',
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.SUPERUSER]: 'Superusuario',
};

/**
 * Account status labels
 */
export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  [AccountStatus.ACTIVE]: 'Activo',
  [AccountStatus.INACTIVE]: 'Inactivo',
  [AccountStatus.SUSPENDED]: 'Suspendido',
  [AccountStatus.PENDING]: 'Pendiente',
};

/**
 * Account status colors
 */
export const ACCOUNT_STATUS_COLORS: Record<AccountStatus, string> = {
  [AccountStatus.ACTIVE]: '#10b981',
  [AccountStatus.INACTIVE]: '#9ca3af',
  [AccountStatus.SUSPENDED]: '#ef4444',
  [AccountStatus.PENDING]: '#f59e0b',
};

/**
 * Default page size
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Available page sizes
 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
