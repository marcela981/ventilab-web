"use client";

import React, { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  LinearProgress,
  Chip,
  useTheme,
  useMediaQuery,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ExpandMore
} from '@mui/icons-material';
import ModuleGrid from '../../../../../components/teaching/components/curriculum/ModuleGrid';

// Fallback cuando level.color no viene (ej. API antigua o niveles sin color)
const DEFAULT_LEVEL_COLORS = {
  prerequisitos: '#9E9E9E',
  beginner: '#4CAF50',
  intermediate: '#FF9800',
  advanced: '#F44336',
};
const getLevelColor = (level) =>
  level?.color ?? DEFAULT_LEVEL_COLORS[level?.id] ?? '#4CAF50';

/**
 * LevelStepper - Componente minimalista de niveles de aprendizaje
 *
 * Muestra el camino de aprendizaje organizado por niveles con un diseño limpio y moderno.
 * Cada nivel se presenta como una card horizontal con información de progreso y módulos.
 * Los módulos se organizan en un grid responsive que se adapta a diferentes pantallas.
 *
 * @component
 * @param {Array} levels - Array de niveles con id, title, description, color, emoji
 * @param {Object} levelProgress - Objeto con progreso por nivel (total, completed, percentage)
 * @param {Function} getModulesByLevel - Función para obtener módulos filtrados por nivel
 * @param {Function} calculateModuleProgress - Función para calcular progreso de cada módulo
 * @param {Function} isModuleAvailable - Función para verificar disponibilidad de módulos
 * @param {Function} getModuleStatus - Función para obtener estado del módulo (locked, available, in-progress, completed)
 * @param {Function} getTooltipMessage - Función para obtener mensaje de tooltip para módulos
 * @param {Function} onModuleClick - Callback ejecutado al hacer clic en un módulo (alias de onSectionClick)
 * @param {Function} onSectionClick - Callback ejecutado al hacer clic en un módulo
 * @param {Set} favoriteModules - Set de IDs de módulos marcados como favoritos
 * @param {Function} onToggleFavorite - Callback para toggle de favorito en un módulo
 * @param {JSX.Element} moduleGrid - Componente renderizado del grid de módulos (opcional, si no se proporciona se renderiza directamente)
 * @param {string} renderMode - Modo de renderizado: 'modules' (default) o 'lessons'
 * @returns {JSX.Element} Componente de niveles de aprendizaje
 */
const LevelStepper = ({
  levels = [],
  levelProgress = {},
  getModulesByLevel,
  calculateModuleProgress,
  isModuleAvailable,
  getModuleStatus,
  getTooltipMessage,
  onModuleClick,
  onSectionClick,
  favoriteModules = new Set(),
  onToggleFavorite,
  moduleGrid,
  renderMode = 'modules' // 'modules' o 'lessons'
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Usar onSectionClick si está disponible, sino onModuleClick
  const handleModuleClick = onSectionClick || onModuleClick;

  /**
   * Determina el nivel actual (el que el usuario está trabajando)
   * El nivel actual es el primer nivel que tiene progreso > 0 y < 100,
   * o el primer nivel sin iniciar si todos los anteriores están completos
   */
  const currentLevelId = useMemo(() => {
    for (const level of levels) {
      const levelProg = levelProgress[level.id] || { percentage: 0 };
      if (levelProg.percentage > 0 && levelProg.percentage < 100) {
        return level.id;
      }
    }
    // Si todos los niveles están completos o no iniciados, devolver el primero sin iniciar
    for (const level of levels) {
      const levelProg = levelProgress[level.id] || { percentage: 0 };
      if (levelProg.percentage === 0) {
        return level.id;
      }
    }
    // Si todo está completo, devolver el último nivel
    return levels[levels.length - 1]?.id;
  }, [levels, levelProgress]);

  // Estado para controlar qué niveles están expandidos
  const [expandedLevels, setExpandedLevels] = useState(new Set());

  // Inicializar con el nivel actual expandido cuando cambie
  useEffect(() => {
    if (currentLevelId) {
      setExpandedLevels((prev) => {
        const newSet = new Set(prev);
        newSet.add(currentLevelId);
        return newSet;
      });
    }
  }, [currentLevelId]);

  // Manejar cambio de expansión de niveles
  const handleAccordionChange = (levelId) => (event, isExpanded) => {
    setExpandedLevels((prev) => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(levelId);
      } else {
        newSet.delete(levelId);
      }
      return newSet;
    });
  };

  /**
   * Determina el estado visual del nivel basado en su progreso
   * @param {number} percentage - Porcentaje de completitud del nivel
   * @returns {Object} Objeto con label y color del estado
   */
  const getLevelStatus = (percentage) => {
    if (percentage === 100) return { label: 'Completado', color: 'success' };
    if (percentage > 0) return { label: 'En progreso', color: 'primary' };
    return { label: 'Sin iniciar', color: 'default' };
  };


  // Renderizar módulos o lecciones usando ModuleGrid si no se proporciona moduleGrid custom
  const renderModuleGrid = (levelModules, level) => {
    if (moduleGrid) {
      return moduleGrid;
    }

    // Si renderMode === 'lessons', ModuleGrid construirá las lecciones automáticamente
    if (renderMode === 'lessons') {
      return (
        <Box sx={{ mt: 1 }}>
          <ModuleGrid
            modules={[]} // No se necesitan módulos en modo lessons
            mode="lessons"
            levelId={level.id}
            levelColor={getLevelColor(level)}
            enableAnimations={true}
            emptyMessage={`No hay lecciones disponibles en ${level.title}`}
            favoriteModules={favoriteModules || new Set()} // Proporcionar Set vacío por defecto
            onToggleFavorite={onToggleFavorite || (() => {})} // Función vacía por defecto
            isModuleAvailable={isModuleAvailable || (() => true)} // Verificar disponibilidad basada en prerequisitos
            calculateModuleProgress={calculateModuleProgress || (() => 0)} // Función por defecto
            onModuleClick={handleModuleClick} // Pasar handleModuleClick (que es onSectionClick || onModuleClick)
          />
        </Box>
      );
    }

    // Modo 'modules' (comportamiento original)
    // Filtrar módulos bloqueados (no mostrar los que están bloqueados)
    const visibleModules = levelModules.filter((module) => {
      if (!calculateModuleProgress || !getModuleStatus) return true;
      const moduleProgress = calculateModuleProgress(module.id);
      const moduleStatus = getModuleStatus(module, moduleProgress);
      // No mostrar módulos bloqueados
      return moduleStatus !== 'locked';
    });

    if (!visibleModules || visibleModules.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" sx={{ color: '#e8f4fd' }}>
            No hay módulos disponibles en este nivel aún
          </Typography>
        </Box>
      );
    }

    // Usar ModuleGrid estandarizado con CSS Grid
    return (
      <Box sx={{ mt: 1 }}>
        <ModuleGrid
          modules={visibleModules}
          calculateModuleProgress={calculateModuleProgress}
          isModuleAvailable={isModuleAvailable}
          onModuleClick={handleModuleClick}
          onToggleFavorite={onToggleFavorite}
          favoriteModules={favoriteModules}
          getStatusIcon={() => null} // ModuleCard maneja sus propios iconos
          getButtonText={(module, progress, available) => {
            if (!available) return 'Bloqueado';
            if (progress === 100) return 'Completado';
            if (progress > 0) return 'Continuar';
            return 'Comenzar';
          }}
          getButtonIcon={() => null} // ModuleCard maneja sus propios iconos
          levelColor={getLevelColor(level)}
          enableAnimations={true}
          emptyMessage="No hay módulos disponibles en este nivel"
          mode="modules"
        />
      </Box>
    );
  };

  return (
    <Box sx={{ pb: 3, mb: 4 }}>
      {/* Header principal - diseño minimalista */}
      <Typography
        variant="h4"
        sx={{
          color: '#ffffff',
          fontWeight: 600,
          mb: 4,
          letterSpacing: '-0.5px'
        }}
      >
        Niveles de Aprendizaje
      </Typography>

      {/* Container de niveles */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {levels.map((level, levelIndex) => {
          const levelModules = getModulesByLevel ? getModulesByLevel(level.id) : [];
          
          // Calcular módulos visibles (no bloqueados) para mostrar el conteo preciso de cards
          // Nota: No usar useMemo dentro de map, calcular directamente
          let visibleModulesCount = 0;
          if (renderMode === 'modules') {
            // Filtrar módulos bloqueados (igual que en renderModuleGrid)
            if (calculateModuleProgress && getModuleStatus) {
              const visibleModules = levelModules.filter((module) => {
                const moduleProgress = calculateModuleProgress(module.id);
                const moduleStatus = getModuleStatus(module, moduleProgress);
                return moduleStatus !== 'locked';
              });
              visibleModulesCount = visibleModules.length;
            } else {
              visibleModulesCount = levelModules.length;
            }
          }
          
          // levelProgress ahora puede tener estructura nueva (levelProgressAggregated) o legacy
          const levelProgRaw = levelProgress[level.id] || {};
          // Detectar si es la estructura nueva (tiene completedLessons y totalLessons) o legacy (tiene completed y total)
          const isNewStructure = 'completedLessons' in levelProgRaw || 'totalLessons' in levelProgRaw;
          const levelProg = isNewStructure ? {
            // Estructura nueva: basada en lecciones completadas
            completedLessons: levelProgRaw.completedLessons || 0,
            totalLessons: levelProgRaw.totalLessons || 0,
            percentage: levelProgRaw.percentage || 0,
            totalModules: visibleModulesCount > 0 ? visibleModulesCount : (levelProgRaw.totalModules || levelModules.length), // Usar conteo preciso de cards visibles
          } : {
            // Estructura legacy: basada en módulos completados
            completed: levelProgRaw.completed || 0,
            total: levelProgRaw.total || levelModules.length,
            percentage: levelProgRaw.percentage || 0,
            totalModules: visibleModulesCount > 0 ? visibleModulesCount : levelModules.length,
          };
          const status = getLevelStatus(levelProg.percentage);
          const isCurrentLevel = level.id === currentLevelId;
          const isExpanded = expandedLevels.has(level.id);

          return (
            <Accordion
              key={level.id}
              expanded={isExpanded}
              onChange={handleAccordionChange(level.id)}
              sx={{
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                mb: 2,
                boxShadow: 'none',
                '&:before': {
                  display: 'none'
                },
                '&.Mui-expanded': {
                  margin: 0,
                  marginBottom: 2
                }
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore sx={{ color: '#ffffff' }} />}
                sx={{
                  px: 3,
                  py: 2,
                  '&.Mui-expanded': {
                    minHeight: 64,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  },
                  '& .MuiAccordionSummary-content': {
                    margin: '12px 0',
                    '&.Mui-expanded': {
                      margin: '12px 0'
                    }
                  }
                }}
              >
                {/* Header del nivel */}
                <Box sx={{ width: '100%', mr: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 2,
                      mb: 2
                    }}
                  >
                    {/* Emoji y título */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {/* Emoji prominente del nivel */}
                      <Typography
                        component="span"
                        sx={{
                          fontSize: '2.5rem',
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {level.emoji || '📚'}
                      </Typography>

                      {/* Título y descripción */}
                      <Box>
                        <Typography
                          variant="h5"
                          sx={{
                            color: getLevelColor(level),
                            fontWeight: 600,
                            mb: 0.5,
                            lineHeight: 1.2
                          }}
                        >
                          {level.title}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{
                            color: '#e8f4fd',
                            lineHeight: 1.6,
                            maxWidth: '600px'
                          }}
                        >
                          {level.description}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Chip de estado minimalista */}
                    <Chip
                      label={status.label}
                      color={status.color}
                      size="small"
                      sx={{
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        height: '24px',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  </Box>

                  {/* Barra de progreso minimalista */}
                  <Box sx={{ mt: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 0.5
                      }}
                    >
                      {/* Barra de progreso delgada */}
                      <LinearProgress
                        variant="determinate"
                        value={levelProg.percentage}
                        sx={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: `${theme.palette.grey[400]}10`,
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getLevelColor(level),
                            borderRadius: 3,
                            transition: 'transform 0.3s ease'
                          }
                        }}
                      />

                      {/* Texto de progreso compacto */}
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: 0.25,
                          minWidth: isMobile ? '100px' : '120px'
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: 0.5
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: getLevelColor(level),
                              fontWeight: 700,
                              fontSize: '0.95rem'
                            }}
                          >
                            {levelProg.percentage.toFixed(0)}%
                          </Typography>
                          {/* Mostrar lecciones completadas / total lecciones */}
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#e8f4fd',
                              fontSize: '0.7rem'
                            }}
                          >
                            ({isNewStructure ? levelProg.completedLessons : levelProg.completed}/{isNewStructure ? levelProg.totalLessons : levelProg.total} lecciones)
                          </Typography>
                        </Box>
                        {/* Mostrar cantidad de cards (módulos) - solo en modo modules */}
                        {renderMode === 'modules' && levelProg.totalModules > 0 && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#b0bec5',
                              fontSize: '0.65rem',
                              fontStyle: 'italic'
                            }}
                          >
                            {levelProg.totalModules} {levelProg.totalModules === 1 ? 'tarjeta' : 'tarjetas'}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </AccordionSummary>

              <AccordionDetails sx={{ px: 3, pb: 3 }}>
                {/* Grid de módulos responsive */}
                {renderModuleGrid(levelModules, level)}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    </Box>
  );
};

// PropTypes
LevelStepper.propTypes = {
  levels: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    emoji: PropTypes.string // Emoji opcional para cada nivel
  })),
  levelProgress: PropTypes.objectOf(PropTypes.shape({
    // Estructura nueva (levelProgressAggregated): basada en lecciones
    completedLessons: PropTypes.number,
    totalLessons: PropTypes.number,
    percentage: PropTypes.number,
    totalModules: PropTypes.number,
    completedPages: PropTypes.number,
    totalPages: PropTypes.number,
    // Estructura legacy: basada en módulos
    total: PropTypes.number,
    completed: PropTypes.number,
  })),
  getModulesByLevel: PropTypes.func,
  calculateModuleProgress: PropTypes.func,
  isModuleAvailable: PropTypes.func,
  getModuleStatus: PropTypes.func,
  getTooltipMessage: PropTypes.func,
  onModuleClick: PropTypes.func,
  onSectionClick: PropTypes.func,
  favoriteModules: PropTypes.instanceOf(Set),
  onToggleFavorite: PropTypes.func,
  moduleGrid: PropTypes.element,
  renderMode: PropTypes.oneOf(['modules', 'lessons'])
};

export default LevelStepper;

