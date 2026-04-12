/**
 * NotionCurriculumEditor - Panel de edición in-place estilo Notion.
 * Aparece cuando isEditMode === true.
 *
 * Drag & Drop (@hello-pangea/dnd):
 *  - Un único DragDropContext maneja 3 tipos: LEVEL, MODULE, LESSON.
 *  - El reordenamiento actualiza estado local inmediatamente (optimistic UI).
 *  - TODO Fase 3: despachar llamada API para persistir el nuevo orden.
 *
 * Ghost UI:
 *  - GhostCard    → último ítem en lista de módulos y de lecciones
 *  - GhostAccordion → último ítem en lista de niveles
 *
 * DragHandle:
 *  - Grip de 6 puntos, solo visible con isEditMode activo.
 *  - Se aplica a niveles, módulos y lecciones.
 */
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails,
  Chip, Divider, Collapse, Alert,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Layers as LevelIcon,
  Folder as ModuleIcon,
  Article as LessonIcon,
  Construction as ConstructionIcon,
} from '@mui/icons-material';
import { useEditMode } from './EditModeContext';
import GhostCard from './GhostCard/GhostCard';
import GhostAccordion from './GhostAccordion/GhostAccordion';
import DragHandle from './DragHandle/DragHandle';

// ─── Utilidades ──────────────────────────────────────────────────────────────

/** Reordena un array moviendo el ítem de startIndex a endIndex */
function reorder(list, startIndex, endIndex) {
  const result = [...list];
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

// ─── Colores por nivel ────────────────────────────────────────────────────────
const LEVEL_COLORS = {
  0: { bg: 'rgba(76,175,80,0.12)',  border: 'rgba(76,175,80,0.35)',  text: '#81c784' },
  1: { bg: 'rgba(255,152,0,0.12)', border: 'rgba(255,152,0,0.35)', text: '#ffb74d' },
  2: { bg: 'rgba(244,67,54,0.12)', border: 'rgba(244,67,54,0.35)', text: '#e57373' },
};

// ─── LessonRow ────────────────────────────────────────────────────────────────

function LessonRow({ lesson, dragHandleProps, isDragging }) {
  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        py: 0.75, px: 1.5,
        borderRadius: 1,
        border: '1px solid',
        borderColor: isDragging ? 'rgba(11,186,244,0.4)' : 'rgba(255,255,255,0.06)',
        bgcolor: isDragging ? 'rgba(11,186,244,0.06)' : 'rgba(255,255,255,0.03)',
        transition: 'background 0.15s ease, border-color 0.15s ease',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
      }}
    >
      <DragHandle dragHandleProps={dragHandleProps} isDragging={isDragging} />
      <LessonIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
      <Typography
        variant="caption"
        sx={{ color: 'rgba(255,255,255,0.65)', flex: 1, fontWeight: 500 }}
        noWrap
      >
        {lesson.title || lesson.id}
      </Typography>
      <Chip
        label="Editar"
        size="small"
        sx={{
          height: 18, fontSize: '0.6rem', fontWeight: 600,
          bgcolor: 'rgba(16,174,222,0.12)', color: '#7dd3fc',
          border: '1px solid rgba(16,174,222,0.3)',
          cursor: 'pointer',
          '& .MuiChip-label': { px: 0.75 },
          '&:hover': { bgcolor: 'rgba(16,174,222,0.22)' },
        }}
      />
    </Box>
  );
}

LessonRow.propTypes = {
  lesson: PropTypes.object.isRequired,
  dragHandleProps: PropTypes.object,
  isDragging: PropTypes.bool,
};

// ─── ModuleSection ────────────────────────────────────────────────────────────

function ModuleSection({ mod, colorScheme, dragHandleProps, isDragging, lessons }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box
      sx={{
        mb: 0.75,
        borderRadius: 1.5,
        outline: isDragging ? '1.5px dashed rgba(11,186,244,0.5)' : 'none',
      }}
    >
      {/* Cabecera del módulo */}
      <Box
        onClick={() => setExpanded((v) => !v)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 1.5, py: 1, borderRadius: 1.5, cursor: 'pointer',
          bgcolor: isDragging ? 'rgba(11,186,244,0.06)' : 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          transition: 'background 0.15s ease',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
        }}
      >
        <DragHandle dragHandleProps={dragHandleProps} isDragging={isDragging} />
        <ModuleIcon sx={{ fontSize: 16, color: colorScheme.text, flexShrink: 0 }} />
        <Typography
          variant="body2"
          sx={{ color: '#e8eaf6', fontWeight: 600, flex: 1 }}
          noWrap
        >
          {mod.title || mod.id}
        </Typography>
        <Chip
          label={`${lessons.length} lec.`}
          size="small"
          sx={{
            height: 18, fontSize: '0.62rem',
            bgcolor: colorScheme.bg,
            color: colorScheme.text,
            border: `1px solid ${colorScheme.border}`,
            '& .MuiChip-label': { px: 0.75 },
          }}
        />
        <ExpandMoreIcon
          sx={{
            fontSize: 16, color: 'rgba(255,255,255,0.4)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
          }}
        />
      </Box>

      {/* Lista de lecciones con DnD */}
      <Collapse in={expanded}>
        <Box sx={{ pl: 2.5, pt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Droppable droppableId={`lessons-${mod.id}`} type="LESSON">
            {(dropProvided) => (
              <div ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
                {lessons.map((lesson, lessonIdx) => (
                  <Draggable
                    key={lesson.id}
                    draggableId={`lesson-${lesson.id}`}
                    index={lessonIdx}
                  >
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        style={{
                          ...dragProvided.draggableProps.style,
                          marginBottom: '4px',
                        }}
                      >
                        <LessonRow
                          lesson={lesson}
                          dragHandleProps={dragProvided.dragHandleProps}
                          isDragging={dragSnapshot.isDragging}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>
          {/* GhostCard como último ítem del mismo flex column */}
          <GhostCard label="Agregar lección" />
        </Box>
      </Collapse>
    </Box>
  );
}

ModuleSection.propTypes = {
  mod: PropTypes.object.isRequired,
  colorScheme: PropTypes.object.isRequired,
  dragHandleProps: PropTypes.object,
  isDragging: PropTypes.bool,
  lessons: PropTypes.array.isRequired,
};

// ─── NotionCurriculumEditor ───────────────────────────────────────────────────

export default function NotionCurriculumEditor({ levels = [], getModulesByLevel }) {
  const { isEditMode } = useEditMode();

  // ── Estado local para reordenamiento optimista ──
  const [localLevels, setLocalLevels] = useState(levels);

  const buildModulesMap = useCallback((lvls) =>
    Object.fromEntries(lvls.map(level => [
      level.id,
      getModulesByLevel ? getModulesByLevel(level.id) : (level.modules || []),
    ])), [getModulesByLevel]);

  const [localModulesMap, setLocalModulesMap] = useState(() => buildModulesMap(levels));

  const buildLessonsMap = useCallback((modsMap) => {
    const map = {};
    Object.values(modsMap).flat().forEach(mod => {
      map[mod.id] = mod.lessons || [];
    });
    return map;
  }, []);

  const [localLessonsMap, setLocalLessonsMap] = useState(() =>
    buildLessonsMap(buildModulesMap(levels)));

  // Sincronizar cuando cambian los props (carga inicial desde DB)
  useEffect(() => {
    setLocalLevels(levels);
    const modsMap = buildModulesMap(levels);
    setLocalModulesMap(modsMap);
    setLocalLessonsMap(buildLessonsMap(modsMap));
  }, [levels, buildModulesMap, buildLessonsMap]);

  // ── Handler único de DnD ──
  const handleDragEnd = useCallback(({ source, destination, type }) => {
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;

    if (type === 'LEVEL') {
      setLocalLevels(prev => reorder(prev, source.index, destination.index));
      // TODO Fase 3: dispatch API → PATCH /api/levels/reorder
    } else if (type === 'MODULE') {
      const levelId = source.droppableId.replace('modules-', '');
      setLocalModulesMap(prev => ({
        ...prev,
        [levelId]: reorder(prev[levelId] || [], source.index, destination.index),
      }));
      // TODO Fase 3: dispatch API → PATCH /api/modules/reorder
    } else if (type === 'LESSON') {
      const modId = source.droppableId.replace('lessons-', '');
      setLocalLessonsMap(prev => ({
        ...prev,
        [modId]: reorder(prev[modId] || [], source.index, destination.index),
      }));
      // TODO Fase 3: dispatch API → PATCH /api/lessons/reorder
    }
  }, []);

  if (!isEditMode) return null;

  return (
    <Box sx={{ mt: 3 }}>
      {/* Cabecera del editor */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          mb: 2, px: 2, py: 1.25,
          borderRadius: 2,
          bgcolor: 'rgba(16, 174, 222, 0.08)',
          border: '1px solid rgba(16, 174, 222, 0.25)',
        }}
      >
        <ConstructionIcon sx={{ fontSize: 18, color: '#10aede' }} />
        <Typography variant="body2" fontWeight={700} sx={{ color: '#7dd3fc' }}>
          Editor de Contenido — Modo Edición Activo
        </Typography>
        <Alert
          severity="info"
          icon={false}
          sx={{
            ml: 'auto', py: 0, px: 1.5,
            bgcolor: 'transparent', color: 'rgba(255,255,255,0.45)',
            fontSize: '0.7rem',
            '& .MuiAlert-message': { p: 0 },
          }}
        >
          Maquetación frontend — conexión al backend en próxima fase
        </Alert>
      </Box>

      {/* Árbol curricular con DnD */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>

          {/* Droppable de niveles */}
          <Droppable droppableId="curriculum-levels" type="LEVEL">
            {(dropProvided) => (
              <div
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                {localLevels.map((level, idx) => {
                  const colors = LEVEL_COLORS[idx % 3];
                  const modules = localModulesMap[level.id] || [];

                  return (
                    <Draggable
                      key={level.id}
                      draggableId={`level-${level.id}`}
                      index={idx}
                    >
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          style={dragProvided.draggableProps.style}
                        >
                          <Accordion
                            disableGutters
                            defaultExpanded={idx === 0}
                            sx={{
                              bgcolor: dragSnapshot.isDragging
                                ? 'rgba(11,186,244,0.05)'
                                : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${dragSnapshot.isDragging
                                ? 'rgba(11,186,244,0.5)'
                                : colors.border}`,
                              borderRadius: '10px !important',
                              '&:before': { display: 'none' },
                              boxShadow: dragSnapshot.isDragging
                                ? '0 8px 24px rgba(0,0,0,0.4)'
                                : 'none',
                              transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                            }}
                          >
                            <AccordionSummary
                              expandIcon={<ExpandMoreIcon sx={{ color: colors.text }} />}
                              sx={{ px: 2, minHeight: 48 }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                                {/* DragHandle para el nivel — stopPropagation evita toggle */}
                                <span onClick={(e) => e.stopPropagation()}>
                                  <DragHandle
                                    dragHandleProps={dragProvided.dragHandleProps}
                                    isDragging={dragSnapshot.isDragging}
                                  />
                                </span>
                                <LevelIcon sx={{ fontSize: 18, color: colors.text }} />
                                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#fff' }}>
                                  {level.title || level.name || level.id}
                                </Typography>
                                <Chip
                                  label={`${modules.length} módulos`}
                                  size="small"
                                  sx={{
                                    height: 20, fontSize: '0.65rem',
                                    bgcolor: colors.bg,
                                    color: colors.text,
                                    border: `1px solid ${colors.border}`,
                                    '& .MuiChip-label': { px: 1 },
                                  }}
                                />
                              </Box>
                            </AccordionSummary>

                            <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
                              <Divider sx={{ bgcolor: 'rgba(255,255,255,0.07)', mb: 1.5 }} />

                              {/* Lista de módulos con DnD */}
                              <Droppable droppableId={`modules-${level.id}`} type="MODULE">
                                {(modDropProvided) => (
                                  <div
                                    ref={modDropProvided.innerRef}
                                    {...modDropProvided.droppableProps}
                                    style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
                                  >
                                    {modules.map((mod, modIdx) => (
                                      <Draggable
                                        key={mod.id}
                                        draggableId={`module-${mod.id}`}
                                        index={modIdx}
                                      >
                                        {(modDragProvided, modDragSnapshot) => (
                                          <div
                                            ref={modDragProvided.innerRef}
                                            {...modDragProvided.draggableProps}
                                            style={modDragProvided.draggableProps.style}
                                          >
                                            <ModuleSection
                                              mod={mod}
                                              colorScheme={colors}
                                              dragHandleProps={modDragProvided.dragHandleProps}
                                              isDragging={modDragSnapshot.isDragging}
                                              lessons={localLessonsMap[mod.id] || mod.lessons || []}
                                            />
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {modDropProvided.placeholder}
                                  </div>
                                )}
                              </Droppable>

                              {/* GhostCard módulo: último ítem del mismo contenedor */}
                              <Box sx={{ mt: 0.5 }}>
                                <GhostCard label="Agregar módulo" />
                              </Box>
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

          {/* GhostAccordion nivel: último ítem del mismo flex column que los Accordion */}
          <GhostAccordion label="Agregar nivel" depth={0} />
        </Box>
      </DragDropContext>
    </Box>
  );
}

NotionCurriculumEditor.propTypes = {
  levels: PropTypes.array,
  getModulesByLevel: PropTypes.func,
};

ModuleSection.propTypes = {
  mod: PropTypes.object.isRequired,
  colorScheme: PropTypes.object.isRequired,
  dragHandleProps: PropTypes.object,
  isDragging: PropTypes.bool,
  lessons: PropTypes.array.isRequired,
};

LessonRow.propTypes = {
  lesson: PropTypes.object.isRequired,
  dragHandleProps: PropTypes.object,
  isDragging: PropTypes.bool,
};
