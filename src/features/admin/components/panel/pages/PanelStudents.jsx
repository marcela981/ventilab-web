/**
 * PanelStudents - Centro de Estudiantes (Fase 2)
 * Tab A: Directorio con tabla oscura + checkboxes + "Conformar Grupo"
 * Tab B: Estadísticas Globales
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Box, Typography, TextField, InputAdornment, Alert, Chip, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TableSortLabel, Checkbox, Avatar, LinearProgress,
  IconButton, Tooltip, Button, Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon, People as PeopleIcon, Group as GroupIcon,
  ArrowForward as ArrowForwardIcon, BarChart as BarChartIcon,
  Timeline as TimelineIcon, FilterList as FilterIcon,
  CheckBox as SelectAllIcon, MedicalServices as VentilatorIcon,
} from '@mui/icons-material';
import { useAuth } from '@/shared/contexts/AuthContext';
import adminService from '@/features/admin/services/adminService';
import GroupBuilderModal from '../ui/GroupBuilderModal';
import GlassStatCard from '../ui/GlassStatCard';

// ── helpers ───────────────────────────────────────────────────────────────────

const useDebounce = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const progressColor = (pct) => {
  if (pct >= 70) return '#4ade80';
  if (pct >= 30) return '#fbbf24';
  return '#f87171';
};

// ── Glass style tokens ────────────────────────────────────────────────────────

const GLASS_CARD = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 2.5,
};

const CELL_SX = { color: 'rgba(255,255,255,0.75)', borderColor: 'rgba(255,255,255,0.07)', fontSize: '0.82rem' };
const HEADER_CELL_SX = { color: 'rgba(255,255,255,0.45)', borderColor: 'rgba(255,255,255,0.09)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: 'rgba(0,0,0,0.15)' };

// ── Tab Panel A: Directorio ───────────────────────────────────────────────────

function StudentTableRow({ student, selected, onSelect, onView }) {
  const pct = Math.round(student.stats?.progressPercentage ?? 0);
  const initial = (student.name || student.email || '?')[0].toUpperCase();
  return (
    <TableRow
      hover
      selected={selected}
      sx={{
        cursor: 'pointer',
        transition: 'background 0.15s',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.05) !important' },
        '&.Mui-selected': { bgcolor: 'rgba(16,174,222,0.08) !important' },
        '&.Mui-selected:hover': { bgcolor: 'rgba(16,174,222,0.12) !important' },
      }}
    >
      <TableCell padding="checkbox" sx={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <Checkbox
          checked={selected}
          onChange={onSelect}
          size="small"
          sx={{ color: 'rgba(255,255,255,0.3)', '&.Mui-checked': { color: '#10aede' } }}
          onClick={(e) => e.stopPropagation()}
        />
      </TableCell>

      <TableCell sx={CELL_SX} onClick={onView}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, fontSize: 13, fontWeight: 700, bgcolor: 'rgba(16,174,222,0.2)', color: '#7dd3fc', border: '1px solid rgba(16,174,222,0.3)' }}>
            {initial}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} sx={{ color: '#e8eaf6' }} noWrap>{student.name || '—'}</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }} noWrap>{student.email}</Typography>
          </Box>
        </Box>
      </TableCell>

      <TableCell sx={CELL_SX} onClick={onView}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 140 }}>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              flex: 1, height: 5, borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.08)',
              '& .MuiLinearProgress-bar': { bgcolor: progressColor(pct), borderRadius: 3 },
            }}
          />
          <Typography variant="caption" sx={{ color: progressColor(pct), fontWeight: 700, minWidth: 30 }}>{pct}%</Typography>
        </Box>
      </TableCell>

      <TableCell sx={CELL_SX} onClick={onView}>
        {student.groups?.length > 0
          ? student.groups.slice(0, 2).map((g) => <Chip key={g.id} label={g.name} size="small" sx={{ mr: 0.5, bgcolor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '0.68rem' }} />)
          : <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>Sin grupo</Typography>
        }
      </TableCell>

      <TableCell sx={{ ...CELL_SX, textAlign: 'right' }}>
        <Tooltip title="Ver detalle">
          <IconButton size="small" onClick={onView} sx={{ color: 'rgba(255,255,255,0.35)', '&:hover': { color: '#10aede', bgcolor: 'rgba(16,174,222,0.1)' } }}>
            <ArrowForwardIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

function SkeletonRows({ n = 5 }) {
  return Array.from({ length: n }).map((_, i) => (
    <TableRow key={i}>
      <TableCell padding="checkbox" sx={{ borderColor: 'rgba(255,255,255,0.07)' }}><Skeleton variant="rectangular" width={18} height={18} sx={{ bgcolor: 'rgba(255,255,255,0.07)', borderRadius: 0.5 }} /></TableCell>
      {[180, 160, 120, 80].map((w, j) => (
        <TableCell key={j} sx={{ borderColor: 'rgba(255,255,255,0.07)' }}><Skeleton variant="text" width={w} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} /></TableCell>
      ))}
    </TableRow>
  ));
}

// ── Tab Panel B: Estadísticas ─────────────────────────────────────────────────

function StatisticsTab({ stats, loading }) {
  const statCards = [
    { icon: <PeopleIcon />, title: 'Total Estudiantes', value: stats?.totalStudents ?? stats?.activeStudents, accent: 'cyan' },
    { icon: <BarChartIcon />, title: 'Módulos Publicados', value: stats?.totalModules ?? stats?.publishedModules, accent: 'green' },
    { icon: <TimelineIcon />, title: 'Lecciones Totales', value: stats?.totalLessons, accent: 'purple' },
    { icon: <GroupIcon />, title: 'Completados Hoy', value: stats?.completionsToday ?? stats?.todayCompletions ?? 0, accent: 'orange' },
  ];

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
        {statCards.map((c) => <GlassStatCard key={c.title} loading={loading} {...c} />)}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>
        {/* Gráfico principal (placeholder) */}
        <Box sx={{ ...GLASS_CARD, p: 3, minHeight: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <TimelineIcon sx={{ fontSize: 52, color: 'rgba(16,174,222,0.3)' }} />
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Progreso Agregado</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
            Gráfico de líneas por semana — disponible en próxima fase
          </Typography>
        </Box>
        {/* Módulos populares (placeholder) */}
        <Box sx={{ ...GLASS_CARD, p: 3, minHeight: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <BarChartIcon sx={{ fontSize: 52, color: 'rgba(124,77,255,0.3)' }} />
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Módulos Populares</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
            Ranking de módulos más completados
          </Typography>
        </Box>
      </Box>

      <Box sx={{ ...GLASS_CARD, p: 3, mt: 2 }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          📊 Reportes detallados — filtros por fecha, exportación CSV y comparativas entre grupos disponibles próximamente.
        </Typography>
      </Box>
    </Box>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PanelStudents() {
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const { user, isAdmin, isSuperuser } = useAuth();

  // Data
  const [students, setStudents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);

  // Tabs
  const [activeTab, setActiveTab] = useState(0);

  // Pagination & sort
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('name');
  const [order, setOrder] = useState('asc');

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [groupFilter, setGroupFilter] = useState('all');

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  const canSeeAll = isAdmin?.() || isSuperuser?.();

  const fetchStudents = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [studRes, statsRes] = await Promise.all([
        adminService.getStudents({ page: page + 1, limit: rowsPerPage, search: debouncedSearch || undefined, sortBy: orderBy, sortOrder: order, myGroups: groupFilter === 'myGroups' }),
        adminService.getPlatformStatistics(),
      ]);
      if (studRes.success) {
        setStudents((studRes.data.students || []).map((s) => ({
          id: s.id, name: s.name, email: s.email, image: s.image, groups: s.groups || [],
          stats: { progressPercentage: s.progress?.overallProgress ?? 0, completedLessons: s.progress?.completedModules ?? 0 },
        })));
        setTotalCount(studRes.data.total ?? 0);
      } else { setError(studRes.error?.message || 'Error al cargar estudiantes'); }
      if (statsRes.success) setGlobalStats(statsRes.data);
    } catch { setError('Error de conexión'); }
    finally { setIsLoading(false); }
  }, [user?.id, page, rowsPerPage, debouncedSearch, orderBy, order, groupFilter]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);
  useEffect(() => { setPage(0); }, [debouncedSearch, groupFilter]);

  // ── Selection helpers ────────────────────────────────────────────────────────
  const toggleSelect = (id) => setSelectedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleSelectAll = () => setSelectedIds(selectedIds.size === students.length && students.length > 0 ? new Set() : new Set(students.map((s) => s.id)));
  const selectedStudents = students.filter((s) => selectedIds.has(s.id));

  // ── Sort handler ─────────────────────────────────────────────────────────────
  const handleSort = (prop) => { const isAsc = orderBy === prop && order === 'asc'; setOrder(isAsc ? 'desc' : 'asc'); setOrderBy(prop); };

  const tabLabel = (label, count) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>{label}{count != null && <Chip label={count} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(16,174,222,0.15)', color: '#7dd3fc', '& .MuiChip-label': { px: 0.75 } }} />}</Box>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#fff', mb: 0.25 }}>
            {groupFilter === 'myGroups' ? 'Mis Grupos' : canSeeAll ? 'Todos los Estudiantes' : 'Mis Estudiantes'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)' }}>
            Gestiona tu alumnado y consulta estadísticas globales.
          </Typography>
        </Box>

        {/* "Reservar Ventilador" — solo visible en el contexto de grupos */}
        {groupFilter === 'myGroups' && selectedIds.size > 0 && (
          <Button
            variant="outlined"
            startIcon={<VentilatorIcon />}
            sx={{
              color: '#86efac', borderColor: 'rgba(134,239,172,0.4)',
              '&:hover': { bgcolor: 'rgba(134,239,172,0.08)', borderColor: 'rgba(134,239,172,0.7)' },
              fontWeight: 600,
            }}
          >
            Reservar Ventilador
          </Button>
        )}

        {/* "Conformar Grupo" button — visible when students are selected */}
        {selectedIds.size > 0 && (
          <Button
            variant="contained"
            startIcon={<GroupIcon />}
            onClick={() => setGroupModalOpen(true)}
            sx={{ bgcolor: '#10aede', color: '#fff', '&:hover': { bgcolor: '#0d9bc8' }, fontWeight: 600, boxShadow: '0 4px 14px rgba(16,174,222,0.4)' }}
          >
            Conformar Grupo ({selectedIds.size})
          </Button>
        )}

        {/* Mis Grupos toggle */}
        <Button
          variant={groupFilter === 'myGroups' ? 'contained' : 'outlined'}
          size="small"
          startIcon={<FilterIcon />}
          onClick={() => setGroupFilter((v) => v === 'all' ? 'myGroups' : 'all')}
          sx={groupFilter === 'myGroups'
            ? { bgcolor: 'rgba(16,174,222,0.2)', color: '#7dd3fc', border: '1px solid rgba(16,174,222,0.5)', '&:hover': { bgcolor: 'rgba(16,174,222,0.3)' } }
            : { color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.3)' } }
          }
        >
          Mis Grupos
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(244,67,54,0.12)', color: '#f87171', border: '1px solid rgba(244,67,54,0.3)' }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Tabs */}
      <Box sx={{ ...GLASS_CARD, mb: 3, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            px: 2, pt: 0.5,
            '& .MuiTab-root': { color: 'rgba(255,255,255,0.45)', textTransform: 'none', fontWeight: 600, minHeight: 48 },
            '& .Mui-selected': { color: '#10aede' },
            '& .MuiTabs-indicator': { bgcolor: '#10aede', height: 2.5, borderRadius: '2px 2px 0 0' },
          }}
        >
          <Tab label={tabLabel('Directorio', !isLoading ? totalCount : null)} />
          <Tab label={tabLabel('Estadísticas')} />
        </Tabs>
      </Box>

      {/* ── TAB 0: Directorio ───────────────────────────────────────────────── */}
      {activeTab === 0 && (
        <Box>
          {/* Search */}
          <Box sx={{ ...GLASS_CARD, p: 1.5, mb: 2 }}>
            <TextField
              fullWidth size="small"
              placeholder="Buscar por nombre o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} /></InputAdornment>,
                sx: { color: '#e8eaf6', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' }, '&.Mui-focused fieldset': { borderColor: '#10aede' } },
              }}
              InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.4)' } }}
            />
          </Box>

          {/* Table */}
          <Box sx={{ ...GLASS_CARD, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={HEADER_CELL_SX}>
                      <Checkbox
                        indeterminate={selectedIds.size > 0 && selectedIds.size < students.length}
                        checked={students.length > 0 && selectedIds.size === students.length}
                        onChange={toggleSelectAll}
                        size="small"
                        sx={{ color: 'rgba(255,255,255,0.3)', '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: '#10aede' } }}
                      />
                    </TableCell>
                    {[['name', 'Estudiante'], ['progressPercentage', 'Progreso'], ['groups', 'Grupos'], ['', '']].map(([field, label]) => (
                      <TableCell key={label} sx={HEADER_CELL_SX}>
                        {field ? (
                          <TableSortLabel
                            active={orderBy === field}
                            direction={orderBy === field ? order : 'asc'}
                            onClick={() => field && handleSort(field)}
                            sx={{ color: 'inherit !important', '& .MuiTableSortLabel-icon': { color: 'rgba(255,255,255,0.3) !important' } }}
                          >
                            {label}
                          </TableSortLabel>
                        ) : label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading
                    ? <SkeletonRows n={rowsPerPage} />
                    : students.length === 0
                      ? (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ textAlign: 'center', py: 5, color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.07)' }}>
                            <PeopleIcon sx={{ fontSize: 36, mb: 1, display: 'block', mx: 'auto', opacity: 0.3 }} />
                            No se encontraron estudiantes
                          </TableCell>
                        </TableRow>
                      )
                      : students.map((s) => (
                        <StudentTableRow
                          key={s.id}
                          student={s}
                          selected={selectedIds.has(s.id)}
                          onSelect={() => toggleSelect(s.id)}
                          onView={() => navigate(`/panel/students/${s.id}`)}
                        />
                      ))
                  }
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={(_, p) => setPage(p)}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[5, 10, 25]}
              sx={{ color: 'rgba(255,255,255,0.45)', borderTop: '1px solid rgba(255,255,255,0.07)', '& .MuiSelect-icon, & .MuiIconButton-root': { color: 'rgba(255,255,255,0.4)' } }}
            />
          </Box>
        </Box>
      )}

      {/* ── TAB 1: Estadísticas ─────────────────────────────────────────────── */}
      {activeTab === 1 && <StatisticsTab stats={globalStats} loading={isLoading} />}

      {/* Group Builder Modal */}
      <GroupBuilderModal
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        selectedStudents={selectedStudents}
      />
    </Box>
  );
}
