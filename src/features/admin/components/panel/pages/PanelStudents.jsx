/**
 * PanelStudents - Student Management Page
 * Uses /api/admin/students with pagination, search and "Mis Grupos" filter.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, TextField, InputAdornment,
  Alert, Chip, ToggleButton, ToggleButtonGroup, Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon, People as PeopleIcon,
  School as SchoolIcon, FilterList as FilterIcon,
} from '@mui/icons-material';
import { useAuth } from '@/shared/contexts/AuthContext';
import { StudentsList } from '@/features/admin/components';
import adminService from '@/features/admin/services/adminService';

const useDebounce = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

export default function PanelStudents() {
  const navigate = useNavigate();
  const { user, isAdmin, isSuperuser } = useAuth();

  const [students, setStudents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination & sort
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('name');
  const [order, setOrder] = useState('asc');

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [groupFilter, setGroupFilter] = useState('all'); // 'all' | 'myGroups'

  const canSeeAll = isAdmin() || isSuperuser();

  const fetchStudents = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminService.getStudents({
        page: page + 1,
        limit: rowsPerPage,
        search: debouncedSearch || undefined,
        sortBy: orderBy,
        sortOrder: order,
        myGroups: groupFilter === 'myGroups',
      });

      if (result.success) {
        // Normalize to the shape StudentsList/StudentRow expect
        const normalized = (result.data.students || []).map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          image: s.image,
          groups: s.groups || [],
          stats: {
            progressPercentage: s.progress?.overallProgress ?? 0,
            completedLessons: s.progress?.completedModules ?? 0,
            totalLessons: s.progress?.totalModules ?? 0,
            totalTimeSpent: Math.round((s.progress?.totalTimeSpentSeconds ?? 0) / 60), // → minutes
            lastAccess: s.progress?.lastActivityAt ?? null,
          },
        }));
        setStudents(normalized);
        setTotalCount(result.data.total ?? normalized.length);
      } else {
        setError(result.error?.message || 'Error al cargar estudiantes');
        setStudents([]);
        setTotalCount(0);
      }
    } catch (err) {
      setError('Error de conexión');
      setStudents([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, page, rowsPerPage, debouncedSearch, orderBy, order, groupFilter]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);
  useEffect(() => { setPage(0); }, [debouncedSearch, groupFilter]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
            <Typography variant="h4" fontWeight="bold">
              {groupFilter === 'myGroups' ? 'Mis Grupos' : canSeeAll ? 'Todos los Estudiantes' : 'Mis Estudiantes'}
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
          <Typography variant="body2" color="text.secondary">
            Visualiza el progreso y la información de tus alumnos.
          </Typography>
        </Box>

        {/* Group filter toggle */}
        <ToggleButtonGroup
          value={groupFilter}
          exclusive
          onChange={(_, v) => { if (v) setGroupFilter(v); }}
          size="small"
        >
          <ToggleButton value="all">Todos</ToggleButton>
          <ToggleButton value="myGroups">
            <FilterIcon fontSize="small" sx={{ mr: 0.5 }} />
            Mis Grupos
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Search */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
        <TextField
          fullWidth
          placeholder="Buscar por nombre o correo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
          size="small"
        />
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* List */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, overflow: 'hidden' }}>
        <StudentsList
          students={students}
          isLoading={isLoading}
          onViewDetails={(s) => navigate(`/panel/students/${s.id}`)}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={totalCount}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          orderBy={orderBy}
          order={order}
          onRequestSort={(prop) => {
            const isAsc = orderBy === prop && order === 'asc';
            setOrder(isAsc ? 'desc' : 'asc');
            setOrderBy(prop);
          }}
        />
      </Paper>
    </Box>
  );
}
