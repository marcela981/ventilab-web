/**
 * =============================================================================
 * PanelStudents - Student Management Page
 * =============================================================================
 * Page for viewing and managing student data and progress.
 *
 * Accessible to: teacher, admin, superuser
 *
 * Features:
 * - Role-based data fetching:
 *   - Teachers: Only see their assigned students
 *   - Admin/Superuser: See all students
 * - Search functionality
 * - Pagination
 * - Sortable columns
 * - Responsive design (table on desktop, cards on mobile)
 * =============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Alert,
  Chip,
  Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon,
  People as PeopleIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { StudentsList } from '@/components/students';
import studentsService from '@/services/api/studentsService';

/**
 * Debounce hook for search input
 */
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * PanelStudents Component
 */
export default function PanelStudents() {
  const navigate = useNavigate();
  const { user, role, isTeacher, isAdmin, isSuperuser } = useAuth();

  // Data state
  const [students, setStudents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination & Sorting state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('name');
  const [order, setOrder] = useState('asc');

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Determine if user can see all students (admin/superuser)
  const canSeeAllStudents = isAdmin() || isSuperuser();

  /**
   * Fetch students based on role
   */
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let result;

      if (canSeeAllStudents) {
        // Admin/Superuser: Get all students
        result = await studentsService.getAllStudents({
          page: page + 1, // API uses 1-indexed pages
          limit: rowsPerPage,
          search: debouncedSearch,
          sortBy: orderBy,
          sortOrder: order,
        });
      } else {
        // Teacher: Get only assigned students
        result = await studentsService.getTeacherStudents(user?.id, true);
      }

      if (result.success) {
        if (canSeeAllStudents) {
          // Admin response has pagination info
          setStudents(result.data.students || []);
          setTotalCount(result.data.pagination?.totalCount || result.data.students?.length || 0);
        } else {
          // Teacher response is a direct array with count
          let studentsList = result.data.students || [];

          // Apply client-side search filter for teachers
          if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase();
            studentsList = studentsList.filter(
              (student) =>
                student.name?.toLowerCase().includes(searchLower) ||
                student.email?.toLowerCase().includes(searchLower)
            );
          }

          // Apply client-side sorting for teachers
          studentsList.sort((a, b) => {
            let aValue = a[orderBy] || '';
            let bValue = b[orderBy] || '';

            // Handle nested stats properties
            if (orderBy === 'progress' || orderBy === 'completedLessons' || orderBy === 'lastAccess') {
              aValue = a.stats?.[orderBy === 'progress' ? 'progressPercentage' : orderBy] || 0;
              bValue = b.stats?.[orderBy === 'progress' ? 'progressPercentage' : orderBy] || 0;
            }

            if (typeof aValue === 'string') {
              aValue = aValue.toLowerCase();
              bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) return order === 'asc' ? -1 : 1;
            if (aValue > bValue) return order === 'asc' ? 1 : -1;
            return 0;
          });

          // Apply client-side pagination for teachers
          const startIndex = page * rowsPerPage;
          const totalFiltered = studentsList.length;
          studentsList = studentsList.slice(startIndex, startIndex + rowsPerPage);

          // Transform teacher response to match expected format
          const transformedStudents = studentsList.map((student) => ({
            id: student.id,
            name: student.name,
            email: student.email,
            image: student.image,
            stats: {
              completedLessons: student.progress?.completedLessons || 0,
              totalLessons: student.progress?.totalLessons || 0,
              totalTimeSpent: student.progress?.totalTimeSpent || 0,
              lastAccess: student.progress?.lastAccess || student.assignedAt,
              progressPercentage: student.progress?.progressPercentage ||
                (student.progress?.totalLessons > 0
                  ? Math.round((student.progress?.completedLessons / student.progress?.totalLessons) * 100)
                  : 0),
            },
          }));

          setStudents(transformedStudents);
          setTotalCount(totalFiltered);
        }
      } else {
        setError(result.error?.message || 'Error al cargar los estudiantes');
        setStudents([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('[PanelStudents] Error fetching students:', err);
      setError('Error de conexión. Por favor, intenta de nuevo.');
      setStudents([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, canSeeAllStudents, page, rowsPerPage, debouncedSearch, orderBy, order]);

  // Fetch students when dependencies change
  useEffect(() => {
    if (user?.id) {
      fetchStudents();
    }
  }, [fetchStudents, user?.id]);

  // Reset to first page when search changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  /**
   * Handle page change
   */
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  /**
   * Handle rows per page change
   */
  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Handle sort request
   */
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  /**
   * Handle view student details
   */
  const handleViewDetails = (student) => {
    navigate(`/panel/students/${student.id}`);
  };

  /**
   * Handle search input change
   */
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h4" fontWeight="bold">
            {canSeeAllStudents ? 'Todos los Estudiantes' : 'Mis Estudiantes'}
          </Typography>
          {!isLoading && (
            <Chip
              icon={<SchoolIcon />}
              label={`${totalCount} ${totalCount === 1 ? 'estudiante' : 'estudiantes'}`}
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
        </Box>
        <Typography variant="body1" color="text.secondary">
          {canSeeAllStudents
            ? 'Visualiza y administra todos los estudiantes del sistema.'
            : 'Visualiza el progreso de los estudiantes asignados a ti.'}
        </Typography>
      </Box>

      {/* Search Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          border: '1px solid',
          borderColor: 'grey.200',
          borderRadius: 2,
        }}
      >
        <TextField
          fullWidth
          placeholder="Buscar estudiante por nombre o correo..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          size="small"
        />
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Students List */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'grey.200',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <StudentsList
          students={students}
          isLoading={isLoading}
          onViewDetails={handleViewDetails}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={totalCount}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          orderBy={orderBy}
          order={order}
          onRequestSort={handleRequestSort}
        />
      </Paper>
    </Box>
  );
}
