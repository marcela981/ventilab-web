import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  ExpandMore,
  LocalHospital as PathologyIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import ModuleGrid from '@/features/ensenanza/shared/components/modulos/ModuleGrid';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useEditMode } from '@/features/ensenanza/shared/components/edit/EditModeContext';
import DragHandle from '@/features/ensenanza/shared/components/edit/DragHandle/DragHandle';
import GhostAccordion from '@/features/ensenanza/shared/components/edit/GhostAccordion/GhostAccordion';
import { formatTime } from '@/features/ensenanza/shared/components/edit/EstimatedTime/EstimatedTime';

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
  const { t } = useTranslation('teaching');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Normalizar: el default param solo aplica a `undefined`, no a `null` explícito
  const safeLevelProgress = levelProgress ?? {};

  // Usar onSectionClick si está disponible, sino onModuleClick
  const handleModuleClick = onSectionClick || onModuleClick;

  /**
   * Determina el nivel actual (el que el usuario está trabajando)
   * El nivel actual es el primer nivel que tiene progreso > 0 y < 100,
   * o el primer nivel sin iniciar si todos los anteriores están completos
   */
  const currentLevelId = useMemo(() => {
    for (const level of levels) {
      const levelProg = safeLevelProgress[level.id] || { percentage: 0 };
      if (levelProg.percentage > 0 && levelProg.percentage < 100) {
        return level.id;
      }
    }
    // Si todos los niveles están completos o no iniciados, devolver el primero sin iniciar
    for (const level of levels) {
      const levelProg = safeLevelProgress[level.id] || { percentage: 0 };
      if (levelProg.percentage === 0) {
        return level.id;
      }
    }
    // Si todo está completo, devolver el último nivel
    return levels[levels.length - 1]?.id;
  }, [levels, levelProgress]);

  // Estado para controlar qué niveles están expandidos
  const [expandedLevels, setExpandedLevels] = useState(new Set());

  // Estado para el sub-acordeón de patologías dentro del nivel avanzado
  const [expandedPathologies, setExpandedPathologies] = useState(new Set());

  // ── Modo Edición: DnD de niveles ──────────────────────────────────────────
  const { isEditMode } = useEditMode();
  const [localLevels, setLocalLevels] = useState(levels);
  useEffect(() => { setLocalLevels(levels); }, [levels]);
  const handleDragEnd = useCallback(({ source, destination, type }) => {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    if (type === 'LEVEL') {
      setLocalLevels(prev => {
        const result = [...prev];
        const [removed] = result.splice(source.index, 1);
        result.splice(destination.index, 0, removed);
        return result;
      });
      // TODO Fase 3: dispatch API → PATCH /api/levels/reorder
    }
  }, []);

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

  const handlePathologyAccordionChange = (levelId) => (_, isExpanded) => {
    setExpandedPathologies((prev) => {
      const next = new Set(prev);
      isExpanded ? next.add(levelId) : next.delete(levelId);
      return next;
    });
  };

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
    if (percentage === 100) return { label: t('status.completed'), color: 'success' };
    if (percentage > 0) return { label: t('status.inProgress'), color: 'primary' };
    return { label: t('status.notStarted'), color: 'default' };
  };

  // Renderizar módulos usando ModuleGrid con datos del backend.
  // dbProgressFn: función de progreso por módulo respaldada por API (se genera por nivel en el map).
  const renderModuleGrid = (levelModules, level, dbProgressFn) => {
    if (moduleGrid) {
      return moduleGrid;
    }

    // Modo 'lessons' (legacy) — mantener por si se necesita en otros contextos
    if (renderMode === 'lessons') {
      return (
        <Box sx={{ mt: 1 }}>
          <ModuleGrid
            modules={[]}
            mode="lessons"
            levelId={level.id}
            levelColor={getLevelColor(level)}
            enableAnimations={true}
            emptyMessage={t('curriculum.empty.noLessonsInLevel')}
            favoriteModules={favoriteModules || new Set()}
            onToggleFavorite={onToggleFavorite || (() => {})}
            isModuleAvailable={isModuleAvailable || (() => true)}
            calculateModuleProgress={dbProgressFn}
            onModuleClick={handleModuleClick}
          />
        </Box>
      );
    }

    // Modo 'modules': mostrar TODOS los módulos del nivel (totalCards = level.modules.length).
    // No se filtran módulos bloqueados aquí porque el contador del header debe coincidir
    // con el totalModules devuelto por el backend.
    if (!levelModules || levelModules.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" sx={{ color: '#e8f4fd' }}>
            {t('curriculum.empty.noModulesInLevel')}
          </Typography>
        </Box>
      );
    }

    // Props comunes para ModuleGrid (evita repetición)
    const sharedGridProps = {
      calculateModuleProgress: dbProgressFn,
      isModuleAvailable,
      onModuleClick: handleModuleClick,
      onToggleFavorite,
      favoriteModules,
      getStatusIcon: () => null,
      getButtonText: (module, progress, available) => {
        if (!available) return t('actions.locked');
        if (progress === 100) return t('status.completed');
        if (progress > 0) return t('actions.continue');
        return t('actions.start');
      },
      getButtonIcon: () => null,
      levelColor: getLevelColor(level),
      enableAnimations: true,
      mode: 'modules',
      emptyMessage: t('curriculum.empty.noModulesInLevel'),
    };

    // Separar módulos de patologías del resto (category === 'pathologies')
    const coreModules = levelModules.filter(m => m.category !== 'pathologies');
    const pathologyModules = levelModules.filter(m => m.category === 'pathologies');

    if (pathologyModules.length === 0) {
      // Sin patologías: renderizado plano estándar
      return (
        <Box sx={{ mt: 1 }}>
          <ModuleGrid modules={levelModules} {...sharedGridProps} />
        </Box>
      );
    }

    // Con patologías: módulos core primero, luego sub-acordeón de patologías
    return (
      <Box sx={{ mt: 1 }}>
        {coreModules.length > 0 && (
          <ModuleGrid modules={coreModules} {...sharedGridProps} />
        )}

        <Accordion
          expanded={expandedPathologies.has(level.id)}
          onChange={handlePathologyAccordionChange(level.id)}
          sx={{
            mt: 2,
            backgroundColor: 'rgba(229, 57, 53, 0.06)',
            border: '1px solid rgba(229, 57, 53, 0.25)',
            borderRadius: 2,
            boxShadow: 'none',
            '&:before': { display: 'none' },
            '&.Mui-expanded': { margin: 0, mt: 2 },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMore sx={{ color: '#ef9a9a' }} />}
            sx={{
              px: 2.5,
              py: 1,
              '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5, margin: '10px 0' },
              '&.Mui-expanded': { borderBottom: '1px solid rgba(229, 57, 53, 0.2)' },
            }}
          >
            <PathologyIcon sx={{ color: '#ef9a9a', fontSize: 20 }} />
            <Typography
              variant="subtitle2"
              sx={{ color: '#ef9a9a', fontWeight: 600, letterSpacing: '0.3px' }}
            >
              Enseñanza especial avanzada — Patologías
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(239,154,154,0.7)', ml: 0.5 }}>
              ({pathologyModules.length})
            </Typography>
          </AccordionSummary>

          <AccordionDetails sx={{ px: 2, pb: 2, pt: 1.5 }}>
            <ModuleGrid modules={pathologyModules} {...sharedGridProps} />
          </AccordionDetails>
        </Accordion>
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
        {t('curriculum.heading')}
      </Typography>

      {/* Container de niveles */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Droppable droppableId="curriculum-levels" type="LEVEL">
            {(dropProvided) => (
              <div
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
              >
                {localLevels.map((level, levelIndex) => {
          const levelModules = getModulesByLevel ? getModulesByLevel(level.id) : [];

          // Función de progreso respaldada por datos del backend (LevelCurriculumModule.progressPercentage).
          // Usa directamente el campo que devuelve GET /api/levels/curriculum para cada módulo del nivel.
          // Fallback al prop calculateModuleProgress si el módulo no viene en levelModules.
          const dbProgressFn = (moduleId) => {
            const dbMod = levelModules.find(m => m.id === moduleId);
            if (dbMod !== undefined) return dbMod.progressPercentage ?? 0;
            return calculateModuleProgress ? calculateModuleProgress(moduleId) : 0;
          };

          // totalCards = totalModules del backend (fuente única de verdad).
          // No usamos levelModules.length como fallback secundario para evitar desfase con lo que devuelve la API.
          // Sumar duración total de los módulos del nivel para el lift-up de tiempo
          const totalLevelMinutes = levelModules.reduce((acc, m) => acc + (m.duration || 0), 0);
          const totalLevelTime = formatTime(totalLevelMinutes);

          const levelProgRaw = safeLevelProgress[level.id] || {};
          const totalCardsFromBackend = levelProgRaw.totalModules ?? levelProgRaw.total ?? levelModules.length;

          // Detectar si es la estructura nueva (tiene completedLessons y totalLessons) o legacy
          const isNewStructure = 'completedLessons' in levelProgRaw || 'totalLessons' in levelProgRaw;
          const levelProg = isNewStructure ? {
            completedLessons: levelProgRaw.completedLessons || 0,
            totalLessons: levelProgRaw.totalLessons || 0,
            percentage: levelProgRaw.percentage || 0,
            totalModules: totalCardsFromBackend,
          } : {
            completed: levelProgRaw.completed || 0,
            total: totalCardsFromBackend,
            percentage: levelProgRaw.percentage || 0,
            totalModules: totalCardsFromBackend,
          };
          const status = getLevelStatus(levelProg.percentage);
          const isCurrentLevel = level.id === currentLevelId;
          // isUnlocked: true by default (no lock = always accessible, e.g. beginner & prerequisitos)
          const isUnlocked = levelProgRaw.isUnlocked !== false;
          const isExpanded = expandedLevels.has(level.id) && isUnlocked;

          return (
            <Draggable
              key={level.id}
              draggableId={`level-${level.id}`}
              index={levelIndex}
              isDragDisabled={!isEditMode}
            >
              {(dragProvided, dragSnapshot) => (
                <div
                  ref={dragProvided.innerRef}
                  {...dragProvided.draggableProps}
                  style={dragProvided.draggableProps.style}
                >
                  <Accordion
                    expanded={isExpanded}
                    onChange={isUnlocked ? handleAccordionChange(level.id) : undefined}
                    sx={{
                      backgroundColor: isUnlocked ? 'transparent' : 'rgba(0,0,0,0.25)',
                      border: isUnlocked
                        ? dragSnapshot.isDragging
                          ? '1px solid rgba(11,186,244,0.6)'
                          : '1px solid rgba(255, 255, 255, 0.1)'
                        : '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: 2,
                      mb: 2,
                      boxShadow: dragSnapshot.isDragging ? '0 8px 32px rgba(0,0,0,0.5)' : 'none',
                      opacity: isUnlocked ? 1 : 0.55,
                      cursor: isUnlocked ? 'default' : 'not-allowed',
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
                expandIcon={
                  isUnlocked
                    ? <ExpandMore sx={{ color: '#ffffff' }} />
                    : <LockIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} />
                }
                sx={{
                  px: 3,
                  py: 2,
                  cursor: isUnlocked ? 'pointer' : 'not-allowed !important',
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
                {/* DragHandle: stopPropagation evita toggle del acordeón al agarrar */}
                <span onClick={(e) => e.stopPropagation()}>
                  <DragHandle
                    dragHandleProps={dragProvided.dragHandleProps}
                    isDragging={dragSnapshot.isDragging}
                  />
                </span>
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
                            color: isUnlocked ? getLevelColor(level) : 'rgba(255,255,255,0.4)',
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
                            color: isUnlocked ? '#e8f4fd' : 'rgba(255,255,255,0.3)',
                            lineHeight: 1.6,
                            maxWidth: '600px'
                          }}
                        >
                          {level.description}
                        </Typography>

                        {!isUnlocked && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'rgba(255,180,0,0.75)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              mt: 0.5,
                              fontStyle: 'italic'
                            }}
                          >
                            <LockIcon sx={{ fontSize: 12 }} />
                            {t('status.levelLocked', 'Completa el nivel anterior para desbloquear')}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Chip de estado minimalista */}
                    {isUnlocked ? (
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
                    ) : (
                      <Chip
                        icon={<LockIcon sx={{ fontSize: '14px !important' }} />}
                        label={t('status.locked', 'Bloqueado')}
                        size="small"
                        sx={{
                          fontWeight: 500,
                          fontSize: '0.75rem',
                          height: '24px',
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          color: 'rgba(255,255,255,0.5)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          '& .MuiChip-icon': { color: 'rgba(255,255,255,0.4)' }
                        }}
                      />
                    )}
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
                            gap: 0.5,
                            flexWrap: 'wrap',
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
                          {/* Contador de tarjetas completadas / total — fuente: backend totalModules */}
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#e8f4fd',
                              fontSize: '0.7rem'
                            }}
                          >
                            {isNewStructure
                              ? `(${levelProg.completedLessons}/${levelProg.totalLessons} lecciones)`
                              : `(${levelProg.completed}/${levelProg.totalModules} tarjetas)`
                            }
                          </Typography>
                          {/* Lift-up de tiempo total del nivel */}
                          {totalLevelTime && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'rgba(255, 255, 255, 0.4)',
                                fontSize: '0.68rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              ·
                              <span aria-hidden="true">⏱</span>
                              {totalLevelTime}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </AccordionSummary>

                  <AccordionDetails sx={{ px: 3, pb: 3 }}>
                    {renderModuleGrid(levelModules, level, dbProgressFn)}
                  </AccordionDetails>
                </Accordion>
                </div>
              )}
            </Draggable>
          );
        })}
        {dropProvided.placeholder}
              </div>
            )}
          </Droppable>
          {isEditMode && <GhostAccordion label="Agregar nivel" depth={0} />}
        </Box>
      </DragDropContext>
    </Box>
  );
};

// PropTypes
export default LevelStepper;

