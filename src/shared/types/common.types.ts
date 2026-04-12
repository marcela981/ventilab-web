/**
 * Common Types - Shared type definitions across the frontend
 */

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPERUSER';
  image?: string | null;
}
