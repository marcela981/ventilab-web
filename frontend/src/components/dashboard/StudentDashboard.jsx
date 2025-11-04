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
 * - Integración con sistema de niveles (BEGINNER, INTERMEDIATE, ADVANCED)
 * - Progreso hacia siguiente nivel con métricas detalladas
 * - Promoción automática cuando se cumplen criterios
 * - Protección con role STUDENT
 *
 * =============================================================================
 */

import React, { useMemo, useState, useEffect } from 'react';
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
  Skeleton,
  AlertTitle,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  School,
  TrendingUp,
  AccessTime,
  CheckCircle,
  PlayArrow,
  EmojiEvents,
  MenuBook,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  LocalFlorist as BeginnerIcon,
  School as IntermediateIcon,
  Star as AdvancedIcon,
} from '@mui/icons-material';
import withAuth from '../hoc/withAuth';
import { useLearningProgress } from '../../contexts/LearningProgressContext';
import { useStudentDashboard } from '../../hooks/useDashboardData';
import { useAuth } from '../../hooks/useAuth';
import { LevelBadge } from '../common/LevelBadge';
import AchievementsDashboard from '../gamification/AchievementsDashboard';

/**
 * Get level color based on difficulty
 */
const getLevelColor = (level) => {
  const colors = {
    BEGINNER: 'success',
    INTERMEDIATE: 'info',
    ADVANCED: 'warning',
  };
  return colors[level] || 'default';
};

/**
 * Get level icon based on difficulty
 */
const getLevelIcon = (level) => {
  const icons = {
    BEGINNER: BeginnerIcon,
    INTERMEDIATE: IntermediateIcon,
    ADVANCED: AdvancedIcon,
  };
  return icons[level] || School;
};

/**
 * StudentDashboard Component
 * Muestra el dashboard personalizado para estudiantes
 */
const StudentDashboard = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading, error } = useStudentDashboard();
  const { completedLessons, quizScores, timeSpent, flashcards } = useLearningProgress();

  // ============================================================================
  // Estado para nivel y evaluación
  // ============================================================================
  const [levelData, setLevelData] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [loadingLevel, setLoadingLevel] = useState(true);
  const [showLevelAlert, setShowLevelAlert] = useState(true);
  const [promotingLevel, setPromotingLevel] = useState(false);

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
  // Cargar datos de nivel y evaluación
  // ============================================================================
  useEffect(() => {
    const fetchLevelData = async () => {
      if (!user?.id) return;

      try {
        setLoadingLevel(true);

        // Obtener evaluación de nivel
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/${user.id}/evaluate-level`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setEvaluation(result.data.evaluation);
            setLevelData({
              currentLevel: result.data.evaluation.currentLevel,
              progressToNextLevel: calculateProgressPercentage(result.data.evaluation.metrics),
            });
          }
        }
      } catch (error) {
        console.error('Error fetching level data:', error);
      } finally {
        setLoadingLevel(false);
      }
    };

    fetchLevelData();
  }, [user?.id]);

  /**
   * Calculate progress percentage to next level
   */
  const calculateProgressPercentage = (metrics) => {
    if (!metrics) return 0;

    const currentLevel = user?.userLevel || 'BEGINNER';

    if (currentLevel === 'BEGINNER') {
      // Criterios para BEGINNER -> INTERMEDIATE
      const lessonsProgress = Math.min((metrics.lessonsByDifficulty.BEGINNER / 5) * 100, 100);
      const scoreProgress = Math.min((metrics.averageQuizScore / 80) * 100, 100);
      const efficiencyProgress = Math.min((metrics.averageTimeEfficiency / 80) * 100, 100);

      return Math.floor((lessonsProgress + scoreProgress + efficiencyProgress) / 3);
    } else if (currentLevel === 'INTERMEDIATE') {
      // Criterios para INTERMEDIATE -> ADVANCED
      const lessonsProgress = Math.min((metrics.lessonsByDifficulty.INTERMEDIATE / 8) * 100, 100);
      const scoreProgress = Math.min((metrics.averageQuizScore / 85) * 100, 100);
      const recentScoreProgress = metrics.recentLessonsScore
        ? Math.min((metrics.recentLessonsScore / 85) * 100, 100)
        : 0;
      const consistencyProgress = Math.min((metrics.consistencyScore / 70) * 100, 100);

      return Math.floor((lessonsProgress + scoreProgress + recentScoreProgress + consistencyProgress) / 4);
    } else {
      // ADVANCED - ya está en el nivel máximo
      return 100;
    }
  };

  // ============================================================================
  // Manejar promoción de nivel
  // ============================================================================
  const handlePromoteLevel = async () => {
    if (!user?.id || !evaluation?.shouldLevelUp) return;

    try {
      setPromotingLevel(true);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${user.id}/evaluate-level?autoApply=true`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.applied) {
          // Mostrar mensaje de éxito y recargar
          alert(`¡Felicidades! Has avanzado a nivel ${result.data.evaluation.suggestedLevel}`);
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error promoting level:', error);
      alert('Error al promover nivel. Por favor, intenta nuevamente.');
    } finally {
      setPromotingLevel(false);
    }
  };

  // ============================================================================
  // Manejadores de eventos
  // ============================================================================
  const handleLessonClick = (moduleId, lessonId) => {
    router.push(`/teaching/${moduleId}/${lessonId}`);
  };

  const handleViewAllModules = () => {
    router.push('/teaching');
  };

  const handleManageLevel = () => {
    router.push('/settings');
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

  const currentLevel = user?.userLevel || 'BEGINNER';

  // ============================================================================
  // Renderizado del Dashboard
  // ============================================================================
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header del Dashboard con LevelBadge */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
              Mi Panel de Aprendizaje
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Bienvenido a tu espacio de aprendizaje personalizado
            </Typography>
          </Box>

          {/* Level Badge en el header */}
          {loadingLevel ? (
            <Skeleton variant="rectangular" width={200} height={60} />
          ) : levelData ? (
            <LevelBadge
              level={currentLevel}
              size="medium"
              showProgressBar={true}
              progressToNextLevel={levelData.progressToNextLevel}
            />
          ) : null}
        </Box>
      </Box>

      {/* Alert de promoción de nivel (si es elegible) */}
      {evaluation?.shouldLevelUp && showLevelAlert && (
        <Collapse in={showLevelAlert}>
          <Alert
            severity="success"
            icon={<EmojiEvents />}
            sx={{ mb: 3 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setShowLevelAlert(false)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            <AlertTitle>¡Felicidades! Estás listo para avanzar de nivel</AlertTitle>
            {evaluation.reason}
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={handlePromoteLevel}
                disabled={promotingLevel}
              >
                {promotingLevel ? 'Avanzando...' : `Avanzar a ${evaluation.suggestedLevel}`}
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="success"
                onClick={() => setShowLevelAlert(false)}
              >
                No por ahora
              </Button>
            </Box>
          </Alert>
        </Collapse>
      )}

      <Grid container spacing={3}>
        {/* =================================================================== */}
        {/* CARD: Logros Recientes */}
        {/* =================================================================== */}
        <Grid item xs={12} md={4}>
          <AchievementsDashboard />
        </Grid>

        {/* =================================================================== */}
        {/* CARD: Tu Nivel */}
        {/* =================================================================== */}
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%', minHeight: 400 }}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: getLevelColor(currentLevel) + '.main' }}>
                  {React.createElement(getLevelIcon(currentLevel))}
                </Avatar>
              }
              title="Tu Nivel de Aprendizaje"
              subheader="Personaliza tu experiencia"
              action={
                <IconButton onClick={handleManageLevel}>
                  <SettingsIcon />
                </IconButton>
              }
            />
            <CardContent>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="h3" gutterBottom sx={{ fontWeight: 600 }}>
                  {currentLevel === 'BEGINNER' ? 'Principiante' :
                   currentLevel === 'INTERMEDIATE' ? 'Intermedio' : 'Avanzado'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {currentLevel === 'BEGINNER' && 'Aprendiendo los fundamentos paso a paso'}
                  {currentLevel === 'INTERMEDIATE' && 'Profundizando en casos clínicos reales'}
                  {currentLevel === 'ADVANCED' && 'Dominando técnicas avanzadas'}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {loadingLevel ? (
                <Box>
                  <Skeleton height={20} sx={{ mb: 1 }} />
                  <Skeleton height={40} sx={{ mb: 2 }} />
                </Box>
              ) : (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Progreso al siguiente nivel
                  </Typography>
                  <LevelBadge
                    level={currentLevel}
                    size="small"
                    showProgressBar={true}
                    progressToNextLevel={levelData?.progressToNextLevel || 0}
                    showLabel={false}
                    sx={{ width: '100%' }}
                  />
                </Box>
              )}

              <Button
                fullWidth
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={handleManageLevel}
                sx={{ mt: 2 }}
              >
                Ajustar Nivel
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* =================================================================== */}
        {/* CARD: Progreso de Aprendizaje */}
        {/* =================================================================== */}
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ height: '100%', minHeight: 400 }}>
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
        {/* CARD: Progreso hacia Siguiente Nivel (Detallado) */}
        {/* =================================================================== */}
        {currentLevel !== 'ADVANCED' && evaluation?.metrics && (
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <TrendingUp />
                  </Avatar>
                }
                title="Progreso hacia Siguiente Nivel"
                subheader={`Criterios para avanzar de ${currentLevel === 'BEGINNER' ? 'Principiante a Intermedio' : 'Intermedio a Avanzado'}`}
              />
              <CardContent>
                <Grid container spacing={2}>
                  {/* Criterio 1: Lecciones completadas */}
                  <Grid item xs={12} md={6}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {currentLevel === 'BEGINNER'
                          ? 'Lecciones de nivel básico completadas'
                          : 'Lecciones de nivel intermedio completadas'}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="h6">
                          {currentLevel === 'BEGINNER'
                            ? evaluation.metrics.lessonsByDifficulty.BEGINNER
                            : evaluation.metrics.lessonsByDifficulty.INTERMEDIATE}
                          {' / '}
                          {currentLevel === 'BEGINNER' ? '5' : '8'}
                        </Typography>
                        {((currentLevel === 'BEGINNER' && evaluation.metrics.lessonsByDifficulty.BEGINNER >= 5) ||
                          (currentLevel === 'INTERMEDIATE' && evaluation.metrics.lessonsByDifficulty.INTERMEDIATE >= 8)) && (
                          <CheckCircle color="success" />
                        )}
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(
                          currentLevel === 'BEGINNER'
                            ? (evaluation.metrics.lessonsByDifficulty.BEGINNER / 5) * 100
                            : (evaluation.metrics.lessonsByDifficulty.INTERMEDIATE / 8) * 100,
                          100
                        )}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  </Grid>

                  {/* Criterio 2: Score promedio */}
                  <Grid item xs={12} md={6}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Puntuación promedio en quizzes
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="h6">
                          {evaluation.metrics.averageQuizScore?.toFixed(1) || 0}%
                          {' / '}
                          {currentLevel === 'BEGINNER' ? '80%' : '85%'}
                        </Typography>
                        {evaluation.metrics.averageQuizScore >= (currentLevel === 'BEGINNER' ? 80 : 85) && (
                          <CheckCircle color="success" />
                        )}
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(
                          currentLevel === 'BEGINNER'
                            ? (evaluation.metrics.averageQuizScore / 80) * 100
                            : (evaluation.metrics.averageQuizScore / 85) * 100,
                          100
                        )}
                        sx={{ height: 6, borderRadius: 3 }}
                        color={evaluation.metrics.averageQuizScore >= (currentLevel === 'BEGINNER' ? 80 : 85) ? 'success' : 'primary'}
                      />
                    </Box>
                  </Grid>

                  {/* Criterio adicional para INTERMEDIATE -> ADVANCED */}
                  {currentLevel === 'INTERMEDIATE' && (
                    <>
                      <Grid item xs={12} md={6}>
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Puntuación en últimas 10 lecciones
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="h6">
                              {evaluation.metrics.recentLessonsScore?.toFixed(1) || 0}% / 85%
                            </Typography>
                            {evaluation.metrics.recentLessonsScore >= 85 && (
                              <CheckCircle color="success" />
                            )}
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min((evaluation.metrics.recentLessonsScore / 85) * 100, 100)}
                            sx={{ height: 6, borderRadius: 3 }}
                            color={evaluation.metrics.recentLessonsScore >= 85 ? 'success' : 'primary'}
                          />
                        </Box>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Consistencia de desempeño
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="h6">
                              {evaluation.metrics.consistencyScore?.toFixed(1) || 0}% / 70%
                            </Typography>
                            {evaluation.metrics.consistencyScore >= 70 && (
                              <CheckCircle color="success" />
                            )}
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min((evaluation.metrics.consistencyScore / 70) * 100, 100)}
                            sx={{ height: 6, borderRadius: 3 }}
                            color={evaluation.metrics.consistencyScore >= 70 ? 'success' : 'primary'}
                          />
                        </Box>
                      </Grid>
                    </>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* =================================================================== */}
        {/* CARD: Lecciones Recomendadas (con indicadores de nivel) */}
        {/* =================================================================== */}
        <Grid item xs={12}>
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
                  {data.recommendedLessons.map((lesson, index) => {
                    const lessonLevel = lesson.difficulty?.toUpperCase() || 'INTERMEDIATE';
                    const isHigherLevel =
                      (currentLevel === 'BEGINNER' && lessonLevel !== 'BEGINNER') ||
                      (currentLevel === 'INTERMEDIATE' && lessonLevel === 'ADVANCED');

                    return (
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
                                <Box component="span">
                                  <Chip
                                    label={lessonLevel === 'BEGINNER' ? 'Principiante' :
                                           lessonLevel === 'INTERMEDIATE' ? 'Intermedio' : 'Avanzado'}
                                    size="small"
                                    color={getLevelColor(lessonLevel)}
                                    sx={{ mr: 1, mt: 0.5 }}
                                  />
                                  {lesson.estimatedTime && (
                                    <Typography
                                      component="span"
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ mr: 1 }}
                                    >
                                      <AccessTime
                                        sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }}
                                      />
                                      {lesson.estimatedTime} min
                                    </Typography>
                                  )}
                                  {isHigherLevel && (
                                    <Typography
                                      component="span"
                                      variant="caption"
                                      color="warning.main"
                                      sx={{ display: 'block', mt: 0.5 }}
                                    >
                                      ⚠️ Esta lección es de nivel {
                                        lessonLevel === 'ADVANCED' ? 'Avanzado' : 'Intermedio'
                                      }, tu nivel actual es {
                                        currentLevel === 'BEGINNER' ? 'Principiante' : 'Intermedio'
                                      }
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          </ListItemButton>
                        </ListItem>
                        {index < data.recommendedLessons.length - 1 && <Divider />}
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* =================================================================== */}
        {/* CARD: Estadísticas Personales */}
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
