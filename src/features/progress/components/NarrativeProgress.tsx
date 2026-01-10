import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Avatar,
  useTheme,
  Collapse
} from '@mui/material';
import {
  AutoAwesome,
  EmojiEvents,
  Person
} from '@mui/icons-material';

interface NarrativeProgressProps {
  level: number;
  roleTitle?: string;
}

// Micro-historias para diferentes niveles
const getMicroStory = (level: number, roleTitle: string | undefined): string => {
  const safeRoleTitle = roleTitle || 'Aprendiz';
  const stories: Record<number, string> = {
    1: `¡Bienvenido al camino de la ventilación mecánica! Como ${safeRoleTitle}, cada paso que des te acercará a dominar este arte fundamental.`,
    2: `Tu dedicación está dando frutos. Como ${safeRoleTitle}, estás construyendo una base sólida que será tu cimiento.`,
    3: `Con cada lección, te conviertes en un ${safeRoleTitle} más confiable. Tu progreso es notable.`,
    4: `Los conceptos comienzan a encajar. Como ${safeRoleTitle}, estás desarrollando la intuición clínica necesaria.`,
    5: `Has alcanzado un hito importante. Como ${safeRoleTitle}, demuestras compromiso y crecimiento constante.`,
    6: `Tu conocimiento se profundiza. Como ${safeRoleTitle}, estás adquiriendo la confianza para tomar decisiones críticas.`,
    7: `Cada módulo completado te acerca más a la maestría. Como ${safeRoleTitle}, estás en el camino correcto.`,
    8: `La práctica constante está forjando tu experiencia. Como ${safeRoleTitle}, tu destreza mejora día a día.`,
    9: `Estás cerca de alcanzar un nuevo nivel de competencia. Como ${safeRoleTitle}, tu dedicación es admirable.`,
    10: `¡Felicitaciones por llegar tan lejos! Como ${safeRoleTitle}, has demostrado excelencia y perseverancia.`
  };

  // Si hay una historia específica para el nivel, la usamos
  if (stories[level]) {
    return stories[level];
  }

  // Historia genérica para niveles superiores
  return `Sigue avanzando, ${safeRoleTitle}. Cada nivel alcanzado es un testimonio de tu dedicación y pasión por la medicina.`;
};

const NarrativeProgress: React.FC<NarrativeProgressProps> = ({ level, roleTitle }) => {
  const theme = useTheme();
  const [showStory, setShowStory] = useState(false);
  const [currentStory, setCurrentStory] = useState<string>('');
  
  // Valores seguros por defecto
  const safeLevel = level && typeof level === 'number' ? level : 1;
  const safeRoleTitle = (roleTitle && typeof roleTitle === 'string' && roleTitle.trim() !== '') 
    ? roleTitle.trim() 
    : 'Aprendiz';
  const previousLevelRef = useRef<number>(safeLevel);

  // Detectar cuando sube de nivel
  useEffect(() => {
    if (safeLevel > previousLevelRef.current && previousLevelRef.current > 0) {
      // Subió de nivel
      const story = getMicroStory(safeLevel, safeRoleTitle);
      setCurrentStory(story);
      setShowStory(true);

      // Ocultar la historia después de 8 segundos
      const timer = setTimeout(() => {
        setShowStory(false);
      }, 8000);

      return () => clearTimeout(timer);
    }
    previousLevelRef.current = safeLevel;
  }, [safeLevel, safeRoleTitle]);

  // Obtener color del rol según el título
  const getRoleColor = (role: string | undefined | null): string => {
    // Validación robusta
    if (!role || typeof role !== 'string' || role.trim() === '') {
      return '#10aede'; // Cyan por defecto
    }
    try {
      const roleLower = role.toLowerCase();
      if (roleLower.includes('maestro') || roleLower.includes('master') || roleLower.includes('senior')) {
        return '#FFD700'; // Dorado
      }
      if (roleLower.includes('experto') || roleLower.includes('expert')) {
        return '#9C27B0'; // Púrpura
      }
      if (roleLower.includes('avanzado') || roleLower.includes('advanced') || roleLower.includes('residente')) {
        return '#2196F3'; // Azul
      }
      if (roleLower.includes('junior') || roleLower.includes('aprendiz')) {
        return '#4CAF50'; // Verde
      }
      return '#10aede'; // Cyan por defecto
    } catch (error) {
      // Si hay cualquier error, retornar color por defecto
      return '#10aede';
    }
  };

  const roleColor = getRoleColor(safeRoleTitle);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Card principal con rol vigente */}
      <Card
        sx={{
          border: `1px solid ${roleColor}40`,
          borderRadius: 2,
          background: `linear-gradient(135deg, ${roleColor}15 0%, ${roleColor}25 100%)`,
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: `${roleColor}20`,
                border: `2px solid ${roleColor}`,
                color: roleColor,
                fontWeight: 700,
                fontSize: '1.2rem'
              }}
            >
              <Person sx={{ fontSize: 28 }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  color: '#e8f4fd',
                  opacity: 0.7,
                  fontSize: '0.7rem',
                  display: 'block',
                  mb: 0.25
                }}
              >
                Tu Rol Actual
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  mb: 0.5
                }}
              >
                {safeRoleTitle}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  icon={<EmojiEvents sx={{ fontSize: 14 }} />}
                  label={`Nivel ${safeLevel}`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    height: 24
                  }}
                />
                <Chip
                  icon={<AutoAwesome sx={{ fontSize: 14, color: roleColor }} />}
                  label="En Progreso"
                  size="small"
                  sx={{
                    backgroundColor: `${roleColor}20`,
                    color: roleColor,
                    border: `1px solid ${roleColor}40`,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    height: 24
                  }}
                />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Micro-historia al subir de nivel */}
      <Collapse in={showStory} timeout={600}>
        <Card
          sx={{
            border: `2px solid ${roleColor}60`,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${roleColor}20 0%, ${roleColor}30 100%)`,
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden',
            animation: showStory ? 'pulse 0.6s ease-in-out' : 'none',
            '@keyframes pulse': {
              '0%': {
                transform: 'scale(0.98)',
                opacity: 0.8
              },
              '50%': {
                transform: 'scale(1.01)',
                opacity: 1
              },
              '100%': {
                transform: 'scale(1)',
                opacity: 1
              }
            }
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: `${roleColor}30`,
                  border: `2px solid ${roleColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  animation: showStory ? 'bounce 0.6s ease-in-out' : 'none',
                  '@keyframes bounce': {
                    '0%, 100%': {
                      transform: 'translateY(0)'
                    },
                    '50%': {
                      transform: 'translateY(-8px)'
                    }
                  }
                }}
              >
                <EmojiEvents sx={{ fontSize: 24, color: roleColor }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: '#ffffff',
                    fontWeight: 700,
                    mb: 0.75,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <AutoAwesome sx={{ fontSize: 16, color: roleColor }} />
                  ¡Subiste de Nivel!
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#e8f4fd',
                    lineHeight: 1.6,
                    fontSize: '0.85rem',
                    fontStyle: 'italic'
                  }}
                >
                  {currentStory}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Collapse>
    </Box>
  );
};

export default NarrativeProgress;
