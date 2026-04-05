/**
 * NotionCurriculumEditor - Panel de edición in-place estilo Notion.
 * Aparece sobre/debajo del CurriculumPanel cuando isEditMode === true.
 * Muestra la jerarquía real (Nivel → Módulo → Lección) con BlockPills para agregar.
 *
 * MAQUETACIÓN FRONTEND: los botones (+) son visuales. El backend se conectará en Fase 3.
 */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
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
import BlockPill from './BlockPill';

// Colores por nivel (coincide con el tema del LMS)
const LEVEL_COLORS = {
  0: { bg: 'rgba(76,175,80,0.12)',  border: 'rgba(76,175,80,0.35)',  text: '#81c784' },
  1: { bg: 'rgba(255,152,0,0.12)', border: 'rgba(255,152,0,0.35)', text: '#ffb74d' },
  2: { bg: 'rgba(244,67,54,0.12)', border: 'rgba(244,67,54,0.35)', text: '#e57373' },
};

function LessonRow({ lesson }) {
  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        py: 0.75, px: 1.5,
        borderRadius: 1,
        border: '1px solid rgba(255,255,255,0.06)',
        bgcolor: 'rgba(255,255,255,0.03)',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
      }}
    >
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

function ModuleSection({ mod, colorScheme }) {
  const [expanded, setExpanded] = useState(false);
  const lessons = mod.lessons || [];

  return (
    <Box sx={{ mb: 0.75 }}>
      <Box
        onClick={() => setExpanded((v) => !v)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 1.5, py: 1, borderRadius: 1.5, cursor: 'pointer',
          bgcolor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          transition: 'background 0.15s ease',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
        }}
      >
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

      <Collapse in={expanded}>
        <Box sx={{ pl: 2.5, pt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {lessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} />
          ))}
          <Box sx={{ pt: 0.5 }}>
            <BlockPill label="Agregar lección" size="small" indent={0} />
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

export default function NotionCurriculumEditor({ levels = [], getModulesByLevel }) {
  const { isEditMode } = useEditMode();

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

      {/* Árbol de contenidos editables */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {levels.map((level, idx) => {
          const colors = LEVEL_COLORS[idx % 3];
          const modules = getModulesByLevel
            ? getModulesByLevel(level.id)
            : (level.modules || []);

          return (
            <Accordion
              key={level.id}
              disableGutters
              defaultExpanded={idx === 0}
              sx={{
                bgcolor: 'rgba(255,255,255,0.03)',
                border: `1px solid ${colors.border}`,
                borderRadius: '10px !important',
                '&:before': { display: 'none' },
                boxShadow: 'none',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: colors.text }} />}
                sx={{ px: 2, minHeight: 48 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {modules.map((mod) => (
                    <ModuleSection key={mod.id} mod={mod} colorScheme={colors} />
                  ))}
                </Box>

                <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                  <BlockPill label="Agregar módulo" />
                </Box>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      {/* Acción de nivel */}
      <Box sx={{ mt: 2 }}>
        <BlockPill label="Agregar nivel" />
      </Box>
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
};

LessonRow.propTypes = {
  lesson: PropTypes.object.isRequired,
};
