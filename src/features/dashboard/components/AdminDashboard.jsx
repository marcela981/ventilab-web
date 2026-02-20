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
 * - Sistema completo de gestión de usuarios con:
 *   - Búsqueda en tiempo real con debounce
 *   - Filtros avanzados por rol, estado y fecha
 *   - Tabla responsive con paginación y ordenamiento
 *   - Modales para crear, editar y eliminar usuarios
 *   - Confirmaciones para acciones destructivas
 * - Configuraciones del sistema
 * - Logs de auditoría
 * - Protección con rol ADMIN
 * - Notificaciones con Snackbar
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
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Fab,
  Snackbar,
} from '@mui/material';
import {
  AdminPanelSettings,
  People,
  School,
  MenuBook,
  TrendingUp,
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
import { useAdminDashboard } from '@/features/dashboard/hooks/useDashboardData';
import useUserManagement from '@/features/admin/hooks/useUserManagement';

// Importar componentes modulares de gestión de usuarios
import UserFilters from '../admin/UserFilters';
import UserSearchBar from '../admin/UserSearchBar';
import UsersTable from '../admin/UsersTable';
import UserEditModal from '../admin/UserEditModal';
import UserCreateModal from '../admin/UserCreateModal';
import ConfirmationDialog from '../admin/ConfirmationDialog';

/**
 * AdminDashboard Component
 * Muestra el dashboard personalizado para administradores con gestión completa de usuarios
 */
const AdminDashboard = () => {
  const router = useRouter();
  const { data, loading, error, refetch } = useAdminDashboard();

  // ============================================================================
  // Hook de Gestión de Usuarios
  // ============================================================================
  const {
    // Datos de usuarios
    users,
    totalUsers,
    totalPages,

    // Paginación
    page,
    setPage,
    pageSize,
    setPageSize,

    // Filtros
    filters,
    setFilters,
    clearFilters,
    searchQuery,
    setSearchQuery,

    // Estados de carga
    loading: usersLoading,
    isUpdatingRole,
    isUpdatingStatus,
    isDeleting,
    isCreating,
    isResettingPassword,

    // Funciones de gestión
    updateUserRole,
    toggleUserStatus,
    deleteUser,
    createUser,
    resetUserPassword,
    refetch: refetchUsers,
  } = useUserManagement();

  // ============================================================================
  // Estados Locales para Modales y Diálogos
  // ============================================================================

  // Modal de Editar Usuario
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);

  // Modal de Crear Usuario
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Dialog de Confirmación
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState({
    title: '',
    description: '',
    confirmText: '',
    confirmColor: 'error',
    onConfirm: null,
    extraContent: null,
  });

  // Usuario seleccionado para acciones
  const [selectedUser, setSelectedUser] = useState(null);

  // Estados de ordenamiento
  const [orderBy, setOrderBy] = useState('name');
  const [order, setOrder] = useState('asc');

  // ============================================================================
  // Estados de Notificaciones (Snackbar)
  // ============================================================================
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success', // 'success' | 'error' | 'warning' | 'info'
  });

  /**
   * Muestra una notificación
   *
   * @param {string} message - Mensaje a mostrar
   * @param {'success'|'error'|'warning'|'info'} severity - Tipo de notificación
   */
  const showNotification = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  /**
   * Cierra la notificación
   */
  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // ============================================================================
  // Manejadores de Filtros
  // ============================================================================

  /**
   * Maneja el cambio en el filtro de rol
   */
  const handleRoleFilterChange = (role) => {
    setFilters({ role: role === 'ALL' ? null : role });
  };

  /**
   * Maneja el cambio en el filtro de estado
   */
  const handleStatusFilterChange = (status) => {
    setFilters({
      isActive: status === 'all' ? null : status === 'active',
    });
  };

  /**
   * Maneja el cambio en el filtro de fecha
   */
  const handleDateFilterChange = (dateFilter) => {
    setFilters({
      dateFrom: dateFilter.dateFrom ? dateFilter.dateFrom.toISOString() : null,
      dateTo: dateFilter.dateTo ? dateFilter.dateTo.toISOString() : null,
    });
  };

  /**
   * Limpia todos los filtros
   */
  const handleClearFilters = () => {
    clearFilters();
  };

  // ============================================================================
  // Manejadores de Ordenamiento
  // ============================================================================

  /**
   * Maneja el cambio de ordenamiento
   */
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // ============================================================================
  // Manejadores de Paginación
  // ============================================================================

  /**
   * Maneja el cambio de página
   */
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  /**
   * Maneja el cambio de filas por página
   */
  const handleRowsPerPageChange = (event) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  // ============================================================================
  // Manejadores de Acciones de Usuario
  // ============================================================================

  /**
   * Abre el modal de edición de usuario
   */
  const handleEditUser = (user) => {
    setSelectedUserForEdit(user);
    setEditModalOpen(true);
  };

  /**
   * Guarda los cambios del usuario editado
   */
  const handleSaveUserEdit = async (updatedData) => {
    const success = await updateUserRole(updatedData.id, updatedData.role);

    if (success) {
      showNotification('Usuario actualizado exitosamente', 'success');
      setEditModalOpen(false);
      setSelectedUserForEdit(null);
      await refetchUsers();
    } else {
      showNotification('Error al actualizar el usuario', 'error');
      throw new Error('Error al actualizar el usuario');
    }
  };

  /**
   * Abre el modal de creación de usuario
   */
  const handleCreateUserClick = () => {
    setCreateModalOpen(true);
  };

  /**
   * Crea un nuevo usuario
   */
  const handleCreateUser = async (userData) => {
    const result = await createUser(userData);

    if (result.success) {
      showNotification('Usuario creado exitosamente', 'success');
      // No cerramos el modal aquí, el UserCreateModal lo maneja internamente
      await refetchUsers();
    } else {
      showNotification(result.error || 'Error al crear el usuario', 'error');
      throw new Error(result.error || 'Error al crear el usuario');
    }
  };

  /**
   * Abre el diálogo de confirmación para activar/desactivar usuario
   */
  const handleToggleUserStatus = (user) => {
    setSelectedUser(user);
    setConfirmDialogConfig({
      title: user.isActive ? 'Desactivar Cuenta' : 'Activar Cuenta',
      description: user.isActive
        ? `¿Estás seguro de que deseas desactivar la cuenta de ${user.name}? El usuario no podrá iniciar sesión mientras su cuenta esté inactiva.`
        : `¿Estás seguro de que deseas activar la cuenta de ${user.name}? El usuario podrá iniciar sesión nuevamente.`,
      confirmText: user.isActive ? 'Desactivar' : 'Activar',
      confirmColor: user.isActive ? 'error' : 'primary',
      onConfirm: async () => {
        const success = await toggleUserStatus(user.id, !user.isActive);
        if (success) {
          showNotification(
            `Cuenta ${user.isActive ? 'desactivada' : 'activada'} exitosamente`,
            'success'
          );
          setConfirmDialogOpen(false);
          await refetchUsers();
        } else {
          showNotification(
            `Error al ${user.isActive ? 'desactivar' : 'activar'} la cuenta`,
            'error'
          );
        }
      },
      extraContent: user.isActive ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          Podrás reactivar la cuenta en cualquier momento desde el panel de usuarios.
        </Alert>
      ) : null,
    });
    setConfirmDialogOpen(true);
  };

  /**
   * Muestra las estadísticas del usuario
   */
  const handleViewStats = (user) => {
    // TODO: Implementar vista de estadísticas
    showNotification('Vista de estadísticas en desarrollo', 'info');
    console.log('Ver estadísticas de:', user);
  };

  /**
   * Abre el diálogo de confirmación para resetear contraseña
   */
  const handleResetPassword = (user) => {
    setSelectedUser(user);
    setConfirmDialogConfig({
      title: 'Resetear Contraseña',
      description: `Se enviará un email a ${user.email} con instrucciones para crear una nueva contraseña. ¿Deseas continuar?`,
      confirmText: 'Enviar Email',
      confirmColor: 'primary',
      onConfirm: async () => {
        const result = await resetUserPassword(user.id);
        if (result.success) {
          showNotification('Email de recuperación enviado exitosamente', 'success');
          setConfirmDialogOpen(false);
        } else {
          showNotification(result.error || 'Error al enviar el email', 'error');
        }
      },
      extraContent: null,
    });
    setConfirmDialogOpen(true);
  };

  /**
   * Muestra el historial del usuario
   */
  const handleViewHistory = (user) => {
    // TODO: Implementar vista de historial
    showNotification('Vista de historial en desarrollo', 'info');
    console.log('Ver historial de:', user);
  };

  /**
   * Abre el diálogo de confirmación para eliminar usuario
   */
  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setConfirmDialogConfig({
      title: 'Eliminar Usuario',
      description: `¿Estás seguro de que deseas eliminar permanentemente al usuario ${user.name}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      confirmColor: 'error',
      onConfirm: async () => {
        const result = await deleteUser(user.id);
        if (result.success) {
          showNotification('Usuario eliminado exitosamente', 'success');
          setConfirmDialogOpen(false);
          await refetchUsers();
        } else {
          showNotification(
            result.error || 'Error al eliminar el usuario',
            'error'
          );
        }
      },
      extraContent: (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Se eliminarán también todos los datos asociados a este usuario, incluyendo su
          progreso en módulos y lecciones.
        </Alert>
      ),
    });
    setConfirmDialogOpen(true);
  };

  // ============================================================================
  // Estados de Carga y Error Iniciales
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
  // Conversión de Filtros para los Componentes
  // ============================================================================

  const roleFilter = filters.role || 'ALL';
  const statusFilter = filters.isActive === null ? 'all' : filters.isActive ? 'active' : 'inactive';
  const dateFilter = {
    type: filters.dateFrom || filters.dateTo ? 'custom_range' : 'all',
    dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : null,
    dateTo: filters.dateTo ? new Date(filters.dateTo) : null,
  };

  // ============================================================================
  // Renderizado del Dashboard
  // ============================================================================

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* ===================================================================== */}
      {/* Header del Dashboard */}
      {/* ===================================================================== */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Panel de Administración
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestiona el sistema, usuarios y monitorea estadísticas globales
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={() => refetch()}>
          Actualizar
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* =================================================================== */}
        {/* CARD 1: Gestión Completa de Usuarios */}
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
              subheader={`${totalUsers} usuarios registrados`}
              action={
                <Tooltip title="Crear Usuario">
                  <Fab
                    color="primary"
                    size="small"
                    onClick={handleCreateUserClick}
                    sx={{ boxShadow: 2 }}
                  >
                    <PersonAdd />
                  </Fab>
                </Tooltip>
              }
            />
            <CardContent>
              {/* Barra de Búsqueda */}
              <UserSearchBar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                resultsCount={totalUsers}
                isSearching={usersLoading}
              />

              {/* Filtros */}
              <UserFilters
                roleFilter={roleFilter}
                statusFilter={statusFilter}
                dateFilter={dateFilter}
                onRoleChange={handleRoleFilterChange}
                onStatusChange={handleStatusFilterChange}
                onDateChange={handleDateFilterChange}
                onClearFilters={handleClearFilters}
              />

              {/* Tabla de Usuarios */}
              <UsersTable
                users={users}
                onEdit={handleEditUser}
                onToggleStatus={handleToggleUserStatus}
                onViewStats={handleViewStats}
                onResetPassword={handleResetPassword}
                onViewHistory={handleViewHistory}
                onDelete={handleDeleteUser}
                orderBy={orderBy}
                order={order}
                onRequestSort={handleRequestSort}
                page={page}
                rowsPerPage={pageSize}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
                totalUsers={totalUsers}
                isLoading={usersLoading}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* =================================================================== */}
        {/* CARD 2: Estadísticas Globales del Sistema */}
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
                    <Typography variant="body1">Total de Usuarios</Typography>
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
                    <Typography variant="body1">Total de Módulos</Typography>
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
                    <Typography variant="body1">Total de Lecciones</Typography>
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
                    <Typography variant="body1">Usuarios Activos</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* =================================================================== */}
        {/* CARD 3: Configuraciones del Sistema */}
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

        {/* =================================================================== */}
        {/* CARD 4: Logs de Auditoría */}
        {/* =================================================================== */}
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
                  <ListItemText primary="Módulo actualizado" secondary="Hace 1 día" />
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

      {/* ===================================================================== */}
      {/* Modales y Diálogos */}
      {/* ===================================================================== */}

      {/* Modal de Editar Usuario */}
      <UserEditModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedUserForEdit(null);
        }}
        user={selectedUserForEdit}
        onSave={handleSaveUserEdit}
        isSaving={isUpdatingRole}
      />

      {/* Modal de Crear Usuario */}
      <UserCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateUser}
        isCreating={isCreating}
      />

      {/* Dialog de Confirmación */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        title={confirmDialogConfig.title}
        description={confirmDialogConfig.description}
        confirmText={confirmDialogConfig.confirmText}
        confirmColor={confirmDialogConfig.confirmColor}
        onConfirm={confirmDialogConfig.onConfirm}
        isLoading={isUpdatingStatus || isDeleting || isResettingPassword}
        extraContent={confirmDialogConfig.extraContent}
      />

      {/* ===================================================================== */}
      {/* Snackbar de Notificaciones */}
      {/* ===================================================================== */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

// ============================================================================
// Protección del componente con rol ADMIN
// ============================================================================
export default withAuth(AdminDashboard, ['ADMIN']);
