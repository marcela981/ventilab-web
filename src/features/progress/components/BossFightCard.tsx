import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  useTheme
} from '@mui/material';
import {
  Shield,
  PlayArrow,
  Star,
  EmojiEvents,
  Lock,
  Security,
  Speed,
  Lightbulb
} from '@mui/icons-material';
import { BossFight } from '../types';
import { trackEvent } from '../utils/analytics';

interface BossFightCardProps {
  boss: BossFight;
  onStart?: (id: string) => void;
}

/**
 * BossFightCard - Tarjeta de caso jefe/boss fight
 * 
 * Muestra:
 * - 3 estrellas específicas (seguridad, eficacia, explicación)
 * - Número de intentos
 * - Mejor puntuación
 * - Pista de desbloqueo si está bloqueado
 */
const BossFightCard: React.FC<BossFightCardProps> = ({
  boss,
  onStart
}) => {
  const theme = useTheme();

  // Valores por defecto seguros
  const isLocked = boss.locked || false;
  const attempts = boss.attempts || 0;
  const bestScore = boss.bestScore || 0;
  const starSecurity = boss.starSecurity || false;
  const starEfficacy = boss.starEfficacy || false;
  const starExplanation = boss.starExplanation || false;
  const totalStars = [starSecurity, starEfficacy, starExplanation].filter(Boolean).length;

  // Obtener color según dificultad
  const getDifficultyColor = (difficulty: BossFight['difficulty']): string => {
    switch (difficulty) {
      case 'hard': return '#F44336';
      case 'medium': return '#FF9800';
      case 'easy': return '#4CAF50';
      default: return '#9e9e9e';
    }
  };

  // Obtener label de dificultad
  const getDifficultyLabel = (difficulty: BossFight['difficulty']): string => {
    switch (difficulty) {
      case 'hard': return 'Difícil';
      case 'medium': return 'Medio';
      case 'easy': return 'Fácil';
      default: return 'Desconocido';
    }
  };

  const difficultyColor = getDifficultyColor(boss.difficulty);
  const isCompleted = totalStars > 0;

  return (
    <Card
      sx={{
        border: isLocked
          ? '1px solid rgba(158, 158, 158, 0.3)'
          : isCompleted
          ? `2px solid rgba(255, 215, 0, 0.5)`
          : `2px solid ${difficultyColor}40`,
        borderRadius: 2,
        background: isLocked
          ? 'rgba(158, 158, 158, 0.05)'
          : isCompleted
          ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 193, 7, 0.1) 100%)'
          : `linear-gradient(135deg, ${difficultyColor}15 0%, ${difficultyColor}25 100%)`,
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        opacity: isLocked ? 0.6 : 1,
        '&:hover': !isLocked ? {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 16px ${difficultyColor}40`
        } : {},
        '&::before': isCompleted && !isLocked ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #FFD700, #FFA000)'
        } : {}
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {isLocked ? (
                <Lock sx={{ fontSize: 24, color: '#9e9e9e' }} />
              ) : (
                <Shield sx={{ fontSize: 24, color: difficultyColor }} />
              )}
              <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700 }}>
                Caso Jefe
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 700, mb: 1 }}>
              {boss.title}
            </Typography>
            <Typography variant="body2" sx={{ color: '#e8f4fd', opacity: 0.8, mb: 2 }}>
              {boss.description}
            </Typography>
          </Box>
          {isCompleted && !isLocked && (
            <EmojiEvents sx={{ fontSize: 40, color: '#FFD700' }} />
          )}
        </Box>

        {/* Dificultad */}
        <Box sx={{ mb: 2 }}>
          <Chip
            label={getDifficultyLabel(boss.difficulty)}
            sx={{
              backgroundColor: `${difficultyColor}20`,
              color: difficultyColor,
              border: `1px solid ${difficultyColor}`,
              fontWeight: 600
            }}
          />
        </Box>

        {/* Pista de desbloqueo si está bloqueado */}
        {isLocked && boss.lockHint && (
          <Box
            sx={{
              p: 2,
              mb: 2,
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              borderRadius: 2,
              border: '1px solid rgba(255, 152, 0, 0.3)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Lock sx={{ fontSize: 18, color: '#FF9800' }} />
              <Typography variant="body2" sx={{ color: '#FF9800', fontWeight: 600 }}>
                Bloqueado
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.9, fontSize: '0.8rem', lineHeight: 1.5 }}>
              {boss.lockHint || 'Completa los módulos anteriores para acceder a este caso.'}
            </Typography>
          </Box>
        )}

        {/* Estrellas: Seguridad, Eficacia, Explicación */}
        {!isLocked && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#e8f4fd', fontWeight: 600, mb: 1.5 }}>
              Estrellas Obtenidas
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* Estrella de Seguridad */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 1.5,
                  border: `1px solid ${starSecurity ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`
                }}
              >
                <Security
                  sx={{
                    fontSize: 24,
                    color: starSecurity ? '#4CAF50' : 'rgba(255, 255, 255, 0.3)'
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600, mb: 0.25 }}>
                    Seguridad
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.7, fontSize: '0.75rem' }}>
                    {starSecurity ? 'Obtenida' : 'No obtenida'}
                  </Typography>
                </Box>
                <Star
                  sx={{
                    fontSize: 28,
                    color: starSecurity ? '#FFD700' : 'rgba(255, 255, 255, 0.2)'
                  }}
                />
              </Box>

              {/* Estrella de Eficacia */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 1.5,
                  border: `1px solid ${starEfficacy ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`
                }}
              >
                <Speed
                  sx={{
                    fontSize: 24,
                    color: starEfficacy ? '#4CAF50' : 'rgba(255, 255, 255, 0.3)'
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600, mb: 0.25 }}>
                    Eficacia
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.7, fontSize: '0.75rem' }}>
                    {starEfficacy ? 'Obtenida' : 'No obtenida'}
                  </Typography>
                </Box>
                <Star
                  sx={{
                    fontSize: 28,
                    color: starEfficacy ? '#FFD700' : 'rgba(255, 255, 255, 0.2)'
                  }}
                />
              </Box>

              {/* Estrella de Explicación */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 1.5,
                  border: `1px solid ${starExplanation ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`
                }}
              >
                <Lightbulb
                  sx={{
                    fontSize: 24,
                    color: starExplanation ? '#4CAF50' : 'rgba(255, 255, 255, 0.3)'
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600, mb: 0.25 }}>
                    Explicación
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.7, fontSize: '0.75rem' }}>
                    {starExplanation ? 'Obtenida' : 'No obtenida'}
                  </Typography>
                </Box>
                <Star
                  sx={{
                    fontSize: 28,
                    color: starExplanation ? '#FFD700' : 'rgba(255, 255, 255, 0.2)'
                  }}
                />
              </Box>
            </Box>
          </Box>
        )}

        {/* Estadísticas: Intentos y Mejor Puntuación */}
        {!isLocked && (
          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              mb: 2,
              p: 1.5,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 1.5
            }}
          >
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.8, mb: 0.5, fontSize: '0.7rem', display: 'block' }}>
                Intentos
              </Typography>
              <Typography variant="h6" sx={{ color: '#2196F3', fontWeight: 700 }}>
                {attempts}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.8, mb: 0.5, fontSize: '0.7rem', display: 'block' }}>
                Mejor Puntuación
              </Typography>
              <Typography variant="h6" sx={{ color: '#FFD700', fontWeight: 700 }}>
                {bestScore}%
              </Typography>
            </Box>
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.8, mb: 0.5, fontSize: '0.7rem', display: 'block' }}>
                Estrellas
              </Typography>
              <Typography variant="h6" sx={{ color: '#FFD700', fontWeight: 700 }}>
                {totalStars}/3
              </Typography>
            </Box>
          </Box>
        )}

        {/* Información de completado */}
        {isCompleted && !isLocked && boss.completedAt && (
          <Box
            sx={{
              p: 1.5,
              mb: 2,
              backgroundColor: 'rgba(255, 215, 0, 0.1)',
              borderRadius: 2,
              border: '1px solid rgba(255, 215, 0, 0.3)'
            }}
          >
            <Typography variant="body2" sx={{ color: '#FFD700', fontWeight: 600, mb: 0.5 }}>
              ✓ Completado el {new Date(boss.completedAt).toLocaleDateString()}
            </Typography>
            {totalStars === 3 && (
              <Typography variant="caption" sx={{ color: '#e8f4fd', opacity: 0.8 }}>
                ¡Perfecto! Obtuviste todas las estrellas.
              </Typography>
            )}
          </Box>
        )}

        {/* Botón de acción */}
        <Button
          variant={isCompleted && !isLocked ? 'outlined' : 'contained'}
          fullWidth
          size="medium"
          startIcon={isLocked ? <Lock /> : isCompleted ? <EmojiEvents /> : <PlayArrow />}
          onClick={() => {
            if (!isLocked) {
              trackEvent('boss_fight_start_click', {
                bossId: boss.id,
                bossTitle: boss.title,
                difficulty: boss.difficulty,
                isCompleted,
                attempts,
                bestScore,
                totalStars,
                starSecurity,
                starEfficacy,
                starExplanation
              });
              onStart?.(boss.id);
            }
          }}
          disabled={isLocked}
          data-analytics-id={`boss-fight-start-${boss.id}`}
          aria-label={isLocked ? `Caso jefe "${boss.title}" bloqueado` : isCompleted ? `Reintentar caso jefe: ${boss.title}` : `Iniciar caso jefe: ${boss.title}`}
          sx={{
            backgroundColor: isLocked
              ? 'rgba(158, 158, 158, 0.2)'
              : isCompleted
              ? 'transparent'
              : difficultyColor,
            borderColor: isLocked
              ? 'rgba(158, 158, 158, 0.3)'
              : isCompleted
              ? '#FFD700'
              : difficultyColor,
            color: isLocked
              ? 'rgba(255, 255, 255, 0.4)'
              : isCompleted
              ? '#FFD700'
              : '#ffffff',
            fontWeight: 700,
            textTransform: 'none',
            py: 1.5,
            borderRadius: 2,
            fontSize: '1rem',
            '&:hover': !isLocked ? {
              backgroundColor: isCompleted ? 'rgba(255, 215, 0, 0.1)' : difficultyColor,
              filter: 'brightness(0.9)',
              transform: 'scale(1.02)'
            } : {},
            '&.Mui-disabled': {
              borderColor: 'rgba(158, 158, 158, 0.3)',
              color: 'rgba(255, 255, 255, 0.4)'
            }
          }}
        >
          {isLocked
            ? 'Bloqueado'
            : isCompleted
            ? 'Reintentar Caso'
            : 'Iniciar Caso Jefe'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BossFightCard;
