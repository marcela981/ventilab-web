import React, { useState, useEffect, useMemo } from 'react';
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
  Chip,
  Paper,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  Avatar,
  Badge,
  Divider,
  Stack,
  useTheme,
  useMediaQuery,
  Fade,
  Slide,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  School,
  TrendingUp,
  TrendingDown,
  AccessTime,
  Timer,
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  FilterList,
  CalendarToday,
  BarChart,
  Psychology,
  CheckCircle,
  RadioButtonUnchecked,
  FiberManualRecord,
  Star,
  StarBorder,
  Schedule,
  Lightbulb,
  Functions,
  Quiz,
  LocalFireDepartment,
  EmojiEvents,
  NotificationsActive,
  Bookmark,
  BookmarkBorder,
  Settings,
  Analytics,
  Speed,
  Memory,
  Timeline,
  Assessment
} from '@mui/icons-material';
import { useLearningProgress } from '../../contexts/LearningProgressContext';
import { curriculumData, getModulesByLevel } from '../../data/curriculumData';
import FlashcardSystem from './FlashcardSystem';

// Componente para el Heatmap Calendar (estilo GitHub)
const HeatmapCalendar = ({ reviewData, onDateClick }) => {
  const theme = useTheme();
  
  // Generar datos de los últimos 365 días
  const generateHeatmapData = () => {
    const data = [];
    const today = new Date();
    
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const dateStr = date.toISOString().split('T')[0];
      const reviews = reviewData[dateStr] || 0;
      
      data.push({
        date: date,
        dateStr: dateStr,
        reviews: reviews,
        level: reviews === 0 ? 0 : 
               reviews < 5 ? 1 : 
               reviews < 10 ? 2 : 
               reviews < 20 ? 3 : 4
      });
    }
    
    return data;
  };
  
  const heatmapData = generateHeatmapData();
  const maxReviews = Math.max(...heatmapData.map(d => d.reviews));
  
  const getColorIntensity = (level) => {
    const colors = [
      theme.palette.grey[100], // 0 reviews
      '#c6e48b', // 1-4 reviews
      '#7bc96f', // 5-9 reviews
      '#239a3b', // 10-19 reviews
      '#196127'  // 20+ reviews
    ];
    return colors[level] || colors[0];
  };
  
  const getTooltipText = (data) => {
    if (data.reviews === 0) {
      return `No reviews on ${data.dateStr}`;
    }
    return `${data.reviews} reviews on ${data.dateStr}`;
  };
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarToday />
          Actividad de Repaso
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {heatmapData.map((data, index) => (
            <Tooltip key={index} title={getTooltipText(data)} arrow>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: getColorIntensity(data.level),
                  borderRadius: 2,
                  cursor: 'pointer',
                  border: '1px solid rgba(27,31,35,0.06)',
                  '&:hover': {
                    border: '1px solid rgba(27,31,35,0.3)',
                    transform: 'scale(1.1)'
                  }
                }}
                onClick={() => onDateClick && onDateClick(data)}
              />
            </Tooltip>
          ))}
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Menos
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[0, 1, 2, 3, 4].map(level => (
              <Box
                key={level}
                sx={{
                  width: 10,
                  height: 10,
                  backgroundColor: getColorIntensity(level),
                  borderRadius: 1
                }}
              />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary">
            Más
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

// Componente para el gráfico de retención
const RetentionChart = ({ performanceData }) => {
  const theme = useTheme();
  
  // Generar datos de las últimas 12 semanas
  const generateRetentionData = () => {
    const data = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekKey = `week-${weekStart.getFullYear()}-${weekStart.getMonth() + 1}`;
      const weekData = performanceData[weekKey] || { correct: 0, total: 0 };
      
      data.push({
        week: `Sem ${12 - i}`,
        weekStart: weekStart,
        correct: weekData.correct,
        total: weekData.total,
        percentage: weekData.total > 0 ? (weekData.correct / weekData.total) * 100 : 0
      });
    }
    
    return data;
  };
  
  const retentionData = generateRetentionData();
  const maxPercentage = Math.max(...retentionData.map(d => d.percentage));
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChart />
          Retención Semanal
        </Typography>
        
        <Box sx={{ height: 200, display: 'flex', alignItems: 'end', gap: 1, p: 2 }}>
          {retentionData.map((week, index) => (
            <Box key={index} sx={{ flex: 1, textAlign: 'center' }}>
              <Box
                sx={{
                  height: `${(week.percentage / maxPercentage) * 150}px`,
                  backgroundColor: week.percentage >= 80 ? theme.palette.success.main :
                                 week.percentage >= 60 ? theme.palette.warning.main :
                                 theme.palette.error.main,
                  borderRadius: '4px 4px 0 0',
                  margin: '0 2px',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'end',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
              >
                <Typography variant="caption" sx={{ 
                  color: 'white', 
                  fontWeight: 600,
                  mb: 1,
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}>
                  {week.percentage.toFixed(0)}%
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ 
                color: theme.palette.text.secondary,
                fontWeight: 600,
                mt: 1,
                display: 'block'
              }}>
                {week.week}
              </Typography>
            </Box>
          ))}
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Promedio: {retentionData.reduce((acc, week) => acc + week.percentage, 0) / retentionData.length}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Total: {retentionData.reduce((acc, week) => acc + week.total, 0)} repasos
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

// Componente para la lista de decks
const DeckList = ({ decks, onDeckClick, selectedModule }) => {
  const theme = useTheme();
  
  const getModuleIcon = (moduleId) => {
    const module = curriculumData.modules[moduleId];
    if (!module) return <School />;
    
    switch (module.level) {
      case 'beginner': return <Lightbulb />;
      case 'intermediate': return <Functions />;
      case 'advanced': return <Psychology />;
      default: return <School />;
    }
  };
  
  const getModuleColor = (moduleId) => {
    const module = curriculumData.modules[moduleId];
    if (!module) return theme.palette.grey[500];
    
    switch (module.level) {
      case 'beginner': return theme.palette.success.main;
      case 'intermediate': return theme.palette.warning.main;
      case 'advanced': return theme.palette.error.main;
      default: return theme.palette.grey[500];
    }
  };
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Bookmark />
          Decks por Módulo
        </Typography>
        
        <List>
          {decks.map((deck, index) => (
            <ListItem
              key={deck.moduleId}
              button
              onClick={() => onDeckClick(deck.moduleId)}
              selected={selectedModule === deck.moduleId}
              sx={{
                borderRadius: 1,
                mb: 1,
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main + '10',
                  borderLeft: `3px solid ${theme.palette.primary.main}`
                }
              }}
            >
              <ListItemIcon>
                <Avatar sx={{ 
                  width: 32, 
                  height: 32, 
                  backgroundColor: getModuleColor(deck.moduleId) + '20',
                  color: getModuleColor(deck.moduleId)
                }}>
                  {getModuleIcon(deck.moduleId)}
                </Avatar>
              </ListItemIcon>
              
              <ListItemText
                primary={deck.moduleTitle}
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {deck.totalCards} flashcards • {deck.level}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={deck.masteryPercentage}
                        sx={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: theme.palette.grey[200],
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getModuleColor(deck.moduleId),
                            borderRadius: 3
                          }
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {deck.masteryPercentage.toFixed(0)}%
                      </Typography>
                    </Box>
                  </Box>
                }
              />
              
              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={`${deck.dueCards} pendientes`}
                    size="small"
                    color={deck.dueCards > 0 ? 'error' : 'success'}
                    variant="outlined"
                  />
                  <IconButton size="small">
                    <PlayArrow />
                  </IconButton>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

// Componente principal del Dashboard
const FlashcardDashboardPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Contexto de progreso
  const { 
    flashcards, 
    getFlashcardStats,
    getFlashcardsDue,
    flashcardReviews
  } = useLearningProgress();
  
  // Estados del componente
  const [activeTab, setActiveTab] = useState(0);
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [studyMode, setStudyMode] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    startTime: null,
    cardsReviewed: 0,
    correctAnswers: 0,
    timeSpent: 0
  });
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  
  // Estadísticas generales - getFlashcardStats is now a memoized value, not a function
  const stats = getFlashcardStats || {
    total: 0,
    due: 0,
    new: 0,
    reviewed: 0,
    completionRate: 0
  };
  
  // Generar datos de decks por módulo - memoizado para evitar re-renders innecesarios
  const deckData = useMemo(() => {
    const decks = [];
    const modules = Object.values(curriculumData.modules);
    
    modules.forEach(module => {
      const moduleCards = flashcards.filter(card => card.context?.moduleId === module.id);
      const dueCards = moduleCards.filter(card => {
        if (!card.sm2Data || !card.sm2Data.nextReviewDate) return true;
        return new Date() >= new Date(card.sm2Data.nextReviewDate);
      }).length;
      
      const masteredCards = moduleCards.filter(card => 
        card.sm2Data && card.sm2Data.repetitions >= 5
      ).length;
      
      decks.push({
        moduleId: module.id,
        moduleTitle: module.title,
        level: module.level,
        totalCards: moduleCards.length,
        dueCards: dueCards,
        masteredCards: masteredCards,
        masteryPercentage: moduleCards.length > 0 ? (masteredCards / moduleCards.length) * 100 : 0
      });
    });
    
    return decks.filter(deck => deck.totalCards > 0);
  }, [flashcards]);
  
  // Generar datos de rendimiento semanal - memoizado
  const performanceData = useMemo(() => {
    const performanceData = {};
    const today = new Date();
    
    // Simular datos de rendimiento (en una implementación real, esto vendría de la base de datos)
    for (let i = 0; i < 12; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      
      const weekKey = `week-${weekStart.getFullYear()}-${weekStart.getMonth() + 1}`;
      performanceData[weekKey] = {
        correct: Math.floor(Math.random() * 50) + 20,
        total: Math.floor(Math.random() * 20) + 30
      };
    }
    
    return performanceData;
  }, []); // Empty dependency array since this is static data
  
  // Generar datos de heatmap - memoizado
  const heatmapData = useMemo(() => {
    const heatmapData = {};
    const today = new Date();
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Simular datos de repaso (en una implementación real, esto vendría de la base de datos)
      heatmapData[dateStr] = Math.random() > 0.3 ? Math.floor(Math.random() * 15) : 0;
    }
    
    return heatmapData;
  }, []); // Empty dependency array since this is static data
  
  // Handlers
  const handleStartStudy = () => {
    setStudyMode(true);
    setSessionStats({
      startTime: new Date(),
      cardsReviewed: 0,
      correctAnswers: 0,
      timeSpent: 0
    });
  };
  
  const handleEndStudy = () => {
    setStudyMode(false);
    setShowSessionSummary(true);
  };
  
  const handleDeckClick = (moduleId) => {
    setSelectedModule(moduleId);
    // Aquí se podría abrir el FlashcardSystem con filtros específicos
  };
  
  const handleDateClick = (dateData) => {
    console.log('Date clicked:', dateData);
    // Mostrar detalles de repasos para esa fecha
  };
  
  // Filtros
  const filteredDecks = useMemo(() => {
    return deckData.filter(deck => {
      if (selectedLevel && deck.level !== selectedLevel) return false;
      if (selectedModule && deck.moduleId !== selectedModule) return false;
      return true;
    });
  }, [deckData, selectedLevel, selectedModule]);
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ 
          fontWeight: 700,
          color: theme.palette.primary.main,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <School />
          Dashboard de Flashcards
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Sistema de repetición espaciada con algoritmo SM-2 para optimizar tu aprendizaje
        </Typography>
      </Box>
      
      {/* Estadísticas principales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total Flashcards
                  </Typography>
                </Box>
                <Avatar sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <School />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #51cf66 0%, #40c057 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.reviewed}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Dominadas
                  </Typography>
                </Box>
                <Avatar sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <CheckCircle />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ffd43b 0%, #fab005 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.due}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Pendientes
                  </Typography>
                </Box>
                <Avatar sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <Schedule />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #339af0 0%, #228be6 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.new}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Nuevas
                  </Typography>
                </Box>
                <Avatar sx={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <Star />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Controles de estudio */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">
              Modo de Estudio
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={timerEnabled}
                  onChange={(e) => setTimerEnabled(e.target.checked)}
                />
              }
              label="Timer"
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Nivel</InputLabel>
              <Select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                label="Nivel"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="beginner">Principiante</MenuItem>
                <MenuItem value="intermediate">Intermedio</MenuItem>
                <MenuItem value="advanced">Avanzado</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Módulo</InputLabel>
              <Select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                label="Módulo"
              >
                <MenuItem value="">Todos</MenuItem>
                {deckData.map(deck => (
                  <MenuItem key={deck.moduleId} value={deck.moduleId}>
                    {deck.moduleTitle}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Button
              variant="contained"
              startIcon={studyMode ? <Stop /> : <PlayArrow />}
              onClick={studyMode ? handleEndStudy : handleStartStudy}
              color={studyMode ? 'error' : 'primary'}
              size="large"
            >
              {studyMode ? 'Finalizar Sesión' : 'Comenzar Estudio'}
            </Button>
          </Box>
        </Box>
        
        {studyMode && (
          <Fade in={studyMode}>
            <Box sx={{ mt: 2, p: 2, backgroundColor: theme.palette.primary.main + '05', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                  Sesión en progreso...
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Chip icon={<AccessTime />} label={`${sessionStats.cardsReviewed} cards`} size="small" />
                  <Chip icon={<CheckCircle />} label={`${sessionStats.correctAnswers} correctas`} size="small" />
                  {timerEnabled && (
                    <Chip icon={<Timer />} label={`${sessionStats.timeSpent}m`} size="small" />
                  )}
                </Box>
              </Box>
            </Box>
          </Fade>
        )}
      </Paper>
      
      {/* Contenido principal */}
      <Grid container spacing={3}>
        {/* Heatmap Calendar */}
        <Grid item xs={12} lg={6}>
          <HeatmapCalendar 
            reviewData={heatmapData}
            onDateClick={handleDateClick}
          />
        </Grid>
        
        {/* Retention Chart */}
        <Grid item xs={12} lg={6}>
          <RetentionChart performanceData={performanceData} />
        </Grid>
        
        {/* Deck List */}
        <Grid item xs={12}>
          <DeckList 
            decks={filteredDecks}
            onDeckClick={handleDeckClick}
            selectedModule={selectedModule}
          />
        </Grid>
      </Grid>
      
      {/* Sistema de flashcards */}
      <FlashcardSystem
        isOpen={studyMode}
        onClose={handleEndStudy}
        autoGenerateFromLesson={false}
      />
      
      {/* Session Summary Dialog */}
      <Dialog
        open={showSessionSummary}
        onClose={() => setShowSessionSummary(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assessment />
            Resumen de Sesión
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                ¡Excelente trabajo!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Has completado tu sesión de repaso
              </Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h6" color="primary">
                    {sessionStats.cardsReviewed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cards Revisadas
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h6" color="success.main">
                    {sessionStats.cardsReviewed > 0 ? 
                      ((sessionStats.correctAnswers / sessionStats.cardsReviewed) * 100).toFixed(0) : 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Precisión
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
            
            <Box sx={{ p: 2, backgroundColor: theme.palette.primary.main + '05', borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Próxima sesión recomendada:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Mañana a las 9:00 AM • {stats.due} cards pendientes
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSessionSummary(false)}>
            Cerrar
          </Button>
          <Button variant="contained" onClick={() => {
            setShowSessionSummary(false);
            handleStartStudy();
          }}>
            Continuar Estudiando
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FlashcardDashboardPage;
