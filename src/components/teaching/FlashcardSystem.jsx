import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Avatar,
  Tooltip,
  Badge,
  useTheme,
  useMediaQuery,
  Fade,
  Slide,
  Grow
} from '@mui/material';
import {
  Flip,
  Refresh,
  Close,
  CheckCircle,
  Cancel,
  ThumbUp,
  ThumbDown,
  AccessTime,
  School,
  Lightbulb,
  Functions,
  Quiz,
  TrendingUp,
  TrendingDown,
  Schedule,
  PlayArrow,
  Pause,
  RotateRight,
  Visibility,
  VisibilityOff,
  Bookmark,
  BookmarkBorder,
  Timer,
  Star,
  StarBorder
} from '@mui/icons-material';
import { useLearningProgress } from '../../contexts/LearningProgressContext';
import { curriculumData, getModuleById } from '../../data/curriculumData';

// SM-2 Algorithm Implementation
class SM2Algorithm {
  constructor() {
    this.initialInterval = 1;
    this.minInterval = 1;
    this.maxInterval = 365;
    this.initialEasiness = 2.5;
  }

  calculateNextReview(card, quality) {
    const { easinessFactor = this.initialEasiness, interval = this.initialInterval, repetitions = 0 } = card.sm2Data || {};
    
    let newEasiness = easinessFactor;
    let newInterval = interval;
    let newRepetitions = repetitions + 1;

    // Calculate new easiness factor
    newEasiness = easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    
    // Ensure easiness factor doesn't go below 1.3
    newEasiness = Math.max(newEasiness, 1.3);

    // Calculate new interval based on quality and repetitions
    if (quality < 3) {
      // Failed review - reset repetitions and interval
      newRepetitions = 0;
      newInterval = this.minInterval;
    } else {
      // Successful review
      if (newRepetitions === 1) {
        newInterval = 1;
      } else if (newRepetitions === 2) {
        newInterval = 6;
      } else {
        newInterval = Math.round(interval * newEasiness);
      }
    }

    // Ensure interval is within bounds
    newInterval = Math.max(newInterval, this.minInterval);
    newInterval = Math.min(newInterval, this.maxInterval);

    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
      easinessFactor: parseFloat(newEasiness.toFixed(2)),
      interval: newInterval,
      repetitions: newRepetitions,
      nextReviewDate: nextReviewDate.toISOString(),
      lastReviewed: new Date().toISOString(),
      quality: quality
    };
  }

  getQualityFromRating(rating) {
    // Map UI ratings to SM-2 quality scale (0-5)
    switch (rating) {
      case 'again': return 0;      // Otra vez
      case 'hard': return 2;       // Difícil  
      case 'good': return 4;       // Bien
      case 'easy': return 5;       // Fácil
      default: return 3;           // Default to medium
    }
  }

  isDueForReview(card) {
    if (!card.sm2Data || !card.sm2Data.nextReviewDate) {
      return true; // New cards are always due
    }
    
    const now = new Date();
    const nextReview = new Date(card.sm2Data.nextReviewDate);
    return now >= nextReview;
  }

  getDaysUntilReview(card) {
    if (!card.sm2Data || !card.sm2Data.nextReviewDate) {
      return 0;
    }
    
    const now = new Date();
    const nextReview = new Date(card.sm2Data.nextReviewDate);
    const diffTime = nextReview - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }
}

const FlashcardSystem = ({ 
  isOpen, 
  onClose, 
  moduleId, 
  lessonId,
  autoGenerateFromLesson = true 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Contexto de progreso
  const { 
    flashcards, 
    completedLessons,
    addFlashcard,
    updateFlashcard,
    markFlashcardReviewed
  } = useLearningProgress();

  // Estados del componente
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionCards, setSessionCards] = useState([]);
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
    total: 0
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [studyMode, setStudyMode] = useState('due'); // 'due', 'new', 'all'
  
  // Instancia del algoritmo SM-2
  const sm2Algorithm = new SM2Algorithm();

  // Generar flashcards automáticamente desde contenido de lección
  const generateFlashcardsFromLesson = useCallback((moduleId, lessonId) => {
    const module = getModuleById(moduleId);
    if (!module || !module.lessons) return [];

    const lesson = module.lessons.find(l => l.id === lessonId);
    if (!lesson) return [];

    const generatedCards = [];

    // Generar cards desde objetivos de aprendizaje
    if (module.learningObjectives) {
      module.learningObjectives.forEach((objective, index) => {
        const keyTerms = extractKeyTerms(objective);
        keyTerms.forEach(term => {
          generatedCards.push({
            id: `objective-${moduleId}-${lessonId}-${index}-${term}`,
            front: term,
            back: objective,
            context: {
              moduleId,
              moduleTitle: module.title,
              lessonId,
              lessonTitle: lesson.title,
              source: 'learning_objective',
              level: module.level
            },
            type: 'concept',
            difficulty: module.difficulty || 'intermedio',
            tags: ['objetivo', module.level]
          });
        });
      });
    }

    // Generar cards desde fórmulas (si existen)
    if (lesson.content && lesson.content.formulas) {
      lesson.content.formulas.forEach((formula, index) => {
        generatedCards.push({
          id: `formula-${moduleId}-${lessonId}-${index}`,
          front: formula.name,
          back: `${formula.formula} (${formula.unit})`,
          context: {
            moduleId,
            moduleTitle: module.title,
            lessonId,
            lessonTitle: lesson.title,
            source: 'formula',
            level: module.level
          },
          type: 'formula',
          difficulty: module.difficulty || 'intermedio',
          tags: ['fórmula', 'matemática', module.level]
        });
      });
    }

    // Generar cards desde puntos clave
    if (lesson.content && lesson.content.keyPoints) {
      lesson.content.keyPoints.forEach((point, index) => {
        const keyTerms = extractKeyTerms(point);
        keyTerms.forEach(term => {
          generatedCards.push({
            id: `keypoint-${moduleId}-${lessonId}-${index}-${term}`,
            front: term,
            back: point,
            context: {
              moduleId,
              moduleTitle: module.title,
              lessonId,
              lessonTitle: lesson.title,
              source: 'key_point',
              level: module.level
            },
            type: 'concept',
            difficulty: module.difficulty || 'intermedio',
            tags: ['punto_clave', module.level]
          });
        });
      });
    }

    return generatedCards;
  }, []);

  // Función para extraer términos clave de texto
  const extractKeyTerms = (text) => {
    // Lista de términos médicos y técnicos comunes
    const medicalTerms = [
      'ventilación', 'mecánica', 'respiratoria', 'compliance', 'resistencia',
      'volumen', 'presión', 'flujo', 'frecuencia', 'PEEP', 'FiO2', 'Vt',
      'ARDS', 'EPOC', 'asma', 'alvéolo', 'pulmonar', 'oxígeno', 'CO2',
      'gasometría', 'saturación', 'hipoxemia', 'hipercapnia', 'acidosis',
      'alcalosis', 'shock', 'sepsis', 'neumonía', 'atelectasia'
    ];

    const terms = [];
    const words = text.toLowerCase().split(/\s+/);
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 4 && medicalTerms.includes(cleanWord)) {
        terms.push(cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1));
      }
    });

    return [...new Set(terms)]; // Remove duplicates
  };

  // Efecto para cargar flashcards y preparar sesión
  useEffect(() => {
    if (isOpen) {
      let availableCards = [];

      if (autoGenerateFromLesson && moduleId && lessonId) {
        // Generar flashcards desde la lección actual
        const newCards = generateFlashcardsFromLesson(moduleId, lessonId);
        
        // Agregar nuevas flashcards al contexto
        newCards.forEach(card => {
          addFlashcard(card);
        });
      }

      // Filtrar flashcards según el modo de estudio
      availableCards = flashcards.filter(card => {
        switch (studyMode) {
          case 'due':
            return sm2Algorithm.isDueForReview(card);
          case 'new':
            return !card.sm2Data || card.sm2Data.repetitions === 0;
          case 'all':
          default:
            return true;
        }
      });

      // Ordenar por prioridad (nuevas primero, luego por fecha de revisión)
      availableCards.sort((a, b) => {
        const aIsNew = !a.sm2Data || a.sm2Data.repetitions === 0;
        const bIsNew = !b.sm2Data || b.sm2Data.repetitions === 0;
        
        if (aIsNew && !bIsNew) return -1;
        if (!aIsNew && bIsNew) return 1;
        
        if (!aIsNew && !bIsNew) {
          const aDays = sm2Algorithm.getDaysUntilReview(a);
          const bDays = sm2Algorithm.getDaysUntilReview(b);
          return aDays - bDays;
        }
        
        return 0;
      });

      setSessionCards(availableCards);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setShowAnswer(false);
      setSessionStats({
        reviewed: 0,
        correct: 0,
        total: availableCards.length
      });
    }
  }, [isOpen, flashcards, studyMode, moduleId, lessonId, autoGenerateFromLesson, generateFlashcardsFromLesson, addFlashcard]);

  // Handlers
  const handleFlip = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setIsFlipped(!isFlipped);
    setShowAnswer(!showAnswer);
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  const handleRating = (rating) => {
    if (sessionCards.length === 0) return;

    const currentCard = sessionCards[currentCardIndex];
    const quality = sm2Algorithm.getQualityFromRating(rating);
    
    // Calcular nuevos datos SM-2
    const newSM2Data = sm2Algorithm.calculateNextReview(currentCard, quality);
    
    // Actualizar la flashcard
    const updatedCard = {
      ...currentCard,
      sm2Data: newSM2Data
    };

    updateFlashcard(updatedCard);
    markFlashcardReviewed(currentCard.id, rating);

    // Actualizar estadísticas de sesión
    setSessionStats(prev => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      correct: rating === 'good' || rating === 'easy' ? prev.correct + 1 : prev.correct
    }));

    // Avanzar a la siguiente tarjeta
    if (currentCardIndex < sessionCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
      setShowAnswer(false);
    } else {
      // Sesión completada
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  const handleRestart = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowAnswer(false);
    setSessionStats({
      reviewed: 0,
      correct: 0,
      total: sessionCards.length
    });
  };

  const getRatingButtonColor = (rating) => {
    switch (rating) {
      case 'again': return 'error';
      case 'hard': return 'warning';
      case 'good': return 'primary';
      case 'easy': return 'success';
      default: return 'default';
    }
  };

  const getRatingButtonIcon = (rating) => {
    switch (rating) {
      case 'again': return <RotateRight />;
      case 'hard': return <ThumbDown />;
      case 'good': return <ThumbUp />;
      case 'easy': return <CheckCircle />;
      default: return <Star />;
    }
  };

  const getCardTypeIcon = (type) => {
    switch (type) {
      case 'formula': return <Functions />;
      case 'concept': return <Lightbulb />;
      case 'quiz': return <Quiz />;
      default: return <School />;
    }
  };

  const getCardTypeColor = (type) => {
    switch (type) {
      case 'formula': return theme.palette.info.main;
      case 'concept': return theme.palette.primary.main;
      case 'quiz': return theme.palette.warning.main;
      default: return theme.palette.grey[500];
    }
  };

  if (!isOpen || sessionCards.length === 0) {
    return (
      <Dialog
        open={isOpen}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <School color="primary" />
            <Typography variant="h6">Sistema de Flashcards</Typography>
          </Box>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <School sx={{ fontSize: 64, color: theme.palette.grey[400], mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No hay flashcards disponibles
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {studyMode === 'due' && 'No tienes flashcards pendientes de revisión.'}
              {studyMode === 'new' && 'No hay flashcards nuevas para estudiar.'}
              {studyMode === 'all' && 'No hay flashcards en tu colección.'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="contained">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  const currentCard = sessionCards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / sessionCards.length) * 100;
  const accuracy = sessionStats.reviewed > 0 ? (sessionStats.correct / sessionStats.reviewed) * 100 : 0;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          height: isMobile ? '100vh' : '90vh',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <School color="primary" />
          <Typography variant="h6">Repetición Espaciada</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={getCardTypeIcon(currentCard.type)}
            label={currentCard.type}
            size="small"
            sx={{ 
              backgroundColor: getCardTypeColor(currentCard.type) + '20',
              color: getCardTypeColor(currentCard.type)
            }}
          />
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Progreso de la sesión */}
      <Box sx={{ px: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {currentCardIndex + 1} de {sessionCards.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Precisión: {accuracy.toFixed(0)}%
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Box>

      <DialogContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
        {/* Información de contexto */}
        <Paper elevation={1} sx={{ m: 2, p: 2, backgroundColor: theme.palette.primary.main + '05' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Avatar sx={{ 
              width: 32, 
              height: 32, 
              backgroundColor: getCardTypeColor(currentCard.type) + '20',
              color: getCardTypeColor(currentCard.type)
            }}>
              {getCardTypeIcon(currentCard.type)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" color="primary">
                {currentCard.context.moduleTitle}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {currentCard.context.lessonTitle} • {currentCard.context.source}
              </Typography>
            </Box>
            <Chip 
              label={currentCard.difficulty}
              size="small"
              variant="outlined"
              color={currentCard.difficulty === 'básico' ? 'success' : 
                     currentCard.difficulty === 'intermedio' ? 'warning' : 'error'}
            />
          </Box>
          
          {/* Metadata SM-2 */}
          {currentCard.sm2Data && (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<TrendingUp />}
                label={`EF: ${currentCard.sm2Data.easinessFactor}`}
                size="small"
                variant="outlined"
              />
              <Chip
                icon={<Schedule />}
                label={`Rep: ${currentCard.sm2Data.repetitions}`}
                size="small"
                variant="outlined"
              />
              <Chip
                icon={<AccessTime />}
                label={`Int: ${currentCard.sm2Data.interval}d`}
                size="small"
                variant="outlined"
              />
            </Box>
          )}
        </Paper>

        {/* Flashcard */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          perspective: '1000px',
          p: 2
        }}>
          <Card
            sx={{
              width: '100%',
              maxWidth: 600,
              height: 400,
              cursor: 'pointer',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.6s',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              position: 'relative'
            }}
            onClick={handleFlip}
          >
            {/* Frente de la tarjeta */}
            <CardContent
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                p: 3,
                backgroundColor: theme.palette.primary.main + '05',
                border: `2px solid ${theme.palette.primary.main}20`
              }}
            >
              <Typography variant="h6" color="primary" gutterBottom>
                Pregunta / Término
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                {currentCard.front}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Flip color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Haz clic para ver la respuesta
                </Typography>
              </Box>
            </CardContent>

            {/* Reverso de la tarjeta */}
            <CardContent
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                p: 3,
                backgroundColor: theme.palette.secondary.main + '05',
                border: `2px solid ${theme.palette.secondary.main}20`
              }}
            >
              <Typography variant="h6" color="secondary" gutterBottom>
                Respuesta / Definición
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                {currentCard.back}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Visibility color="secondary" />
                <Typography variant="body2" color="text.secondary">
                  ¿Qué tan bien recordaste?
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Botones de calificación */}
        {showAnswer && (
          <Grow in={showAnswer} timeout={500}>
            <Paper elevation={3} sx={{ m: 2, p: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ textAlign: 'center', mb: 2 }}>
                ¿Qué tan bien recordaste esta información?
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    color={getRatingButtonColor('again')}
                    startIcon={getRatingButtonIcon('again')}
                    onClick={() => handleRating('again')}
                    sx={{ py: 1.5 }}
                  >
                    Otra vez
                  </Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    color={getRatingButtonColor('hard')}
                    startIcon={getRatingButtonIcon('hard')}
                    onClick={() => handleRating('hard')}
                    sx={{ py: 1.5 }}
                  >
                    Difícil
                  </Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    color={getRatingButtonColor('good')}
                    startIcon={getRatingButtonIcon('good')}
                    onClick={() => handleRating('good')}
                    sx={{ py: 1.5 }}
                  >
                    Bien
                  </Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    color={getRatingButtonColor('easy')}
                    startIcon={getRatingButtonIcon('easy')}
                    onClick={() => handleRating('easy')}
                    sx={{ py: 1.5 }}
                  >
                    Fácil
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grow>
        )}
      </DialogContent>

      {/* Footer con controles */}
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Button
            startIcon={<Refresh />}
            onClick={handleRestart}
            variant="outlined"
            disabled={currentCardIndex === 0}
          >
            Reiniciar
          </Button>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              icon={<Timer />}
              label={`${sessionStats.reviewed}/${sessionStats.total}`}
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<TrendingUp />}
              label={`${accuracy.toFixed(0)}%`}
              size="small"
              variant="outlined"
              color={accuracy >= 80 ? 'success' : accuracy >= 60 ? 'warning' : 'error'}
            />
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default FlashcardSystem;
