/**
 * PanelAdmin - Administrator Management Page
 * Accessible to: admin, superuser ONLY
 *
 * Features:
 *  1. Teacher list: search, view assigned groups, demote to student.
 *  2. Promote students: search student accounts and grant TEACHER or ADMIN role.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, TextField, InputAdornment, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Avatar, Chip, IconButton, Tooltip, Alert, CircularProgress, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem,
  InputLabel, FormControl, Skeleton, Divider, Stack,
} from '@mui/material';
import {
  Search as SearchIcon, Person as PersonIcon, Group as GroupIcon,
  AdminPanelSettings as AdminIcon, School as SchoolIcon,
  Edit as EditIcon, ArrowUpward as PromoteIcon,
} from '@mui/icons-material';
import { useAuth } from '@/shared/contexts/AuthContext';
import { isAdminOrAbove, getRoleDisplayName } from '@/lib/roles';
import adminService from '@/features/admin/services/adminService';

const useDebounce = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const ROLE_OPTIONS = [
  { value: 'STUDENT', label: 'Estudiante' },
  { value: 'TEACHER', label: 'Profesor' },
  { value: 'ADMIN', label: 'Administrador' },
];

const roleColor = { STUDENT: 'default', TEACHER: 'info', ADMIN: 'warning', SUPERUSER: 'error' };
const roleLabel = { STUDENT: 'Estudiante', TEACHER: 'Profesor', ADMIN: 'Admin', SUPERUSER: 'Superusuario' };

// ── Change Role Dialog ────────────────────────────────────────────────────────

function ChangeRoleDialog({ open, onClose, onSaved, target }) {
  const [newRole, setNewRole] = useState(target?.role?.toUpperCase() || 'STUDENT');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) { setNewRole(target?.role?.toUpperCase() || 'STUDENT'); setErr(''); }
  }, [open, target]);

  const handleSave = async () => {
    if (!target?.id) return;
    setSaving(true);
    setErr('');
    const res = await adminService.updateUserRole(target.id, newRole);
    setSaving(false);
    if (res.success) { onSaved(); onClose(); }
    else setErr(res.error?.message || 'Error al cambiar el rol');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Cambiar rol de usuario</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Usuario: <strong>{target?.name || target?.email}</strong>
          {' · '} Rol actual: <Chip label={roleLabel[target?.role?.toUpperCase()] || target?.role} size="small" color={roleColor[target?.role?.toUpperCase()] || 'default'} />
        </Typography>
        <FormControl fullWidth size="small">
          <InputLabel>Nuevo rol</InputLabel>
          <Select value={newRole} label="Nuevo rol" onChange={(e) => setNewRole(e.target.value)}>
            {ROLE_OPTIONS.map((r) => (
              <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Alert severity="warning" sx={{ mt: 2 }}>
          Este cambio afecta inmediatamente el acceso del usuario a la plataforma.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Teachers Tab ──────────────────────────────────────────────────────────────

function TeachersTab() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roleDialog, setRoleDialog] = useState(null); // target user

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminService.getTeachers(debouncedSearch || undefined);
    if (res.success) setTeachers(res.data.teachers || res.data || []);
    else setError(res.error?.message || 'Error al cargar profesores');
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar por nombre o correo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell>Profesor</TableCell>
              <TableCell>Correo</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Grupos asignados</TableCell>
              <TableCell>Estudiantes</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? [1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5, 6].map((j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              : teachers.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                      <SchoolIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1, display: 'block', mx: 'auto' }} />
                      <Typography color="text.secondary">
                        {search ? 'No se encontraron profesores' : 'No hay profesores registrados'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
                : teachers.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: 13 }}>
                            {(t.name || t.email || '?')[0].toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" fontWeight="medium">{t.name || '(Sin nombre)'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{t.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={roleLabel[t.role?.toUpperCase()] || t.role}
                          size="small"
                          color={roleColor[t.role?.toUpperCase()] || 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(t.groups || []).length === 0
                            ? <Typography variant="caption" color="text.secondary">Sin grupos</Typography>
                            : (t.groups || []).map((g) => (
                                <Chip key={g.id} label={g.name} size="small" icon={<GroupIcon />} variant="outlined" />
                              ))
                          }
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{t.studentCount ?? t._count?.students ?? '—'}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Cambiar rol">
                          <IconButton size="small" onClick={() => setRoleDialog(t)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
            }
          </TableBody>
        </Table>
      </TableContainer>

      {roleDialog && (
        <ChangeRoleDialog
          open
          onClose={() => setRoleDialog(null)}
          onSaved={() => { setRoleDialog(null); fetchTeachers(); }}
          target={roleDialog}
        />
      )}
    </Box>
  );
}

// ── Promote Students Tab ──────────────────────────────────────────────────────

function PromoteStudentsTab() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [roleDialog, setRoleDialog] = useState(null);

  const fetchStudents = useCallback(async () => {
    if (!debouncedSearch.trim()) { setStudents([]); return; }
    setLoading(true);
    setError(null);
    const res = await adminService.getStudents({ search: debouncedSearch, page: 1, limit: 20 });
    if (res.success) {
      setStudents(res.data.students || []);
    } else {
      setError(res.error?.message || 'Error al buscar');
    }
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Busca por nombre o correo para encontrar un usuario y cambiar su rol. Solo estudiantes y profesores aparecerán aquí.
      </Alert>

      <TextField
        fullWidth
        size="small"
        placeholder="Buscar usuario por nombre o correo..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
        sx={{ mb: 2 }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!search.trim() && (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
          <SearchIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
          <Typography color="text.secondary">Escribe para buscar usuarios</Typography>
        </Paper>
      )}

      {loading && (
        <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress /></Box>
      )}

      {!loading && search.trim() && students.length === 0 && (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
          <Typography color="text.secondary">No se encontraron usuarios con ese criterio</Typography>
        </Paper>
      )}

      {!loading && students.length > 0 && (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, overflow: 'hidden' }}>
          {students.map((s, i) => (
            <React.Fragment key={s.id}>
              {i > 0 && <Divider />}
              <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, '&:hover': { bgcolor: 'grey.50' } }}>
                <Avatar sx={{ width: 40, height: 40 }}>
                  {(s.name || s.email || '?')[0].toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1" fontWeight="medium">{s.name || '(Sin nombre)'}</Typography>
                  <Typography variant="body2" color="text.secondary">{s.email}</Typography>
                </Box>
                <Chip
                  label={roleLabel[s.role?.toUpperCase()] || s.role || 'Estudiante'}
                  size="small"
                  color={roleColor[s.role?.toUpperCase()] || 'default'}
                />
                <Tooltip title="Cambiar rol">
                  <IconButton size="small" color="primary" onClick={() => setRoleDialog(s)}>
                    <PromoteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </React.Fragment>
          ))}
        </Paper>
      )}

      {roleDialog && (
        <ChangeRoleDialog
          open
          onClose={() => setRoleDialog(null)}
          onSaved={() => { setRoleDialog(null); fetchStudents(); }}
          target={roleDialog}
        />
      )}
    </Box>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PanelAdmin() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  if (!isAdminOrAbove(role)) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <AdminIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
        <Typography variant="h5" color="error" gutterBottom>Acceso Denegado</Typography>
        <Typography color="text.secondary">Solo los administradores pueden ver esta sección.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Administración de Usuarios</Typography>
        <Typography variant="body2" color="text.secondary">
          Supervisa profesores, revisa sus grupos asignados y gestiona los roles de usuarios.
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}
        >
          <Tab
            icon={<SchoolIcon />}
            iconPosition="start"
            label="Profesores"
          />
          <Tab
            icon={<PromoteIcon />}
            iconPosition="start"
            label="Gestión de Roles"
          />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && <TeachersTab />}
          {activeTab === 1 && <PromoteStudentsTab />}
        </Box>
      </Paper>
    </Box>
  );
}
