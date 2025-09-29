import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  LinearProgress,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Avatar,
  Divider,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  Paper,
  Tooltip,
  Skeleton,
  useTheme,
  useMediaQuery,
  Badge,
  IconButton
} from '@mui/material';
import {
  Biotech,
  Settings,
  MonitorHeart,
  CheckCircle,
  RadioButtonUnchecked,
  Lock,
  PlayArrow,
  Refresh,
  ExpandMore,
  TrendingUp,
  EmojiEvents,
  AccessTime,
  LocalFireDepartment,
  School,
  Quiz,
  Star,
  Timeline as TimelineIcon,
  Analytics,
  Assignment,
  CheckCircleOutline,
  Schedule
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

const ProgressTracker = ({ userId, onNavigateToLesson, onNavigateToModule }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(true);
  const [expandedModule, setExpandedModule] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Datos de ejemplo (en producción vendrían de una API)
  const progressData = {
    user: {
      id: userId || 'user123',
      totalProgress: 45,
      studyStreak: 7,
      totalTimeMinutes: 1250,
      lastActivity: {
        type: 'lesson_completed',
        title: 'Mecánica Respiratoria',
        timestamp: '2024-01-15T10:30:00'
      }
    },
    modules: [
      {
        id: 'fundamentals',
        title: 'Fundamentos Fisiológicos',
        icon: <Biotech />,
        color: theme.palette.primary.main,
        progress: 75,
        status: 'in_progress',
        lessonsCompleted: 3,
        totalLessons: 4,
        timeSpentMinutes: 450,
        lessons: [
          {
            id: 'anatomy',
            title: 'Anatomía del Sistema Respiratorio',
            progress: 100,
            status: 'completed',
            completedDate: '2024-01-10',
            score: 95,
            timeSpentMinutes: 120,
            estimatedMinutes: 90,
            sections: [
              { id: 's1', title: 'Introducción', completed: true },
              { id: 's2', title: 'Vías Aéreas Superiores', completed: true },
              { id: 's3', title: 'Anatomía Pulmonar', completed: true }
            ]
          },
          {
            id: 'mechanics',
            title: 'Mecánica Respiratoria',
            progress: 100,
            status: 'completed',
            completedDate: '2024-01-12',
            score: 88,
            timeSpentMinutes: 135,
            estimatedMinutes: 120,
            sections: [
              { id: 's1', title: 'Presión y Volumen', completed: true },
              { id: 's2', title: 'Flujo Respiratorio', completed: true },
              { id: 's3', title: 'Compliance', completed: true }
            ]
          },
          {
            id: 'gas-exchange',
            title: 'Intercambio Gaseoso',
            progress: 60,
            status: 'in_progress',
            timeSpentMinutes: 75,
            estimatedMinutes: 100,
            sections: [
              { id: 's1', title: 'Difusión', completed: true },
              { id: 's2', title: 'Perfusión', completed: true },
              { id: 's3', title: 'Relación V/Q', completed: false }
            ]
          },
          {
            id: 'blood-gas',
            title: 'Gasometría Arterial',
            progress: 0,
            status: 'not_started',
            timeSpentMinutes: 0,
            estimatedMinutes: 110,
            sections: [
              { id: 's1', title: 'Interpretación Básica', completed: false },
              { id: 's2', title: 'Trastornos Ácido-Base', completed: false },
              { id: 's3', title: 'Casos Clínicos', completed: false }
            ]
          }
        ]
      },
      {
        id: 'principles',
        title: 'Principios de Ventilación',
        icon: <Settings />,
        color: theme.palette.secondary.main,
        progress: 25,
        status: 'locked',
        lessonsCompleted: 0,
        totalLessons: 5,
        timeSpentMinutes: 0,
        lessons: []
      },
      {
        id: 'clinical',
        title: 'Configuración y Manejo',
        icon: <MonitorHeart />,
        color: theme.palette.success.main,
        progress: 0,
        status: 'locked',
        lessonsCompleted: 0,
        totalLessons: 6,
        timeSpentMinutes: 0,
        lessons: []
      }
    ],
    achievements: [
      {
        id: 'first_lesson',
        title: 'Primera Lección',
        icon: '🎯',
        unlockedDate: '2024-01-10',
        description: 'Completaste tu primera lección'
      },
      {
        id: 'anatomy_master',
        title: 'Maestro de Anatomía',
        icon: '🔬',
        unlockedDate: '2024-01-10',
        description: 'Dominaste la anatomía respiratoria'
      },
      {
        id: 'week_streak',
        title: 'Semana Perfecta',
        icon: '⭐',
        unlockedDate: '2024-01-15',
        description: '7 días consecutivos estudiando'
      },
      {
        id: 'high_score',
        title: 'Puntuación Excelente',
        icon: '🏆',
        unlockedDate: '2024-01-12',
        description: 'Obtuviste más de 90% en una evaluación'
      }
    ],
    weeklyActivity: [
      { day: 'Lun', minutes: 45, date: '2024-01-08' },
      { day: 'Mar', minutes: 60, date: '2024-01-09' },
      { day: 'Mié', minutes: 0, date: '2024-01-10' },
      { day: 'Jue', minutes: 75, date: '2024-01-11' },
      { day: 'Vie', minutes: 90, date: '2024-01-12' },
      { day: 'Sáb', minutes: 30, date: '2024-01-13' },
      { day: 'Dom', minutes: 45, date: '2024-01-14' }
    ],
    recentActivity: [
      {
        type: 'lesson_completed',
        title: 'Mecánica Respiratoria',
        timestamp: '2024-01-15T10:30:00',
        icon: <CheckCircle color="success" />
      },
      {
        type: 'quiz_passed',
        title: 'Quiz: Anatomía Pulmonar',
        timestamp: '2024-01-14T16:45:00',
        icon: <Quiz color="primary" />
      },
      {
        type: 'achievement_unlocked',
        title: 'Logro: Semana Perfecta',
        timestamp: '2024-01-14T09:00:00',
        icon: <EmojiEvents color="warning" />
      },
      {
        type: 'lesson_started',
        title: 'Intercambio Gaseoso',
        timestamp: '2024-01-13T14:20:00',
        icon: <PlayArrow color="info" />
      },
      {
        type: 'module_unlocked',
        title: 'Fundamentos Fisiológicos',
        timestamp: '2024-01-10T08:15:00',
        icon: <School color="secondary" />
      }
    ]
  };

  // Simulación de carga
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Configuración del gráfico
  const chartData = {
    labels: progressData.weeklyActivity.map(day => day.day),
    datasets: [
      {
        label: 'Minutos de estudio',
        data: progressData.weeklyActivity.map(day => day.minutes),
        fill: true,
        backgroundColor: `${theme.palette.primary.main}20`,
        borderColor: theme.palette.primary.main,
        borderWidth: 2,
        pointBackgroundColor: theme.palette.primary.main,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: theme.palette.divider
        },
        ticks: {
          color: theme.palette.text.secondary
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: theme.palette.text.secondary
        }
      }
    }
  };

  // Funciones auxiliares
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return theme.palette.success.main;
      case 'in_progress': return theme.palette.primary.main;
      case 'not_started': return theme.palette.grey[400];
      case 'locked': return theme.palette.grey[300];
      default: return theme.palette.grey[400];
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle />;
      case 'in_progress': return <PlayArrow />;
      case 'not_started': return <RadioButtonUnchecked />;
      case 'locked': return <Lock />;
      default: return <RadioButtonUnchecked />;
    }
  };

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedModule(isExpanded ? panel : false);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 3 }} />
            <Grid container spacing={2}>
              {[1, 2, 3].map((item) => (
                <Grid item xs={12} md={4} key={item}>
                  <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
                </Grid>
              ))}
            </Grid>
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
        Mi Progreso de Aprendizaje
      </Typography>

      <Grid container spacing={3}>
        {/* Vista General - Dashboard Principal */}
        <Grid item xs={12} lg={8}>
          {/* Card de Resumen Ejecutivo */}
          <Card 
            elevation={3} 
            sx={{ 
              mb: 3, 
              background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`,
              position: 'relative',
              overflow: 'visible'
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={3} alignItems="center">
                {/* Progreso Circular Central */}
                <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress
                      variant="determinate"
                      value={progressData.user.totalProgress}
                      size={120}
                      thickness={6}
                      sx={{
                        color: theme.palette.primary.main,
                        '& .MuiCircularProgress-circle': {
                          strokeLinecap: 'round',
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
                        justifyContent: 'center',
                        flexDirection: 'column'
                      }}
                    >
                      <Typography variant="h4" component="div" color="primary" fontWeight="bold">
                        {progressData.user.totalProgress}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Completado
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Estadísticas Rápidas */}
                <Grid item xs={12} md={8}>
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Avatar sx={{ bgcolor: theme.palette.info.main, mx: 'auto', mb: 1 }}>
                          <AccessTime />
                        </Avatar>
                        <Typography variant="h6" fontWeight="bold">
                          {formatTime(progressData.user.totalTimeMinutes)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tiempo Total
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Avatar sx={{ bgcolor: theme.palette.warning.main, mx: 'auto', mb: 1 }}>
                          <LocalFireDepartment />
                        </Avatar>
                        <Typography variant="h6" fontWeight="bold">
                          {progressData.user.studyStreak}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Días Seguidos
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Avatar sx={{ bgcolor: theme.palette.success.main, mx: 'auto', mb: 1 }}>
                          <School />
                        </Avatar>
                        <Typography variant="h6" fontWeight="bold">
                          {progressData.modules.reduce((acc, mod) => acc + mod.lessonsCompleted, 0)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Lecciones
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={6} md={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Avatar sx={{ bgcolor: theme.palette.secondary.main, mx: 'auto', mb: 1 }}>
                          <EmojiEvents />
                        </Avatar>
                        <Typography variant="h6" fontWeight="bold">
                          {progressData.achievements.length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Logros
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Última Actividad */}
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Última Actividad:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {progressData.user.lastActivity.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(progressData.user.lastActivity.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Progreso por Módulos */}
          <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 'bold' }}>
            Progreso por Módulos
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {progressData.modules.map((module) => (
              <Grid item xs={12} md={4} key={module.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    border: `2px solid ${module.status === 'in_progress' ? module.color : 'transparent'}`,
                    position: 'relative',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[4]
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  {module.status === 'in_progress' && (
                    <Chip
                      label="Actual"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: module.color,
                        color: 'white'
                      }}
                    />
                  )}
                  
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: `${module.color}20`, color: module.color, mr: 2 }}>
                        {module.icon}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {module.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {module.lessonsCompleted}/{module.totalLessons} lecciones
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Progreso
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {module.progress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={module.progress}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: theme.palette.grey[200],
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: module.color,
                            borderRadius: 4
                          }
                        }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Tiempo: {formatTime(module.timeSpentMinutes)}
                      </Typography>
                      <Chip
                        icon={getStatusIcon(module.status)}
                        label={
                          module.status === 'completed' ? 'Completado' :
                          module.status === 'in_progress' ? 'En Progreso' :
                          module.status === 'locked' ? 'Bloqueado' : 'No Iniciado'
                        }
                        size="small"
                        sx={{
                          bgcolor: `${getStatusColor(module.status)}20`,
                          color: getStatusColor(module.status)
                        }}
                      />
                    </Box>
                  </CardContent>

                  <CardActions>
                    <Button
                      fullWidth
                      variant={module.status === 'in_progress' ? 'contained' : 'outlined'}
                      disabled={module.status === 'locked'}
                      startIcon={
                        module.status === 'completed' ? <Refresh /> :
                        module.status === 'in_progress' ? <PlayArrow /> :
                        module.status === 'locked' ? <Lock /> : <PlayArrow />
                      }
                      sx={{
                        color: module.status !== 'in_progress' ? module.color : 'white',
                        borderColor: module.color,
                        bgcolor: module.status === 'in_progress' ? module.color : 'transparent',
                        '&:hover': {
                          bgcolor: module.status === 'in_progress' ? module.color : `${module.color}10`
                        }
                      }}
                      onClick={() => onNavigateToModule && onNavigateToModule(module.id)}
                    >
                      {module.status === 'completed' ? 'Revisar' :
                       module.status === 'in_progress' ? 'Continuar' :
                       module.status === 'locked' ? 'Bloqueado' : 'Comenzar'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Desglose Detallado */}
          <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 'bold' }}>
            Desglose Detallado
          </Typography>

          {progressData.modules.map((module) => (
            module.lessons.length > 0 && (
              <Accordion 
                key={module.id}
                expanded={expandedModule === module.id}
                onChange={handleAccordionChange(module.id)}
                sx={{ mb: 2 }}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Avatar sx={{ bgcolor: `${module.color}20`, color: module.color, mr: 2, width: 32, height: 32 }}>
                      {module.icon}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6">{module.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {module.lessonsCompleted}/{module.totalLessons} lecciones completadas
                      </Typography>
                    </Box>
                    <Box sx={{ minWidth: 100, mr: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={module.progress}
                        sx={{
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: module.color
                          }
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
                        {module.progress}%
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails>
                  <List>
                    {module.lessons.map((lesson) => (
                      <ListItem 
                        key={lesson.id}
                        sx={{ 
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 2,
                          mb: 1,
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <ListItemIcon>
                          {getStatusIcon(lesson.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="subtitle1">{lesson.title}</Typography>
                              {lesson.score && (
                                <Chip
                                  label={`${lesson.score}%`}
                                  size="small"
                                  color={lesson.score >= 90 ? 'success' : lesson.score >= 70 ? 'warning' : 'error'}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, mb: 1 }}>
                                <Typography variant="caption">
                                  Tiempo: {formatTime(lesson.timeSpentMinutes)} / {formatTime(lesson.estimatedMinutes)}
                                </Typography>
                                <Typography variant="caption">
                                  {lesson.progress}% completado
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={lesson.progress}
                                sx={{ height: 4, borderRadius: 2 }}
                              />
                              {lesson.sections && (
                                <Box sx={{ mt: 1 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Secciones:
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                    {lesson.sections.map((section) => (
                                      <Chip
                                        key={section.id}
                                        label={section.title}
                                        size="small"
                                        variant={section.completed ? 'filled' : 'outlined'}
                                        color={section.completed ? 'success' : 'default'}
                                        sx={{ fontSize: '0.7rem', height: 20 }}
                                      />
                                    ))}
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          }
                        />
                        {lesson.status !== 'not_started' && (
                          <Button
                            size="small"
                            onClick={() => onNavigateToLesson && onNavigateToLesson(lesson.id)}
                          >
                            {lesson.status === 'completed' ? 'Revisar' : 'Continuar'}
                          </Button>
                        )}
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )
          ))}
        </Grid>

        {/* Panel Lateral - Estadísticas y Logros */}
        <Grid item xs={12} lg={4}>
          {/* Gráfico de Actividad Semanal */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp sx={{ mr: 1, color: theme.palette.primary.main }} />
                Actividad Semanal
              </Typography>
              <Box sx={{ height: 200, mt: 2 }}>
                <Line data={chartData} options={chartOptions} />
              </Box>
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Promedio: {Math.round(progressData.weeklyActivity.reduce((acc, day) => acc + day.minutes, 0) / 7)} min/día
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Logros Desbloqueados */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <EmojiEvents sx={{ mr: 1, color: theme.palette.warning.main }} />
                Logros Desbloqueados
              </Typography>
              <List dense>
                {progressData.achievements.map((achievement) => (
                  <ListItem key={achievement.id} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Avatar sx={{ width: 32, height: 32, fontSize: '1rem' }}>
                        {achievement.icon}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={achievement.title}
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {achievement.description}
                          </Typography>
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(achievement.unlockedDate).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Línea de Tiempo de Actividad */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <TimelineIcon sx={{ mr: 1, color: theme.palette.info.main }} />
                Actividad Reciente
              </Typography>
              <Timeline sx={{ p: 0 }}>
                {progressData.recentActivity.slice(0, 5).map((activity, index) => (
                  <TimelineItem key={index}>
                    <TimelineSeparator>
                      <TimelineDot sx={{ bgcolor: 'transparent', boxShadow: 'none', p: 0 }}>
                        {activity.icon}
                      </TimelineDot>
                      {index < progressData.recentActivity.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography variant="body2" fontWeight="medium">
                        {activity.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(activity.timestamp).toLocaleString()}
                      </Typography>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProgressTracker;
