/**
 * ⚠️ COMPONENTE TEMPORALMENTE REMOVIDO DEL DASHBOARD PRINCIPAL ⚠️
 *
 * Este componente fue removido del dashboard principal del módulo de enseñanza
 * como parte de la HU-001: Limpieza y Reorganización del Dashboard.
 *
 * RAZÓN DE REMOCIÓN:
 * - Simplificación del layout del dashboard principal
 * - Reducción de componentes en el dashboard para mejor UX
 * - El sistema de repetición espaciada será reubicado en una sección dedicada
 *
 * ESTADO ACTUAL:
 * - El archivo se mantiene intacto y funcional
 * - Todas las referencias en TeachingModule.jsx fueron eliminadas
 * - El componente está listo para ser reintegrado cuando sea necesario
 *
 * USO FUTURO PLANEADO:
 * - Sección dedicada de "Sistema de Repetición Espaciada"
 * - Página independiente para gestión de flashcards
 * - Integración en features avanzadas de aprendizaje
 *
 * MANTENIMIENTO:
 * - NO eliminar este archivo
 * - Mantener actualizaciones de dependencies y theme
 * - Documentar cualquier cambio en la estructura del componente
 *
 * @version 1.0.0
 * @status TEMPORALMENTE_DESHABILITADO
 * @fecha_remoción 2025-01-04
 * @historia_usuario HU-001
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Badge,
  useTheme,
  useMediaQuery,
  Avatar,
  Stack
} from '@mui/material';
import {
  School,
  PlayArrow,
  AccessTime,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Functions,
  Quiz,
  Schedule,
  Star,
  StarBorder,
  Refresh,
  NotificationsActive,
  CheckCircle
} from '@mui/icons-material';
import { useLearningProgress } from '@/contexts/LearningProgressContext';
import FlashcardSystem from '@/components/teaching/FlashcardSystem';

/**
 * FlashcardDashboard - Widget de sistema de repetición espaciada
 *
 * Muestra estadísticas de flashcards y botones de acción rápida para
 * el sistema de repetición espaciada basado en el algoritmo SM-2.
 *
 * @param {Function} onOpenFlashcards - Callback para abrir el sistema completo de flashcards
 * @returns {JSX.Element} Widget del dashboard de flashcards
 */
const FlashcardDashboard = ({ onOpenFlashcards }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { 
    getFlashcardStats, 
    getFlashcardsDue,
    flashcards 
  } = useLearningProgress();
  
  const [flashcardSystemOpen, setFlashcardSystemOpen] = useState(false);
  
  // getFlashcardStats is now a memoized value, not a function
  const stats = getFlashcardStats || {
    total: 0,
    due: 0,
    new: 0,
    reviewed: 0,
    completionRate: 0
  };
  const dueCards = getFlashcardsDue() || [];
  
  // Obtener flashcards por tipo para estadísticas
  const getCardsByType = () => {
    const types = {};
    if (flashcards && Array.isArray(flashcards)) {
      flashcards.forEach(card => {
        types[card.type] = (types[card.type] || 0) + 1;
      });
    }
    return types;
  };
  
  const getTypeIcon = (type) => {
    switch (type) {
      case 'formula': return <Functions />;
      case 'concept': return <Lightbulb />;
      case 'quiz': return <Quiz />;
      default: return <School />;
    }
  };
  
  const getTypeColor = (type) => {
    switch (type) {
      case 'formula': return theme.palette.info.main;
      case 'concept': return theme.palette.primary.main;
      case 'quiz': return theme.palette.warning.main;
      default: return theme.palette.grey[500];
    }
  };
  
  const handleStartReview = () => {
    if (onOpenFlashcards) {
      onOpenFlashcards();
    } else {
      setFlashcardSystemOpen(true);
    }
  };
  
  const getMotivationalMessage = () => {
    if (stats.total === 0) {
      return {
        title: "¡Comienza tu colección!",
        message: "Estudia lecciones para generar flashcards automáticamente",
        icon: <StarBorder />,
        color: theme.palette.info.main
      };
    }
    
    if (stats.due === 0) {
      return {
        title: "¡Excelente trabajo!",
        message: "No tienes flashcards pendientes hoy",
        icon: <CheckCircle />,
        color: theme.palette.success.main
      };
    }
    
    if (stats.due <= 5) {
      return {
        title: "Casi terminado",
        message: `Solo ${stats.due} flashcards pendientes`,
        icon: <TrendingUp />,
        color: theme.palette.warning.main
      };
    }
    
    return {
      title: "¡Es hora de repasar!",
      message: `${stats.due} flashcards esperando tu revisión`,
      icon: <NotificationsActive />,
      color: theme.palette.error.main
    };
  };
  
  const motivational = getMotivationalMessage();
  
  if (stats.total === 0) {
    return (
      <Card sx={{ 
        height: '100%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Patrón de fondo */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '150px',
          height: '100%',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          transform: 'translateX(50%)'
        }} />
        
        <CardContent sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar sx={{ 
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white'
            }}>
              <School />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Sistema de Repetición Espaciada
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Flashcards inteligentes con algoritmo SM-2
              </Typography>
            </Box>
          </Box>
          
          <Typography variant="body2" sx={{ mb: 3, opacity: 0.9 }}>
            Las flashcards se generan automáticamente desde el contenido de las lecciones, 
            incluyendo términos clave, conceptos importantes y fórmulas.
          </Typography>
          
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={handleStartReview}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.3)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.3)',
              }
            }}
          >
            Comenzar a Estudiar
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card sx={{ 
        height: '100%',
        background: stats.due > 0 ? 
          'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)' :
          'linear-gradient(135deg, #51cf66 0%, #40c057 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Patrón de fondo */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '120px',
          height: '100%',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          transform: 'translateX(50%)'
        }} />
        
        <CardContent sx={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ 
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white'
              }}>
                {motivational.icon}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Repasar Hoy
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {motivational.message}
                </Typography>
              </Box>
            </Box>
            
            {stats.due > 0 && (
              <Badge badgeContent={stats.due} color="error">
                <NotificationsActive sx={{ color: 'white' }} />
              </Badge>
            )}
          </Box>
          
          {/* Estadísticas principales */}
          <Stack spacing={2} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Progreso Total
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {stats.completionRate.toFixed(0)}%
              </Typography>
            </Box>
            
            <LinearProgress 
              variant="determinate" 
              value={stats.completionRate}
              sx={{ 
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(255,255,255,0.2)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'white',
                  borderRadius: 4,
                }
              }}
            />
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<AccessTime />}
                label={`${stats.due} pendientes`}
                size="small"
                sx={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white'
                }}
              />
              <Chip
                icon={<TrendingUp />}
                label={`${stats.reviewed} revisadas`}
                size="small"
                sx={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white'
                }}
              />
            </Box>
          </Stack>
          
          {/* Tipos de flashcards */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
              Por tipo:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {Object.entries(getCardsByType()).map(([type, count]) => (
                <Chip
                  key={type}
                  icon={getTypeIcon(type)}
                  label={`${count} ${type}`}
                  size="small"
                  sx={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '& .MuiChip-icon': {
                      color: 'white'
                    }
                  }}
                />
              ))}
            </Box>
          </Box>
          
          {/* Botón de acción */}
          <Button
            variant="contained"
            startIcon={stats.due > 0 ? <PlayArrow /> : <Refresh />}
            onClick={handleStartReview}
            fullWidth
            sx={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.3)',
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.3)',
                transform: 'translateY(-2px)',
              }
            }}
          >
            {stats.due > 0 ? `Repasar ${stats.due} Flashcards` : 'Revisar Colección'}
          </Button>
        </CardContent>
      </Card>
      
      {/* Sistema de flashcards */}
      <FlashcardSystem
        isOpen={flashcardSystemOpen}
        onClose={() => setFlashcardSystemOpen(false)}
        autoGenerateFromLesson={false}
      />
    </>
  );
};

export default FlashcardDashboard;
