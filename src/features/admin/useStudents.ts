import { useState, useEffect, useCallback, useRef } from 'react';
import { httpClient, ApiError } from '@/shared/services/httpClient';
import type {
  UseStudentsReturn,
  StudentWithProgress,
  StudentFilters,
} from '../../contracts/admin.contracts';
import { DEFAULT_PAGE_SIZE } from '../../contracts/admin.contracts';

interface StudentsResponse {
  students?: StudentWithProgress[];
  data?: StudentWithProgress[];
  total?: number;
  count?: number;
}

export function useStudents(): UseStudentsReturn {
  const [students, setStudents] = useState<StudentWithProgress[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFiltersState] = useState<StudentFilters>({});

  const abortRef = useRef<AbortController | null>(null);

  const fetchStudents = useCallback(async (
    currentFilters: StudentFilters,
    currentPage: number,
    signal: AbortSignal,
  ) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });

      if (currentFilters.search)   params.set('search', currentFilters.search);
      if (currentFilters.groupId)  params.set('groupId', currentFilters.groupId);
      if (currentFilters.teacherId) params.set('teacherId', currentFilters.teacherId);
      if (currentFilters.sortBy)   params.set('sortBy', currentFilters.sortBy);
      if (currentFilters.sortOrder) params.set('sortOrder', currentFilters.sortOrder);
      if (currentFilters.status && currentFilters.status !== 'all') {
        params.set('status', currentFilters.status);
      }

      const res = await httpClient.get<StudentsResponse>(
        `/users/students?${params}`,
        { signal, retry: false },
      );

      setStudents(res.students ?? res.data ?? []);
      setTotal(res.total ?? res.count ?? 0);
    } catch (err) {
      if ((err as Error).name === 'CanceledError' || (err as Error).name === 'AbortError') return;

      if (err instanceof ApiError) {
        if (err.isForbidden) {
          setError(new Error('No tienes permisos para ver esta lista de estudiantes.'));
        } else if (err.isNotFound) {
          setStudents([]);
          setTotal(0);
        } else if (err.isRateLimit) {
          setError(new Error('Demasiadas solicitudes. Espera un momento e intenta de nuevo.'));
        } else if (err.isServerError) {
          setError(new Error('Error del servidor. Intenta de nuevo más tarde.'));
        } else {
          setError(new Error(err.message));
        }
      } else {
        setError(err instanceof Error ? err : new Error('Error desconocido al cargar estudiantes.'));
      }
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Trigger fetch whenever filters or page change.
  // Debounce only when the search field changed (typing in a text input).
  const prevSearchRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const searchChanged = filters.search !== prevSearchRef.current;
    prevSearchRef.current = filters.search;

    if (searchChanged) {
      const timer = setTimeout(() => fetchStudents(filters, page, controller.signal), 300);
      return () => {
        clearTimeout(timer);
        controller.abort();
      };
    }

    fetchStudents(filters, page, controller.signal);
    return () => controller.abort();
  }, [filters, page, fetchStudents]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const setFilters = useCallback((newFilters: Partial<StudentFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
    setPage(1);
  }, []);

  const goToPage = useCallback((newPage: number) => {
    setPage(prev => {
      const totalPages = Math.max(1, Math.ceil(total / limit));
      return Math.max(1, Math.min(newPage, totalPages));
    });
  }, [total, limit]);

  const refetch = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    await fetchStudents(filters, page, controller.signal);
  }, [fetchStudents, filters, page]);

  return {
    students,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    loading,
    error,
    filters,
    actions: { setFilters, clearFilters, goToPage, refetch },
  };
}
