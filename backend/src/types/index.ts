/**
 * Custom Type Definitions
 * Define custom TypeScript types and interfaces here
 */

/**
 * API Response Types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * User Types
 */
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}

/**
 * Pagination Types
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// Progress Types (re-exported from progress.ts)
// =============================================================================

export * from './progress';