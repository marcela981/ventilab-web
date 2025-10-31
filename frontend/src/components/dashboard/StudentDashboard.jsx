/**
 * =============================================================================
 * StudentDashboard Component
 * =============================================================================
 * 
 * Dashboard específico para estudiantes con información personalizada sobre
 * su progreso de aprendizaje, lecciones recomendadas y estadísticas.
 * 
 * Features:
 * - Visualización del progreso de módulos completados
 * - Recomendaciones de lecciones basadas en progreso
 * - Estadísticas personales (tiempo de estudio, promedio, etc.)
 * - Integración con LearningProgressContext
 * - Protección con role STUDENT
 * 
 * =============================================================================
 */

import React, { useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  LinearProgress,
  CircularProgress,
  Alert,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Paper,
  Avatar,
} from '@mui/material';
import {
  School,
  TrendingUp,
  AccessTime,
  CheckCircle,
  PlayArrow,
  EmojiEvents,
  MenuBook,
} from '@mui/icons-material';
import withAuth from '../hoc/withAuth';
import { useLearningProgress } from '../../contexts/LearningProgressContext';
import { useStudentDashboard } from '../../hooks/useDashboardData';

/**
 * StudentDashboard Component
 * Muestra el dashboard personalizado para estudiantes
 */
const StudentDashboard = () => {
  const router = useRouter();
  const { data, loading, error } = useStudentDashboard();
  const { completedLessons, quizScores, timeSpent, flashcards } = useLearningProgress();

  // ============================================================================
  // Cálculos de estadísticas desde el contexto local
  // ============================================================================
  const localStats = useMemo(() => {
    const completedCount = completedLessons.size;
    const scores = Object.values(quizScores);
    const averageScore = scores.length > 0
      ? scores.reduce((acc, score) => acc + score, 0) / scores.length
      : 0;

    return {
      lessonsCompleted: completedCount,
      averageScore: averageScore.toFixed(1),
      timeSpent: Math.floor(timeSpent / 60), // Convertir a minutos
      flashcardsTotal: flashcards.length,
    };
  }, [completedLessons, quizScores, timeSpent, flashcards]);

  // ============================================================================
  // Manejadores de eventos
  // ============================================================================
  const handleLessonClick = (moduleId, lessonId) => {
    router.push(`/teaching/${moduleId}/${lessonId}`);
  };

  const handleViewAllModules = () => {
    router.push('/teaching');
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
        <Button variant="contained" onClick={() => window.location.reload()}>
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
          Mi Panel de Aprendizaje
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Bienvenido a tu espacio de aprendizaje personalizado
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* =================================================================== */}
        {/* CARD 1: Progreso de Aprendizaje */}
        {/* =================================================================== */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <School />
                </Avatar>
              }
              title="Progreso de Aprendizaje"
              subheader="Tu avance en los módulos"
            />
            <CardContent>
              {/* Módulos completados */}
              <Box sx={{ mb: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Módulos Completados
                  </Typography>
                  <Typography variant="h6" color="primary.main">
                    {data.statistics.modulesCompleted} / {data.modules.length}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={
                    data.modules.length > 0
                      ? (data.statistics.modulesCompleted / data.modules.length) * 100
                      : 0
                  }
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              {/* Lecciones completadas desde el contexto */}
              <Box sx={{ mb: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Lecciones Completadas
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {localStats.lessonsCompleted}
                  </Typography>
                </Box>
              </Box>

              {/* Lista de módulos recientes */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Módulos Disponibles
              </Typography>
              <List dense>
                {data.modules.slice(0, 3).map((module) => (
                  <ListItem
                    key={module.id}
                    disablePadding
                    secondaryAction={
                      module.progress?.completed ? (
                        <Chip
                          icon={<CheckCircle />}
                          label="Completado"
                          size="small"
                          color="success"
                        />
                      ) : null
                    }
                  >
                    <ListItemButton onClick={() => router.push(`/teaching?module=${module.id}`)}>
                      <ListItemText
                        primary={module.title}
                        secondary={module.category}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>

              <Button
                fullWidth
                variant="outlined"
                onClick={handleViewAllModules}
                sx={{ mt: 2 }}
              >
                Ver Todos los Módulos
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* =================================================================== */}
        {/* CARD 2: Lecciones Recomendadas */}
        {/* =================================================================== */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <MenuBook />
                </Avatar>
              }
              title="Lecciones Recomendadas"
              subheader="Continúa tu aprendizaje"
            />
            <CardContent>
              {data.recommendedLessons.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography variant="body2" color="text.secondary">
                    ¡Excelente! Has completado todas las lecciones disponibles.
                  </Typography>
                  <EmojiEvents sx={{ fontSize: 60, color: 'warning.main', mt: 2 }} />
                </Box>
              ) : (
                <List>
                  {data.recommendedLessons.map((lesson, index) => (
                    <React.Fragment key={lesson.id}>
                      <ListItem
                        disablePadding
                        secondaryAction={
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<PlayArrow />}
                            onClick={() => handleLessonClick(lesson.moduleId, lesson.id)}
                          >
                            Iniciar
                          </Button>
                        }
                      >
                        <ListItemButton>
                          <ListItemText
                            primary={lesson.title}
                            secondary={
                              <>
                                <Chip
                                  label={lesson.difficulty || 'Intermedio'}
                                  size="small"
                                  sx={{ mr: 1, mt: 0.5 }}
                                />
                                {lesson.estimatedTime && (
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    <AccessTime
                                      sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }}
                                    />
                                    {lesson.estimatedTime} min
                                  </Typography>
                                )}
                              </>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                      {index < data.recommendedLessons.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* =================================================================== */}
        {/* CARD 3: Estadísticas Personales */}
        {/* =================================================================== */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <TrendingUp />
                </Avatar>
              }
              title="Estadísticas Personales"
              subheader="Tu rendimiento general"
            />
            <CardContent>
              <Grid container spacing={3}>
                {/* Tiempo de estudio */}
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
                    <AccessTime sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" gutterBottom>
                      {localStats.timeSpent}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Minutos de Estudio
                    </Typography>
                  </Paper>
                </Grid>

                {/* Lecciones completadas */}
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
                    <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="h4" gutterBottom>
                      {localStats.lessonsCompleted}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Lecciones Completadas
                    </Typography>
                  </Paper>
                </Grid>

                {/* Promedio de calificaciones */}
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
                    <TrendingUp sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h4" gutterBottom>
                      {localStats.averageScore}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Promedio de Quizzes
                    </Typography>
                  </Paper>
                </Grid>

                {/* Flashcards */}
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
                      {localStats.flashcardsTotal}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Flashcards Creadas
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Botón de acción para ver estadísticas detalladas */}
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => router.push('/flashcards')}
                >
                  Ver Estadísticas Detalladas
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

// ============================================================================
// Protección del componente con role STUDENT
// ============================================================================
export default withAuth(StudentDashboard, ['STUDENT']);

