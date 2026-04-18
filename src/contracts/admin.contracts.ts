/**
 * Admin Contracts – Frontend
 * Types for the admin panel: students, filters, pagination.
 */

export const DEFAULT_PAGE_SIZE = 25;

// =============================================================================
// Student types
// =============================================================================

export interface StudentProgress {
  completionPercentage: number;
  lessonsCompleted: number;
  totalLessons: number;
  modulesCompleted: number;
  totalModules: number;
  lastActivity?: string;
}

export interface StudentWithProgress {
  id: string;
  name: string;
  email: string;
  role: string;
  groupId?: string;
  teacherId?: string;
  createdAt?: string;
  progress?: StudentProgress;
}

// =============================================================================
// Filter types
// =============================================================================

export type StudentSortField = 'name' | 'email' | 'progress' | 'lastActivity' | 'createdAt';
export type SortOrder = 'asc' | 'desc';
export type StudentStatus = 'active' | 'inactive' | 'all';

export interface StudentFilters {
  groupId?: string;
  teacherId?: string;
  search?: string;
  status?: StudentStatus;
  sortBy?: StudentSortField;
  sortOrder?: SortOrder;
}

// =============================================================================
// Hook return type
// =============================================================================

export interface StudentActions {
  setFilters: (newFilters: Partial<StudentFilters>) => void;
  clearFilters: () => void;
  goToPage: (newPage: number) => void;
  refetch: () => Promise<void>;
}

export interface UseStudentsReturn {
  students: StudentWithProgress[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  loading: boolean;
  error: Error | null;
  filters: StudentFilters;
  actions: StudentActions;
}
