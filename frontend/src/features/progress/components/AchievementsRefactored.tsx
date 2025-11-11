import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Tabs,
  Tab,
  Chip,
  Tooltip
} from '@mui/material';
import { EmojiEvents, WorkspacePremium, Lock } from '@mui/icons-material';
import { EmptyState } from './EmptyState';

interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedAt?: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface Medal {
  id: string;
  title: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  earnedAt?: string;
}

interface AchievementsProps {
  achievements: Achievement[];
  medals: Medal[];
  onFilterChange?: (filter: string) => void;
}

/**
 * Achievements - Componente refactorizado de logros y medallas
 * Tabs "Logros" / "Medallas", grid responsive, filtros por rarity
 */
const Achievements: React.FC<AchievementsProps> = ({
  achievements,
  medals,
  onFilterChange
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);

  // Get rarity color
  const getRarityColor = (rarity: Achievement['rarity']): string => {
    switch (rarity) {
      case 'legendary':
        return '#FFD700';
      case 'epic':
        return '#9C27B0';
      case 'rare':
        return '#2196F3';
      case 'common':
        return '#4CAF50';
      default:
        return '#9e9e9e';
    }
  };

  // Get rarity label
  const getRarityLabel = (rarity: Achievement['rarity']): string => {
    switch (rarity) {
      case 'legendary':
        return 'Legendario';
      case 'epic':
        return 'Épico';
      case 'rare':
        return 'Raro';
      case 'common':
        return 'Común';
      default:
        return 'Desconocido';
    }
  };

  // Get medal color
  const getMedalColor = (tier: Medal['tier']): string => {
    switch (tier) {
      case 'platinum':
        return '#E5E4E2';
      case 'gold':
        return '#FFD700';
      case 'silver':
        return '#C0C0C0';
      case 'bronze':
        return '#CD7F32';
      default:
        return '#9e9e9e';
    }
  };

  // Filter achievements by rarity
  const filteredAchievements = useMemo(() => {
    if (!rarityFilter) {
      return achievements;
    }
    return achievements.filter(ach => ach.rarity === rarityFilter);
  }, [achievements, rarityFilter]);

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setRarityFilter(null);
    if (onFilterChange) {
      onFilterChange(newValue === 0 ? 'achievements' : 'medals');
    }
  };

  // Handle rarity filter
  const handleRarityFilter = (rarity: string | null) => {
    setRarityFilter(rarity);
  };

  // Get unique rarities
  const uniqueRarities = useMemo(() => {
    const rarities = new Set(achievements.map(ach => ach.rarity));
    return Array.from(rarities);
  }, [achievements]);

  return (
    <Card
      sx={{
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.05)'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header with tabs */}
        <Box sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              '& .MuiTab-root': {
                color: '#e8f4fd',
                textTransform: 'none',
                fontWeight: 600,
                '&.Mui-selected': {
                  color: '#2196F3'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#2196F3'
              }
            }}
            aria-label="Tabs de logros y medallas"
          >
            <Tab
              icon={<EmojiEvents />}
              iconPosition="start"
              label={`Logros (${achievements.length})`}
              aria-controls="achievements-panel"
              id="achievements-tab"
            />
            <Tab
              icon={<WorkspacePremium />}
              iconPosition="start"
              label={`Medallas (${medals.length})`}
              aria-controls="medals-panel"
              id="medals-tab"
            />
          </Tabs>
        </Box>

        {/* Achievements Tab */}
        {activeTab === 0 && (
          <Box id="achievements-panel" role="tabpanel" aria-labelledby="achievements-tab">
            {/* Rarity filters */}
            {uniqueRarities.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                <Chip
                  label="Todos"
                  onClick={() => handleRarityFilter(null)}
                  sx={{
                    backgroundColor: !rarityFilter ? 'rgba(33, 150, 243, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    color: !rarityFilter ? '#2196F3' : '#ffffff',
                    border: !rarityFilter ? '1px solid rgba(33, 150, 243, 0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
                    cursor: 'pointer'
                  }}
                />
                {uniqueRarities.map(rarity => (
                  <Chip
                    key={rarity}
                    label={getRarityLabel(rarity)}
                    onClick={() => handleRarityFilter(rarity)}
                    sx={{
                      backgroundColor: rarityFilter === rarity ? getRarityColor(rarity) + '40' : 'rgba(255, 255, 255, 0.1)',
                      color: rarityFilter === rarity ? getRarityColor(rarity) : '#ffffff',
                      border: `1px solid ${getRarityColor(rarity)}40`,
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </Box>
            )}

            {/* Achievements grid */}
            {filteredAchievements.length === 0 ? (
              <EmptyState
                title="No hay logros disponibles"
                description="Los logros aparecerán conforme avances en tu aprendizaje."
              />
            ) : (
              <Grid container spacing={2}>
                {filteredAchievements.map(achievement => {
                  const isEarned = !!achievement.earnedAt;
                  const rarityColor = getRarityColor(achievement.rarity);

                  return (
                    <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                      <Tooltip
                        title={
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                              {achievement.title}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              {achievement.description}
                            </Typography>
                            {isEarned && achievement.earnedAt && (
                              <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                                Obtenido: {new Date(achievement.earnedAt).toLocaleDateString('es-ES')}
                              </Typography>
                            )}
                            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: rarityColor }}>
                              {getRarityLabel(achievement.rarity)}
                            </Typography>
                          </Box>
                        }
                        arrow
                        placement="top"
                      >
                        <Box
                          sx={{
                            p: 2,
                            border: `2px solid ${isEarned ? rarityColor : 'rgba(158, 158, 158, 0.3)'}`,
                            borderRadius: 2,
                            backgroundColor: isEarned ? `${rarityColor}15` : 'rgba(158, 158, 158, 0.1)',
                            opacity: isEarned ? 1 : 0.6,
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              backgroundColor: isEarned ? `${rarityColor}25` : 'rgba(158, 158, 158, 0.15)',
                              boxShadow: `0 4px 12px ${isEarned ? `${rarityColor}40` : 'rgba(158, 158, 158, 0.2)'}`
                            }
                          }}
                          aria-label={`Logro: ${achievement.title}, ${isEarned ? 'obtenido' : 'no obtenido'}`}
                        >
                          {!isEarned && (
                            <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                              <Lock sx={{ fontSize: 16, color: '#9e9e9e' }} />
                            </Box>
                          )}
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
                                width: 48,
                                height: 48,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                                backgroundColor: isEarned ? `${rarityColor}20` : 'rgba(158, 158, 158, 0.2)',
                                border: `2px solid ${isEarned ? rarityColor : '#9e9e9e'}`,
                                fontSize: '1.5rem',
                                filter: isEarned ? 'none' : 'grayscale(100%)'
                              }}
                            >
                              {achievement.icon || <EmojiEvents />}
                            </Box>
                          </Box>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              color: isEarned ? '#ffffff' : '#9e9e9e',
                              fontWeight: 600,
                              textAlign: 'center',
                              mb: 0.5,
                              fontSize: '0.875rem'
                            }}
                          >
                            {achievement.title}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: rarityColor,
                              fontWeight: 600,
                              textAlign: 'center',
                              display: 'block',
                              fontSize: '0.7rem',
                              textTransform: 'uppercase'
                            }}
                          >
                            {getRarityLabel(achievement.rarity)}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        )}

        {/* Medals Tab */}
        {activeTab === 1 && (
          <Box id="medals-panel" role="tabpanel" aria-labelledby="medals-tab">
            {medals.length === 0 ? (
              <EmptyState
                title="Aún no has obtenido medallas"
                description="Completa lecciones y acumula XP para obtener medallas."
              />
            ) : (
              <Grid container spacing={2}>
                {medals.map(medal => {
                  const isEarned = !!medal.earnedAt;
                  const medalColor = getMedalColor(medal.tier);

                  return (
                    <Grid item xs={12} sm={6} md={4} key={medal.id}>
                      <Box
                        sx={{
                          p: 2,
                          border: `2px solid ${isEarned ? medalColor : 'rgba(158, 158, 158, 0.3)'}`,
                          borderRadius: 2,
                          backgroundColor: isEarned ? `${medalColor}15` : 'rgba(158, 158, 158, 0.1)',
                          opacity: isEarned ? 1 : 0.6,
                          textAlign: 'center'
                        }}
                      >
                        <WorkspacePremium
                          sx={{
                            fontSize: 48,
                            color: isEarned ? medalColor : '#9e9e9e',
                            mb: 1,
                            filter: isEarned ? 'none' : 'grayscale(100%)'
                          }}
                        />
                        <Typography variant="subtitle2" sx={{ color: isEarned ? '#ffffff' : '#9e9e9e', fontWeight: 600 }}>
                          {medal.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: medalColor, fontWeight: 600, textTransform: 'uppercase' }}>
                          {medal.tier}
                        </Typography>
                        {isEarned && medal.earnedAt && (
                          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#e8f4fd', opacity: 0.7 }}>
                            {new Date(medal.earnedAt).toLocaleDateString('es-ES')}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default Achievements;

