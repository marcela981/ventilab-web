/**
 * =============================================================================
 * PanelStudentDetail - Student Detail View
 * =============================================================================
 * Page for viewing detailed student information and progress.
 *
 * Route: /panel/students/:id
 * Accessible to: teacher (only assigned students), admin, superuser
 *
 * Features:
 * - Student profile information
 * - Progress by module with visual indicators
 * - List of completed lessons
 * - Access denied handling for unauthorized teachers
 * =============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Chip,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Alert,
  Skeleton,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  School as SchoolIcon,
  Lock as LockIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import studentsService from '@/services/api/studentsService';

/**
 * Generates a color based on string hash
 */
const stringToColor = (str) => {
  if (!str) return '#1976d2';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#1976d2', '#388e3c', '#d32f2f', '#f57c00', '#7b1fa2',
    '#0097a7', '#c2185b', '#5d4037', '#455a64', '#00897b',
  ];
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Gets initials from a name
 */
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Gets progress color based on percentage
 */
const getProgressColor = (percentage) => {
  if (percentage >= 80) return 'success';
  if (percentage >= 50) return 'primary';
  if (percentage >= 25) return 'warning';
  return 'error';
};

/**
 * Formats time spent in minutes to a readable string
 */
const formatTimeSpent = (minutes) => {
  if (!minutes || minutes === 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}min`;
};

/**
 * PanelStudentDetail Component
 */
export default function PanelStudentDetail() {
  const { id: studentId } = useParams();
  const navigate = useNavigate();
  const { user, isTeacher, isAdmin, isSuperuser } = useAuth();

  // State
  const [studentData, setStudentData] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Determine if user can see all students
  const canSeeAllStudents = isAdmin() || isSuperuser();

  /**
   * Check if teacher has access to this student
   */
  const checkAccess = useCallback(async () => {
    if (canSeeAllStudents) return true;

    try {
      const result = await studentsService.checkStudentAssignment(studentId);
      return result.success && result.data?.isAssigned;
    } catch {
      return false;
    }
  }, [studentId, canSeeAllStudents]);

  /**
   * Fetch student data and progress
   */
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAccessDenied(false);

    try {
      // First check access for teachers
      if (!canSeeAllStudents) {
        const hasAccess = await checkAccess();
        if (!hasAccess) {
          setAccessDenied(true);
          setIsLoading(false);
          return;
        }
      }

      // Fetch student details
      const studentResult = await studentsService.getStudentById(studentId);

      if (!studentResult.success) {
        if (studentResult.error?.statusCode === 403) {
          setAccessDenied(true);
        } else {
          setError(studentResult.error?.message || 'Error al cargar datos del estudiante');
        }
        setIsLoading(false);
        return;
      }

      setStudentData(studentResult.data.student);

      // Fetch detailed progress
      const progressResult = await studentsService.getStudentProgress(user?.id, studentId);

      if (progressResult.success) {
        setProgressData(progressResult.data);
      }
      // Progress fetch failure is not critical, student info can still be shown
    } catch (err) {
      console.error('[PanelStudentDetail] Error:', err);
      setError('Error de conexión. Por favor, intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [studentId, user?.id, canSeeAllStudents, checkAccess]);

  // Fetch data on mount
  useEffect(() => {
    if (user?.id && studentId) {
      fetchData();
    }
  }, [fetchData, user?.id, studentId]);

  /**
   * Handle back button click
   */
  const handleBack = () => {
    navigate('/panel/students');
  };

  // Access Denied State
  if (accessDenied) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 3 }}
        >
          Volver a la lista
        </Button>

        <Paper
          elevation={0}
          sx={{
            p: 4,
            border: '1px solid',
            borderColor: 'error.light',
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <LockIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="error">
            Acceso Denegado
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            No tienes permiso para ver la información de este estudiante.
            Solo puedes acceder a los estudiantes que te han sido asignados.
          </Typography>
          <Button variant="contained" onClick={handleBack}>
            Volver a mis estudiantes
          </Button>
        </Paper>
      </Box>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="rectangular" width={150} height={36} sx={{ mb: 3 }} />

        <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'grey.200' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Skeleton variant="circular" width={80} height={80} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="40%" height={32} />
              <Skeleton variant="text" width="30%" height={24} />
              <Skeleton variant="text" width="25%" height={24} />
            </Box>
          </Box>
        </Paper>

        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} md={4} key={i}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // Error State
  if (error) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 3 }}
        >
          Volver a la lista
        </Button>

        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>

        <Button variant="outlined" onClick={fetchData}>
          Reintentar
        </Button>
      </Box>
    );
  }

  // No data
  if (!studentData) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 3 }}
        >
          Volver a la lista
        </Button>

        <Alert severity="warning">
          No se encontró información del estudiante.
        </Alert>
      </Box>
    );
  }

  const { stats = {} } = studentData;
  const modules = progressData?.modules || [];
  const overall = progressData?.overall || stats;

  const overallProgress = stats.progressPercentage || 0;
  const totalCompletedLessons = overall.totalCompletedLessons || stats.completedLessons || 0;
  const totalTimeSpent = overall.totalTimeSpent || stats.totalTimeSpent || 0;
  const lastAccess = overall.lastAccess || stats.lastAccess;

  return (
    <Box>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={handleBack}
        sx={{ mb: 3 }}
      >
        Volver a la lista
      </Button>

      {/* Student Profile Card */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          border: '1px solid',
          borderColor: 'grey.200',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <Avatar
            sx={{
              bgcolor: stringToColor(studentData.name),
              width: 80,
              height: 80,
              fontSize: '1.75rem',
              fontWeight: 'bold',
            }}
            src={studentData.image}
          >
            {getInitials(studentData.name)}
          </Avatar>

          {/* Info */}
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              {studentData.name || 'Sin nombre'}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <EmailIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {studentData.email}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Registrado el {format(new Date(studentData.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es })}
              </Typography>
            </Box>
          </Box>

          {/* Overall Progress */}
          <Box sx={{ textAlign: 'center', minWidth: 150 }}>
            <Box
              sx={{
                position: 'relative',
                display: 'inline-flex',
                mb: 1,
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  border: '6px solid',
                  borderColor: `${getProgressColor(overallProgress)}.main`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h5" fontWeight="bold">
                  {overallProgress}%
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Progreso General
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {totalCompletedLessons}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Lecciones Completadas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TimeIcon color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {formatTimeSpent(totalTimeSpent)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tiempo de Estudio
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrendingUpIcon color="warning" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {lastAccess
                      ? formatDistanceToNow(new Date(lastAccess), { addSuffix: true, locale: es })
                      : 'Sin actividad'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Última Actividad
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Progress by Module */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: 'grey.200',
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Progreso por Módulo
        </Typography>

        {modules.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <SchoolIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography variant="body1" color="text.secondary">
              No hay datos de progreso disponibles.
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {modules.map((module, index) => (
              <React.Fragment key={module.moduleId}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{
                    py: 2,
                    px: 0,
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: { xs: 1, sm: 2 },
                  }}
                >
                  <ListItemText
                    primary={module.moduleTitle}
                    secondary={`${module.completedLessons} de ${module.totalLessons} lecciones`}
                    sx={{ flex: { xs: '1 1 100%', sm: '1 1 auto' }, minWidth: { sm: 200 } }}
                  />

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      width: { xs: '100%', sm: 'auto' },
                      minWidth: { sm: 200 },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 100 }}>
                      <LinearProgress
                        variant="determinate"
                        value={module.completionPercentage}
                        color={getProgressColor(module.completionPercentage)}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                    <Chip
                      label={`${module.completionPercentage}%`}
                      size="small"
                      color={getProgressColor(module.completionPercentage)}
                      sx={{ minWidth: 60 }}
                    />
                  </Box>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}
