import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Tooltip,
  LinearProgress,
  useTheme
} from '@mui/material';
import {
  EmojiEvents,
  Lock,
  HelpOutline
} from '@mui/icons-material';
import { Achievement } from '../types';

interface AchievementsGridProps {
  achievements: Achievement[];
}

/**
 * AchievementsGrid - Grid responsivo de logros
 * 
 * Muestra logros en un grid con:
 * - Icono, título y descripción
 * - Pista (hint) si no está desbloqueado
 * - Barra de progreso pequeña si es incremental
 */
const AchievementsGrid: React.FC<AchievementsGridProps> = ({
  achievements
}) => {
  const theme = useTheme();

  // Obtener color según rareza
  const getRarityColor = (rarity: Achievement['rarity']): string => {
    switch (rarity) {
      case 'legendary': return '#FFD700';
      case 'epic': return '#9C27B0';
      case 'rare': return '#2196F3';
      case 'common': return '#4CAF50';
      default: return '#9e9e9e';
    }
  };

  // Obtener label de rareza
  const getRarityLabel = (rarity: Achievement['rarity']): string => {
    switch (rarity) {
      case 'legendary': return 'Legendario';
      case 'epic': return 'Épico';
      case 'rare': return 'Raro';
      case 'common': return 'Común';
      default: return 'Desconocido';
    }
  };

  // Verificar si el logro es incremental (tiene progreso)
  const isIncremental = (achievement: Achievement): boolean => {
    return !!achievement.progress && achievement.progress.target > 0;
  };

  // Calcular estadísticas
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <Card
      sx={{
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        transition: 'all 0.3s ease'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography
            variant="h6"
            sx={{
              color: '#ffffff',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 0.75
            }}
          >
            <EmojiEvents sx={{ fontSize: 24 }} />
            Logros y Medallas
          </Typography>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: 1.5,
              backgroundColor: 'rgba(76, 175, 80, 0.2)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 0.75
            }}
          >
            <Typography variant="body2" sx={{ color: '#4CAF50', fontWeight: 700 }}>
              {unlockedCount}/{totalCount}
            </Typography>
          </Box>
        </Box>

        {/* Grid responsivo de logros */}
        <Grid container spacing={2}>
          {achievements.map((achievement) => {
            const isUnlocked = achievement.unlocked;
            const rarityColor = getRarityColor(achievement.rarity);
            const incremental = isIncremental(achievement);
            const progress = achievement.progress;

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={achievement.id}>
                <Tooltip
                  title={
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {achievement.title}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {achievement.description}
                      </Typography>
                      {!isUnlocked && achievement.hint && (
                        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 0.5,
                              fontStyle: 'italic'
                            }}
                          >
                            <HelpOutline sx={{ fontSize: 14 }} />
                            Pista: {achievement.hint}
                          </Typography>
                        </Box>
                      )}
                      {incremental && progress && (
                        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                          <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                            Progreso: {progress.current} / {progress.target}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={progress.percentage}
                            sx={{
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: 'rgba(255, 255, 255, 0.2)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: rarityColor,
                                borderRadius: 2
                              }
                            }}
                          />
                        </Box>
                      )}
                      {isUnlocked && achievement.unlockedAt && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.8 }}>
                          Desbloqueado: {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </Typography>
                      )}
                      <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.7rem',
                            color: rarityColor,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                          }}
                        >
                          {getRarityLabel(achievement.rarity)}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  arrow
                  placement="top"
                >
                  <Box
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      p: 2,
                      border: `2px solid ${isUnlocked ? rarityColor : 'rgba(158, 158, 158, 0.3)'}`,
                      borderRadius: 2,
                      backgroundColor: isUnlocked
                        ? `${rarityColor}15`
                        : 'rgba(158, 158, 158, 0.1)',
                      cursor: 'pointer',
                      opacity: isUnlocked ? 1 : 0.6,
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        backgroundColor: isUnlocked
                          ? `${rarityColor}25`
                          : 'rgba(158, 158, 158, 0.15)',
                        boxShadow: `0 4px 12px ${isUnlocked ? `${rarityColor}40` : 'rgba(158, 158, 158, 0.2)'}`,
                        borderColor: isUnlocked ? rarityColor : 'rgba(158, 158, 158, 0.4)'
                      }
                    }}
                    aria-label={`Logro: ${achievement.title}, ${isUnlocked ? 'desbloqueado' : 'bloqueado'}`}
                  >
                    {/* Icono de bloqueo */}
                    {!isUnlocked && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 1
                        }}
                      >
                        <Lock sx={{ fontSize: 20, color: '#9e9e9e' }} />
                      </Box>
                    )}

                    {/* Icono del logro */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 1.5
                      }}
                    >
                      <Box
                        sx={{
                          width: 64,
                          height: 64,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          backgroundColor: isUnlocked ? `${rarityColor}20` : 'rgba(158, 158, 158, 0.2)',
                          border: `2px solid ${isUnlocked ? rarityColor : '#9e9e9e'}`,
                          color: isUnlocked ? rarityColor : '#9e9e9e',
                          fontSize: '2rem',
                          fontWeight: 700,
                          filter: isUnlocked ? 'none' : 'grayscale(100%)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {achievement.icon || <EmojiEvents sx={{ fontSize: 32 }} />}
                      </Box>
                    </Box>

                    {/* Título */}
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: isUnlocked ? '#ffffff' : '#9e9e9e',
                        fontWeight: 600,
                        mb: 0.75,
                        textAlign: 'center',
                        minHeight: '2.5rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {achievement.title}
                    </Typography>

                    {/* Descripción */}
                    <Typography
                      variant="caption"
                      sx={{
                        color: isUnlocked ? '#e8f4fd' : '#9e9e9e',
                        opacity: 0.8,
                        textAlign: 'center',
                        mb: 1.5,
                        minHeight: '2.5rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontSize: '0.75rem',
                        lineHeight: 1.4
                      }}
                    >
                      {achievement.description}
                    </Typography>

                    {/* Pista si está bloqueado */}
                    {!isUnlocked && achievement.hint && (
                      <Box
                        sx={{
                          mt: 'auto',
                          pt: 1,
                          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }}
                      >
                        <HelpOutline sx={{ fontSize: 14, color: '#FF9800', flexShrink: 0 }} />
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#FF9800',
                            fontSize: '0.7rem',
                            fontStyle: 'italic',
                            lineHeight: 1.3
                          }}
                        >
                          {achievement.hint}
                        </Typography>
                      </Box>
                    )}

                    {/* Barra de progreso si es incremental */}
                    {incremental && progress && (
                      <Box sx={{ mt: 'auto', pt: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              color: isUnlocked ? '#e8f4fd' : '#9e9e9e',
                              fontSize: '0.7rem',
                              opacity: 0.8
                            }}
                          >
                            {progress.current} / {progress.target}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: rarityColor,
                              fontSize: '0.7rem',
                              fontWeight: 600
                            }}
                          >
                            {progress.percentage}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={progress.percentage}
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: rarityColor,
                              borderRadius: 2,
                              transition: 'transform 0.4s ease'
                            }
                          }}
                          aria-label={`Progreso del logro: ${progress.percentage}%`}
                        />
                      </Box>
                    )}

                    {/* Badge de rareza */}
                    <Box
                      sx={{
                        mt: 'auto',
                        pt: 1,
                        display: 'flex',
                        justifyContent: 'center'
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.65rem',
                          color: rarityColor,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          opacity: isUnlocked ? 1 : 0.6
                        }}
                      >
                        {getRarityLabel(achievement.rarity)}
                      </Typography>
                    </Box>
                  </Box>
                </Tooltip>
              </Grid>
            );
          })}
        </Grid>

        {/* Mensaje si no hay logros */}
        {achievements.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
              textAlign: 'center'
            }}
          >
            <EmojiEvents sx={{ fontSize: 48, color: '#e8f4fd', opacity: 0.3, mb: 2 }} />
            <Typography variant="body2" sx={{ color: '#e8f4fd', opacity: 0.7 }}>
              Los logros aparecerán conforme avances. Sigue estudiando para desbloquearlos.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AchievementsGrid;
