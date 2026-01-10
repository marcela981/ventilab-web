import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Tooltip,
  CircularProgress,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Button
} from '@mui/material';
import { Close, School } from '@mui/icons-material';
import { EmptyState } from './EmptyState';

interface SkillNode {
  id: string;
  label: string;
  description: string;
  category: string;
  dependsOn: string[];
  mastery: number; // 0-1
  relatedLessons: string[];
}

interface SkillTreeProps {
  skills: SkillNode[];
  unlockedSkillIds: string[];
  onSkillClick?: (skillId: string) => void;
  onNavigateToLesson?: (moduleId: string, lessonId: string) => void;
}

/**
 * SkillTree - Árbol de habilidades refactorizado
 * Renderiza vista tipo grafo simple basada en filas, agrupado por categoría
 */
const SkillTree: React.FC<SkillTreeProps> = ({
  skills,
  unlockedSkillIds,
  onSkillClick,
  onNavigateToLesson
}) => {
  const [selectedSkill, setSelectedSkill] = useState<SkillNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const unlockedSet = useMemo(() => new Set(unlockedSkillIds), [unlockedSkillIds]);

  // Group skills by category
  const skillsByCategory = useMemo(() => {
    const grouped: Record<string, SkillNode[]> = {};
    skills.forEach(skill => {
      if (!grouped[skill.category]) {
        grouped[skill.category] = [];
      }
      grouped[skill.category].push(skill);
    });
    return grouped;
  }, [skills]);

  // Get skill state
  const getSkillState = (skill: SkillNode): 'locked' | 'unlocked' | 'progress' => {
    if (unlockedSet.has(skill.id)) {
      return 'unlocked';
    }
    // Check if dependencies are met
    const depsMet = skill.dependsOn.every(depId => unlockedSet.has(depId));
    if (depsMet && skill.mastery > 0) {
      return 'progress';
    }
    return 'locked';
  };

  // Get skill color
  const getSkillColor = (skill: SkillNode): string => {
    const state = getSkillState(skill);
    switch (state) {
      case 'unlocked':
        return skill.mastery >= 0.8 ? '#4CAF50' : '#2196F3';
      case 'progress':
        return '#FF9800';
      case 'locked':
      default:
        return '#9e9e9e';
    }
  };

  // Handle skill click
  const handleSkillClick = (skill: SkillNode) => {
    if (getSkillState(skill) === 'locked') {
      return;
    }
    setSelectedSkill(skill);
    setDrawerOpen(true);
    if (onSkillClick) {
      onSkillClick(skill.id);
    }
  };

  // Get recommended skills (≥60% mastery, not unlocked)
  const recommendedSkills = useMemo(() => {
    return skills
      .filter(skill => {
        const state = getSkillState(skill);
        return state === 'progress' && skill.mastery >= 0.6;
      })
      .sort((a, b) => b.mastery - a.mastery)
      .slice(0, 3);
  }, [skills, unlockedSet]);

  // Empty state
  if (skills.length === 0) {
    return (
      <Card
        sx={{
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.05)'
        }}
      >
        <CardContent>
          <EmptyState
            title="Aún no has desbloqueado habilidades"
            description="Empieza por completar lecciones para desbloquear habilidades."
            suggestions={recommendedSkills.length > 0 ? recommendedSkills.map(skill => ({
              label: skill.label,
              onClick: () => handleSkillClick(skill)
            })) : undefined}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card
        sx={{
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.05)'
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600, mb: 3 }}>
            Árbol de Habilidades
          </Typography>

          {/* Skills grouped by category */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
              <Box key={category}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: '#e8f4fd',
                    fontWeight: 600,
                    mb: 2,
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: 1
                  }}
                >
                  {category}
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: 2
                  }}
                >
                  {categorySkills.map(skill => {
                    const state = getSkillState(skill);
                    const color = getSkillColor(skill);
                    const isLocked = state === 'locked';

                    return (
                      <Tooltip
                        key={skill.id}
                        title={
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                              {skill.label}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              {skill.description}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', opacity: 0.9 }}>
                              Maestría: {Math.round(skill.mastery * 100)}%
                            </Typography>
                          </Box>
                        }
                        arrow
                        placement="top"
                      >
                        <Box
                          onClick={() => handleSkillClick(skill)}
                          sx={{
                            position: 'relative',
                            width: 100,
                            height: 100,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `2px solid ${color}`,
                            borderRadius: '50%',
                            backgroundColor: isLocked ? 'rgba(158, 158, 158, 0.1)' : `${color}20`,
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            opacity: isLocked ? 0.5 : 1,
                            transition: 'all 0.2s ease',
                            '&:hover': !isLocked ? {
                              transform: 'scale(1.1)',
                              backgroundColor: `${color}30`,
                              boxShadow: `0 4px 12px ${color}40`
                            } : {}
                          }}
                          aria-label={`Habilidad: ${skill.label}, ${state}`}
                        >
                          <CircularProgress
                            variant="determinate"
                            value={skill.mastery * 100}
                            size={96}
                            thickness={3}
                            sx={{
                              color: color,
                              position: 'absolute',
                              '& .MuiCircularProgress-circle': {
                                strokeLinecap: 'round'
                              }
                            }}
                          />
                          <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                            <Typography
                              variant="caption"
                              sx={{
                                color: isLocked ? '#9e9e9e' : '#ffffff',
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                lineHeight: 1.2,
                                display: 'block'
                              }}
                            >
                              {skill.label.split(' ')[0]}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: '0.65rem',
                                color: color,
                                fontWeight: 600
                              }}
                            >
                              {Math.round(skill.mastery * 100)}%
                            </Typography>
                          </Box>
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>
            ))}
          </Box>

          {/* Recommendations */}
          {recommendedSkills.length > 0 && (
            <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <Typography variant="subtitle2" sx={{ color: '#FF9800', fontWeight: 600, mb: 2 }}>
                Siguiente paso
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {recommendedSkills.map(skill => (
                  <Button
                    key={skill.id}
                    variant="outlined"
                    size="small"
                    onClick={() => handleSkillClick(skill)}
                    sx={{
                      borderColor: '#FF9800',
                      color: '#FF9800',
                      justifyContent: 'flex-start',
                      textTransform: 'none'
                    }}
                  >
                    {skill.label} ({Math.round(skill.mastery * 100)}%)
                  </Button>
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Skill Detail Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 400 },
            backgroundColor: 'rgba(30, 30, 30, 0.95)',
            color: '#ffffff'
          }
        }}
      >
        {selectedSkill && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {selectedSkill.label}
              </Typography>
              <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: '#ffffff' }}>
                <Close />
              </IconButton>
            </Box>

            <Typography variant="body2" sx={{ mb: 3, color: '#e8f4fd', opacity: 0.9 }}>
              {selectedSkill.description}
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Maestría: {Math.round(selectedSkill.mastery * 100)}%
              </Typography>
              <CircularProgress
                variant="determinate"
                value={selectedSkill.mastery * 100}
                size={80}
                sx={{ color: getSkillColor(selectedSkill) }}
              />
            </Box>

            {selectedSkill.relatedLessons.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Lecciones relacionadas
                </Typography>
                <List>
                  {selectedSkill.relatedLessons.map((lessonId, index) => (
                    <ListItem
                      key={index}
                      button
                      onClick={() => {
                        // Extract moduleId from lessonId or use default
                        const moduleId = 'module-01-fundamentals'; // TODO: Map lessonId to moduleId
                        if (onNavigateToLesson) {
                          onNavigateToLesson(moduleId, lessonId);
                        }
                        setDrawerOpen(false);
                      }}
                    >
                      <School sx={{ mr: 2, fontSize: 20 }} />
                      <ListItemText primary={lessonId} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}
      </Drawer>
    </>
  );
};

export default SkillTree;

