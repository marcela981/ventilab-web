import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  CircularProgress,
  Tooltip,
  Stack
} from '@mui/material';
import {
  LocalHospital as ProtocolIcon,
  Security as ProtectiveIcon,
  TrendingDown as WeaningIcon,
  Build as TroubleshootingIcon,
  PlaylistAddCheck as ChecklistIcon,
  EmojiEvents as AchievementIcon,
  NavigateNext as NextIcon,
  CheckCircle as CompletedIcon,
  Schedule as TimeIcon,
  Star as StarIcon
} from '@mui/icons-material';
import useUserProgress from '@/hooks/useUserProgress';

/**
 * Module3ProgressDashboard - Dashboard de progreso para Módulo 3
 *
 * Muestra un resumen visual completo del progreso del usuario en el Módulo 3
 * (Configuración y Manejo), incluyendo:
 * - Progreso por categoría con indicadores visuales
 * - Lecciones recomendadas siguientes
 * - Achievements y badges
 * - Estadísticas agregadas
 *
 * @component
 */
const Module3ProgressDashboard = () => {
  const {
    getCategoryProgress,
    getModuleThreeProgress
  } = useUserProgress();

  const moduleStats = getModuleThreeProgress();

  // Configuración de categorías con iconos y colores
  const categoryConfig = {
    pathologyProtocols: {
      name: 'Protocolos por Patología',
      icon: <ProtocolIcon />,
      color: '#e74c3c',
      description: 'Protocolos específicos para SDRA, EPOC, asma, neumonía'
    },
    protectiveStrategies: {
      name: 'Estrategias Protectoras',
      icon: <ProtectiveIcon />,
      color: '#3498db',
      description: 'Ventilación protectora y prevención de VILI'
    },
    weaning: {
      name: 'Destete Ventilatorio',
      icon: <WeaningIcon />,
      color: '#2ecc71',
      description: 'Protocolos y criterios de destete'
    },
    troubleshooting: {
      name: 'Troubleshooting',
      icon: <TroubleshootingIcon />,
      color: '#f39c12',
      description: 'Resolución de problemas y alarmas'
    },
    protocols: {
      name: 'Checklists Clínicos',
      icon: <ChecklistIcon />,
      color: '#9b59b6',
      description: 'Protocolos rápidos de referencia'
    }
  };

  // Obtener siguiente lección recomendada
  const nextRecommendedLessons = useMemo(() => {
    const recommendations = [];

    // Priorizar categorías con menor progreso
    Object.entries(categoryConfig).forEach(([categoryId, config]) => {
      const progress = getCategoryProgress(categoryId);
      if (progress && progress.percentComplete < 100) {
        recommendations.push({
          categoryId,
          categoryName: config.name,
          progress: progress.percentComplete,
          icon: config.icon,
          color: config.color
        });
      }
    });

    // Ordenar por progreso (menor primero)
    return recommendations.sort((a, b) => a.progress - b.progress).slice(0, 3);
  }, [getCategoryProgress]);

  // Renderizar card de categoría
  const renderCategoryCard = (categoryId, config) => {
    const progress = getCategoryProgress(categoryId);

    if (!progress) return null;

    const { lessonsCompleted, totalLessons, percentComplete, checklistsCompleted, protocolsStudied } = progress;

    return (
      <Grid item xs={12} md={6} lg={4} key={categoryId}>
        <Card
          elevation={2}
          sx={{
            height: '100%',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 4
            },
            borderLeft: `4px solid ${config.color}`
          }}
        >
          <CardContent>
            <Stack spacing={2}>
              {/* Header con icono y título */}
              <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ color: config.color }}>
                  {config.icon}
                </Box>
                <Typography variant="h6" component="div" fontWeight="600" fontSize="1rem">
                  {config.name}
                </Typography>
              </Box>

              {/* Progreso circular */}
              <Box display="flex" justifyContent="center" py={1}>
                <Box position="relative" display="inline-flex">
                  <CircularProgress
                    variant="determinate"
                    value={percentComplete}
                    size={80}
                    thickness={5}
                    sx={{
                      color: config.color,
                      '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round'
                      }
                    }}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography variant="h6" component="div" fontWeight="700">
                      {Math.round(percentComplete)}%
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Estadísticas */}
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {lessonsCompleted} de {totalLessons} lecciones completadas
                </Typography>

                {checklistsCompleted.length > 0 && (
                  <Chip
                    icon={<ChecklistIcon />}
                    label={`${checklistsCompleted.length} checklists`}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 0.5, mt: 0.5 }}
                  />
                )}

                {protocolsStudied.length > 0 && (
                  <Chip
                    icon={<ProtocolIcon />}
                    label={`${protocolsStudied.length} protocolos`}
                    size="small"
                    variant="outlined"
                    sx={{ mt: 0.5 }}
                  />
                )}
              </Box>

              {/* Badge si está completo */}
              {percentComplete === 100 && (
                <Chip
                  icon={<CompletedIcon />}
                  label="Completado"
                  color="success"
                  size="small"
                  sx={{ alignSelf: 'flex-start' }}
                />
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  // Renderizar achievements
  const renderAchievements = () => {
    const achievements = [
      {
        id: 'pathology-complete',
        earned: moduleStats.achievements?.allPathologyProtocolsComplete,
        title: 'Maestro de Protocolos',
        description: 'Completó todos los protocolos por patología',
        icon: <ProtocolIcon />
      },
      {
        id: 'troubleshooting-complete',
        earned: moduleStats.achievements?.allTroubleshootingComplete,
        title: 'Experto en Troubleshooting',
        description: 'Completó todas las guías de troubleshooting',
        icon: <TroubleshootingIcon />
      },
      {
        id: 'checklist-mastery',
        earned: moduleStats.achievements?.preExtubationChecklistMastery,
        title: 'Maestría en Checklists',
        description: 'Completó el checklist de pre-extubación 3+ veces',
        icon: <ChecklistIcon />
      },
      {
        id: 'ready-evaluation',
        earned: moduleStats.achievements?.readyForEvaluation,
        title: 'Listo para Evaluación',
        description: 'Cumple todos los criterios para evaluación práctica',
        icon: <StarIcon />
      }
    ];

    const earnedCount = achievements.filter(a => a.earned).length;

    return (
      <Card elevation={2}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <AchievementIcon sx={{ color: '#f39c12' }} />
            <Typography variant="h6" fontWeight="600">
              Logros ({earnedCount}/{achievements.length})
            </Typography>
          </Box>

          <Grid container spacing={1}>
            {achievements.map((achievement) => (
              <Grid item xs={12} sm={6} key={achievement.id}>
                <Tooltip title={achievement.description} arrow>
                  <Paper
                    elevation={achievement.earned ? 3 : 0}
                    sx={{
                      p: 1.5,
                      opacity: achievement.earned ? 1 : 0.4,
                      backgroundColor: achievement.earned ? '#fff9e6' : '#f5f5f5',
                      border: achievement.earned ? '2px solid #f39c12' : '1px solid #e0e0e0',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: achievement.earned ? 'scale(1.02)' : 'none'
                      }
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ color: achievement.earned ? '#f39c12' : '#9e9e9e' }}>
                        {achievement.icon}
                      </Box>
                      <Typography
                        variant="body2"
                        fontWeight={achievement.earned ? '600' : '400'}
                        sx={{
                          color: achievement.earned ? 'text.primary' : 'text.secondary'
                        }}
                      >
                        {achievement.title}
                      </Typography>
                    </Box>
                  </Paper>
                </Tooltip>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Renderizar estadísticas generales
  const renderOverallStats = () => (
    <Card elevation={3} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
      <CardContent>
        <Typography variant="h5" fontWeight="700" gutterBottom>
          Progreso Global - Módulo 3
        </Typography>

        <Box my={3}>
          <Typography variant="h2" fontWeight="800">
            {Math.round(moduleStats.overallPercent)}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={moduleStats.overallPercent}
            sx={{
              mt: 2,
              height: 10,
              borderRadius: 5,
              backgroundColor: 'rgba(255,255,255,0.3)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: 'white',
                borderRadius: 5
              }
            }}
          />
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" fontWeight="700">
                {moduleStats.completedLessons}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Lecciones Completadas
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" fontWeight="700">
                {moduleStats.categoriesComplete}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Categorías Completas
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" fontWeight="700">
                {moduleStats.totalChecklists}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Checklists Completados
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h4" fontWeight="700">
                {moduleStats.criticalProtocolsCount}/4
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Protocolos Críticos
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  // Renderizar lecciones recomendadas
  const renderRecommendedLessons = () => (
    <Card elevation={2}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <NextIcon color="primary" />
          <Typography variant="h6" fontWeight="600">
            Continúa tu Aprendizaje
          </Typography>
        </Box>

        {nextRecommendedLessons.length === 0 ? (
          <Box textAlign="center" py={3}>
            <CompletedIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
            <Typography variant="h6" color="success.main" fontWeight="600">
              ¡Felicitaciones!
            </Typography>
            <Typography color="text.secondary">
              Has completado todas las categorías del Módulo 3
            </Typography>
          </Box>
        ) : (
          <List>
            {nextRecommendedLessons.map((lesson, index) => (
              <React.Fragment key={lesson.categoryId}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemIcon sx={{ color: lesson.color }}>
                    {lesson.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={lesson.categoryName}
                    secondary={
                      <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                        <LinearProgress
                          variant="determinate"
                          value={lesson.progress}
                          sx={{
                            flexGrow: 1,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: '#e0e0e0',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: lesson.color,
                              borderRadius: 3
                            }
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {Math.round(lesson.progress)}%
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={3}>
        {/* Estadísticas generales */}
        {renderOverallStats()}

        {/* Cards de categorías */}
        <Box>
          <Typography variant="h6" fontWeight="600" gutterBottom sx={{ px: 1 }}>
            Progreso por Categoría
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(categoryConfig).map(([categoryId, config]) =>
              renderCategoryCard(categoryId, config)
            )}
          </Grid>
        </Box>

        {/* Grid con achievements y recomendaciones */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            {renderRecommendedLessons()}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderAchievements()}
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
};

export default Module3ProgressDashboard;
