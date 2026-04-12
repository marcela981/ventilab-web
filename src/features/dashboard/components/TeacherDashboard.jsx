/**
 * =============================================================================
 * TeacherDashboard Component
 * =============================================================================
 * 
 * Dashboard específico para profesores con herramientas de gestión de contenido
 * y visualización de estadísticas de estudiantes.
 * 
 * Features:
 * - Acciones rápidas para crear módulos y lecciones
 * - Listado de módulos creados por el profesor
 * - Estadísticas agregadas de estudiantes
 * - Visualización de progreso de los estudiantes en sus módulos
 * - Protección con roles TEACHER y ADMIN
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
  CardActions,
  Typography,
  CircularProgress,
  Alert,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  Divider,
  Paper,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Add,
  School,
  MenuBook,
  People,
  TrendingUp,
  Edit,
  Delete,
  MoreVert,
  Visibility,
  AssessmentOutlined,
} from '@mui/icons-material';
import withAuth from '../hoc/withAuth';
import { useTeacherDashboard } from '@/features/dashboard/hooks/useDashboardData';

/**
 * TeacherDashboard Component
 * Muestra el dashboard personalizado para profesores
 */
const TeacherDashboard = () => {
  const router = useRouter();
  const { data, loading, error, refetch } = useTeacherDashboard();
  
  // ============================================================================
  // Estados locales para menús y diálogos
  // ============================================================================
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // ============================================================================
  // Manejadores de eventos para acciones rápidas
  // ============================================================================
  const handleCreateModule = () => {
    // Navegar a la ruta de creación de módulo
    router.push('/teaching/create-module');
  };

  const handleCreateLesson = () => {
    // Navegar a la ruta de creación de lección
    router.push('/teaching/create-lesson');
  };

  const handleViewModule = (moduleId) => {
    router.push(`/teaching?module=${moduleId}`);
  };

  const handleEditModule = (moduleId) => {
    router.push(`/teaching/edit-module/${moduleId}`);
  };

  // ============================================================================
  // Manejadores de menú contextual
  // ============================================================================
  const handleMenuOpen = (event, module) => {
    setAnchorEl(event.currentTarget);
    setSelectedModule(module);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedModule(null);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (selectedModule) {
      // Aquí iría la lógica de eliminación
      console.log('Deleting module:', selectedModule.id);
      // await deleteModule(selectedModule.id);
      setDeleteDialogOpen(false);
      setSelectedModule(null);
      refetch();
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header del Dashboard */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Panel del Profesor
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestiona tu contenido educativo y monitorea el progreso de tus estudiantes
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* =================================================================== */}
        {/* CARD 1: Acciones Rápidas */}
        {/* =================================================================== */}
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Add />
                </Avatar>
              }
              title="Acciones Rápidas"
              subheader="Crear nuevo contenido"
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Botón para crear módulo */}
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<School />}
                  onClick={handleCreateModule}
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  Crear Nuevo Módulo
                </Button>

                {/* Botón para crear lección */}
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  startIcon={<MenuBook />}
                  onClick={handleCreateLesson}
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  Crear Nueva Lección
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Estadísticas rápidas */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Tus Estadísticas
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
                  <Box textAlign="center">
                    <Typography variant="h5" color="primary.main">
                      {data.myModules.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Módulos
                    </Typography>
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="h5" color="secondary.main">
                      {data.studentStats.totalStudents}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Estudiantes
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* =================================================================== */}
        {/* CARD 2: Mis Módulos */}
        {/* =================================================================== */}
        <Grid item xs={12} md={8}>
          <Card elevation={3}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <School />
                </Avatar>
              }
              title="Mis Módulos"
              subheader={`${data.myModules.length} módulos creados`}
            />
            <CardContent>
              {data.myModules.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <School sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    Aún no has creado ningún módulo
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleCreateModule}
                    sx={{ mt: 2 }}
                  >
                    Crear Mi Primer Módulo
                  </Button>
                </Box>
              ) : (
                <List>
                  {data.myModules.map((module, index) => (
                    <React.Fragment key={module.id}>
                      <ListItem
                        disablePadding
                        secondaryAction={
                          <IconButton
                            edge="end"
                            onClick={(e) => handleMenuOpen(e, module)}
                          >
                            <MoreVert />
                          </IconButton>
                        }
                      >
                        <ListItemButton onClick={() => handleViewModule(module.id)}>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="subtitle1">
                                  {module.title}
                                </Typography>
                                <Chip
                                  label={module.difficulty || 'Intermedio'}
                                  size="small"
                                  color={
                                    module.difficulty === 'BEGINNER'
                                      ? 'success'
                                      : module.difficulty === 'ADVANCED'
                                      ? 'error'
                                      : 'primary'
                                  }
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Categoría: {module.category || 'Sin categoría'}
                                </Typography>
                                {module.description && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mt: 0.5 }}
                                  >
                                    {module.description.substring(0, 100)}
                                    {module.description.length > 100 ? '...' : ''}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                      {index < data.myModules.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
            {data.myModules.length > 0 && (
              <CardActions>
                <Button
                  size="small"
                  onClick={() => router.push('/teaching/my-modules')}
                >
                  Ver Todos
                </Button>
              </CardActions>
            )}
          </Card>
        </Grid>

        {/* =================================================================== */}
        {/* CARD 3: Estadísticas de Estudiantes */}
        {/* =================================================================== */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <People />
                </Avatar>
              }
              title="Estadísticas de Estudiantes"
              subheader="Rendimiento general de tus estudiantes"
            />
            <CardContent>
              <Grid container spacing={3}>
                {/* Total de estudiantes */}
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      bgcolor: 'background.default',
                      borderRadius: 2,
                    }}
                  >
                    <People sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" gutterBottom>
                      {data.studentStats.totalStudents}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total de Estudiantes
                    </Typography>
                  </Paper>
                </Grid>

                {/* Estudiantes activos */}
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      bgcolor: 'background.default',
                      borderRadius: 2,
                    }}
                  >
                    <TrendingUp sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="h4" gutterBottom>
                      {data.studentStats.activeStudents}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Estudiantes Activos
                    </Typography>
                  </Paper>
                </Grid>

                {/* Tasa de completitud */}
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      bgcolor: 'background.default',
                      borderRadius: 2,
                    }}
                  >
                    <AssessmentOutlined sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h4" gutterBottom>
                      {data.studentStats.completionRate}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tasa de Completitud
                    </Typography>
                  </Paper>
                </Grid>

                {/* Módulos completados */}
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      bgcolor: 'background.default',
                      borderRadius: 2,
                    }}
                  >
                    <School sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                    <Typography variant="h4" gutterBottom>
                      {data.myModules.filter(m => m.progress?.completed).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Módulos Completados
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Información adicional */}
              <Box sx={{ mt: 3 }}>
                <Alert severity="info">
                  Las estadísticas se actualizan en tiempo real conforme los estudiantes
                  completan tus módulos y lecciones.
                </Alert>
              </Box>

              {/* Botón para ver análisis detallado */}
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<Visibility />}
                  onClick={() => router.push('/teacher/analytics')}
                >
                  Ver Análisis Detallado
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* =================================================================== */}
      {/* Menú contextual para módulos */}
      {/* =================================================================== */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedModule) handleViewModule(selectedModule.id);
          handleMenuClose();
        }}>
          <Visibility sx={{ mr: 1 }} fontSize="small" />
          Ver Detalles
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedModule) handleEditModule(selectedModule.id);
          handleMenuClose();
        }}>
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Editar
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Eliminar
        </MenuItem>
      </Menu>

      {/* =================================================================== */}
      {/* Diálogo de confirmación de eliminación */}
      {/* =================================================================== */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar el módulo "{selectedModule?.title}"?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// ============================================================================
// Protección del componente con roles TEACHER y ADMIN
// ============================================================================
export default withAuth(TeacherDashboard, ['TEACHER', 'ADMIN']);

