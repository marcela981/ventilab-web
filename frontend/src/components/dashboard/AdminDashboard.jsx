/**
 * =============================================================================
 * AdminDashboard Component
 * =============================================================================
 * 
 * Dashboard específico para administradores con herramientas de gestión
 * del sistema, usuarios y visualización de estadísticas globales.
 * 
 * Features:
 * - Estadísticas globales del sistema (usuarios, módulos, lecciones)
 * - Gestión de usuarios (cambiar roles, desactivar usuarios)
 * - Tabla de usuarios con Material-UI
 * - Configuraciones del sistema
 * - Logs de auditoría (si están implementados)
 * - Protección con rol ADMIN
 * 
 * =============================================================================
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  AdminPanelSettings,
  People,
  School,
  MenuBook,
  TrendingUp,
  Edit,
  Delete,
  PersonAdd,
  Settings,
  Security,
  Assessment,
  Refresh,
  CheckCircle,
  Warning,
  Info,
} from '@mui/icons-material';
import withAuth from '../hoc/withAuth';
import { useAdminDashboard } from '../../hooks/useDashboardData';

/**
 * AdminDashboard Component
 * Muestra el dashboard personalizado para administradores
 */
const AdminDashboard = () => {
  const router = useRouter();
  const { data, loading, error, refetch, updateUserRole, deactivateUser } = useAdminDashboard();

  // ============================================================================
  // Estados locales para diálogos
  // ============================================================================
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // ============================================================================
  // Manejadores para gestión de usuarios
  // ============================================================================
  const handleChangeRoleClick = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setRoleDialogOpen(true);
  };

  const handleChangeRoleConfirm = async () => {
    if (selectedUser && newRole) {
      setActionLoading(true);
      const result = await updateUserRole(selectedUser.id, newRole);
      setActionLoading(false);

      if (result.success) {
        setRoleDialogOpen(false);
        setSelectedUser(null);
        setNewRole('');
      } else {
        alert(`Error al cambiar rol: ${result.error}`);
      }
    }
  };

  const handleDeactivateClick = (user) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleDeactivateConfirm = async () => {
    if (selectedUser) {
      setActionLoading(true);
      const result = await deactivateUser(selectedUser.id);
      setActionLoading(false);

      if (result.success) {
        setDeleteDialogOpen(false);
        setSelectedUser(null);
      } else {
        alert(`Error al desactivar usuario: ${result.error}`);
      }
    }
  };

  // ============================================================================
  // Función para obtener el color del chip según el rol
  // ============================================================================
  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'error';
      case 'TEACHER':
        return 'primary';
      case 'STUDENT':
        return 'success';
      default:
        return 'default';
    }
  };

  // ============================================================================
  // Estados de carga y error
  // ============================================================================
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error al cargar el dashboard: {error}
        </Alert>
        <Button variant="contained" onClick={() => refetch()}>
          Reintentar
        </Button>
      </Container>
    );
  }

  // ============================================================================
  // Renderizado del Dashboard
  // ============================================================================
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header del Dashboard */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Panel de Administración
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestiona el sistema, usuarios y monitorea estadísticas globales
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => refetch()}
        >
          Actualizar
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* =================================================================== */}
        {/* CARD 1: Estadísticas Globales del Sistema */}
        {/* =================================================================== */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Assessment />
                </Avatar>
              }
              title="Estadísticas Globales del Sistema"
              subheader="Resumen general de la plataforma"
            />
            <CardContent>
              <Grid container spacing={3}>
                {/* Total de usuarios */}
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      bgcolor: 'primary.main',
                      color: 'white',
                      borderRadius: 2,
                    }}
                  >
                    <People sx={{ fontSize: 50, mb: 1 }} />
                    <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {data.systemStats.totalUsers}
                    </Typography>
                    <Typography variant="body1">
                      Total de Usuarios
                    </Typography>
                  </Paper>
                </Grid>

                {/* Total de módulos */}
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      bgcolor: 'success.main',
                      color: 'white',
                      borderRadius: 2,
                    }}
                  >
                    <School sx={{ fontSize: 50, mb: 1 }} />
                    <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {data.systemStats.totalModules}
                    </Typography>
                    <Typography variant="body1">
                      Total de Módulos
                    </Typography>
                  </Paper>
                </Grid>

                {/* Total de lecciones */}
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      bgcolor: 'secondary.main',
                      color: 'white',
                      borderRadius: 2,
                    }}
                  >
                    <MenuBook sx={{ fontSize: 50, mb: 1 }} />
                    <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {data.systemStats.totalLessons}
                    </Typography>
                    <Typography variant="body1">
                      Total de Lecciones
                    </Typography>
                  </Paper>
                </Grid>

                {/* Usuarios activos */}
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      bgcolor: 'info.main',
                      color: 'white',
                      borderRadius: 2,
                    }}
                  >
                    <TrendingUp sx={{ fontSize: 50, mb: 1 }} />
                    <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {data.systemStats.activeUsers}
                    </Typography>
                    <Typography variant="body1">
                      Usuarios Activos
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* =================================================================== */}
        {/* CARD 2: Gestión de Usuarios */}
        {/* =================================================================== */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <People />
                </Avatar>
              }
              title="Gestión de Usuarios"
              subheader={`${data.users.length} usuarios registrados`}
              action={
                <Button
                  variant="contained"
                  startIcon={<PersonAdd />}
                  onClick={() => router.push('/admin/create-user')}
                >
                  Nuevo Usuario
                </Button>
              }
            />
            <CardContent>
              <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'background.default' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Rol</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Fecha de Registro</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                            No hay usuarios registrados
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.users.map((user) => (
                        <TableRow key={user.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {user.id.substring(0, 8)}...
                            </Typography>
                          </TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Chip
                              label={user.role}
                              color={getRoleColor(user.role)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString('es-ES')}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Cambiar Rol">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleChangeRoleClick(user)}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Desactivar Usuario">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeactivateClick(user)}
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* =================================================================== */}
        {/* CARD 3: Configuraciones del Sistema y Logs */}
        {/* =================================================================== */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <Settings />
                </Avatar>
              }
              title="Configuraciones del Sistema"
              subheader="Ajustes generales de la plataforma"
            />
            <CardContent>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Security color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Seguridad"
                    secondary="Configurar políticas de seguridad y autenticación"
                  />
                  <Button size="small" variant="outlined">
                    Configurar
                  </Button>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <AdminPanelSettings color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Permisos"
                    secondary="Gestionar roles y permisos de usuarios"
                  />
                  <Button size="small" variant="outlined">
                    Configurar
                  </Button>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon>
                    <Assessment color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Reportes"
                    secondary="Configurar generación de reportes automáticos"
                  />
                  <Button size="small" variant="outlined">
                    Configurar
                  </Button>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Logs de Auditoría */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <Assessment />
                </Avatar>
              }
              title="Logs de Auditoría"
              subheader="Actividad reciente del sistema"
            />
            <CardContent>
              <Alert severity="info" sx={{ mb: 2 }}>
                Sistema de logs de auditoría en desarrollo
              </Alert>

              {/* Logs de ejemplo - en producción estos vendrían de la API */}
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Usuario creado exitosamente"
                    secondary="Hace 2 horas"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Warning color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Intento de acceso no autorizado"
                    secondary="Hace 5 horas"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Info color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Módulo actualizado"
                    secondary="Hace 1 día"
                  />
                </ListItem>
              </List>

              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => router.push('/admin/audit-logs')}
              >
                Ver Todos los Logs
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* =================================================================== */}
      {/* Diálogo para cambiar rol de usuario */}
      {/* =================================================================== */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cambiar Rol de Usuario</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Usuario: <strong>{selectedUser?.name}</strong> ({selectedUser?.email})
            </Typography>
            <Typography variant="body2" gutterBottom sx={{ mb: 3 }}>
              Rol actual: <Chip label={selectedUser?.role} size="small" color={getRoleColor(selectedUser?.role)} />
            </Typography>

            <FormControl fullWidth>
              <InputLabel>Nuevo Rol</InputLabel>
              <Select
                value={newRole}
                label="Nuevo Rol"
                onChange={(e) => setNewRole(e.target.value)}
              >
                <MenuItem value="STUDENT">STUDENT</MenuItem>
                <MenuItem value="TEACHER">TEACHER</MenuItem>
                <MenuItem value="ADMIN">ADMIN</MenuItem>
              </Select>
            </FormControl>

            <Alert severity="warning" sx={{ mt: 2 }}>
              Cambiar el rol de un usuario puede afectar sus permisos y acceso a la plataforma.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleChangeRoleConfirm}
            variant="contained"
            disabled={actionLoading || newRole === selectedUser?.role}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Cambiar Rol'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =================================================================== */}
      {/* Diálogo para desactivar usuario */}
      {/* =================================================================== */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Desactivación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas desactivar al usuario <strong>{selectedUser?.name}</strong>?
          </Typography>
          <Alert severity="error" sx={{ mt: 2 }}>
            Esta acción puede ser reversible dependiendo de la configuración del sistema.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleDeactivateConfirm}
            color="error"
            variant="contained"
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Desactivar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// ============================================================================
// Protección del componente con rol ADMIN
// ============================================================================
export default withAuth(AdminDashboard, ['ADMIN']);

