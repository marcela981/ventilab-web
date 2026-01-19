/**
 * =============================================================================
 * ModuleLessonsList Component for VentyLab
 * =============================================================================
 * 
 * Componente que muestra la lista de lecciones dentro de una card de módulo.
 * Muestra cada lección con su título, progreso individual y estado.
 * 
 * @component
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Collapse,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  Lock,
  PlayArrow,
  AccessTime,
  ExpandMore,
  ExpandLess,
  Topic
} from '@mui/icons-material';
import { loadLessonById } from '@/data/helpers/lessonLoader';
import { useContext } from 'react';
import LearningProgressContext from '@/contexts/LearningProgressContext';

/**
 * Componente individual para cada lección en la lista
 */
const LessonItem = ({ 
  lesson, 
  lessonProgress: lessonProgressProp, 
  isCompleted, 
  isLocked, 
  isAvailable,
  onLessonClick,
  moduleId
}) => {
  const { progressMap, progressVersion } = useContext(LearningProgressContext);
  
  // Obtener progreso real del contexto
  const entry = progressMap[lesson.id];
  const calculatedProgress = entry 
    ? Math.round((entry.isCompleted ? 1 : entry.progress || 0) * 100) 
    : 0;
  
  // Usar progreso del contexto si está disponible, sino usar el prop
  const lessonProgress = entry ? calculatedProgress : (lessonProgressProp || 0);
  const actualIsCompleted = entry ? entry.isCompleted : isCompleted;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expanded, setExpanded] = useState(false);
  const [lessonSections, setLessonSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation(); // Evitar que se active el click de la card padre
    if (isAvailable && !isLocked && onLessonClick) {
      onLessonClick(lesson.id);
    }
  };

  const handleExpandClick = async (e) => {
    e.stopPropagation();
    if (!expanded && lessonSections.length === 0 && !loadingSections) {
      // Cargar secciones de la lección
      setLoadingSections(true);
      try {
        const lessonData = await loadLessonById(lesson.id, moduleId);
        if (lessonData?.sections) {
          setLessonSections(lessonData.sections);
        } else if (lessonData?.content?.sections) {
          // Si viene en formato normalizado
          const sections = [];
          if (lessonData.content.introduction) sections.push({ title: 'Introducción', type: 'introduction' });
          if (lessonData.content.theory?.sections) {
            sections.push(...lessonData.content.theory.sections.map(s => ({ title: s.title, type: 'theory' })));
          }
          if (lessonData.content.practicalCases?.length > 0) {
            sections.push(...lessonData.content.practicalCases.map(c => ({ title: c.title, type: 'case' })));
          }
          setLessonSections(sections);
        }
      } catch (error) {
        console.error('Error loading lesson sections:', error);
      } finally {
        setLoadingSections(false);
      }
    }
    setExpanded(!expanded);
  };

  return (
    <>
      <ListItem
        onClick={handleClick}
        sx={{
          px: 1.5,
          py: 1,
          mb: 0.5,
          borderRadius: 1,
          cursor: isAvailable && !isLocked ? 'pointer' : 'default',
          backgroundColor: actualIsCompleted 
            ? 'rgba(76, 175, 80, 0.1)' 
            : isLocked 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(255, 255, 255, 0.08)',
          border: '1px solid',
          borderColor: actualIsCompleted
            ? 'rgba(76, 175, 80, 0.3)'
            : isLocked
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(255, 255, 255, 0.15)',
          transition: 'all 0.2s ease-in-out',
          opacity: isLocked ? 0.6 : 1,
          '&:hover': isAvailable && !isLocked ? {
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            transform: 'translateX(4px)',
          } : {},
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          {/* Icono de estado */}
          <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
            {isLocked ? (
              <Lock sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.5)' }} />
            ) : actualIsCompleted ? (
              <CheckCircle sx={{ fontSize: 18, color: '#4CAF50' }} />
            ) : (
              <RadioButtonUnchecked sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
            )}
          </Box>

          {/* Contenido de la lección */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: actualIsCompleted ? 600 : 500,
                  fontSize: '0.8rem',
                  color: isLocked ? 'rgba(255, 255, 255, 0.6)' : '#ffffff',
                  textDecoration: actualIsCompleted ? 'line-through' : 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}
              >
                {lesson.title}
              </Typography>

              {/* Duración - usa estimatedTime o duration como fallback */}
              {(lesson.estimatedTime || lesson.duration) && (
                <Chip
                  icon={<AccessTime sx={{ fontSize: 12 }} />}
                  label={`${lesson.estimatedTime || lesson.duration}min`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    ml: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    '& .MuiChip-icon': {
                      color: '#ffffff',
                      fontSize: 12,
                    }
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Botón para expandir/colapsar temas */}
          {!isLocked && (
            <IconButton
              size="small"
              onClick={handleExpandClick}
              sx={{
                color: '#ffffff',
                opacity: 0.7,
                '&:hover': {
                  opacity: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </Box>
      </ListItem>

    {/* Sección expandible con temas */}
    <Collapse in={expanded} timeout="auto" unmountOnExit>
      <Box sx={{ pl: 4, pr: 1.5, pb: 1, pt: 0.5 }}>
        {loadingSections ? (
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.7rem' }}>
            Cargando temas...
          </Typography>
        ) : lessonSections.length > 0 ? (
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.7rem',
                fontWeight: 600,
                display: 'block',
                mb: 0.75,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Temas ({lessonSections.length})
            </Typography>
            <List dense sx={{ py: 0 }}>
              {lessonSections.map((section, index) => (
                <ListItem
                  key={index}
                  sx={{
                    py: 0.25,
                    px: 1,
                    mb: 0.25,
                    borderRadius: 0.5,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <Topic sx={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', mr: 1 }} />
                  <ListItemText
                    primary={
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.7rem',
                          color: 'rgba(255, 255, 255, 0.85)',
                          lineHeight: 1.4,
                        }}
                      >
                        {section.title || `Tema ${index + 1}`}
                      </Typography>
                    }
                  />
                  <Chip
                    label={section.type === 'introduction' ? 'Intro' : section.type === 'theory' ? 'Teoría' : section.type === 'case' ? 'Caso' : section.type || 'Tema'}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: '0.6rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      border: 'none',
                      ml: 0.5,
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem', fontStyle: 'italic' }}>
            No hay temas disponibles
          </Typography>
        )}
      </Box>
    </Collapse>
    </>
  );
};

LessonItem.propTypes = {
  lesson: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    estimatedTime: PropTypes.number,
  }).isRequired,
  lessonProgress: PropTypes.number,
  isCompleted: PropTypes.bool,
  isLocked: PropTypes.bool,
  isAvailable: PropTypes.bool,
  onLessonClick: PropTypes.func,
  moduleId: PropTypes.string.isRequired,
};

/**
 * Componente principal que muestra la lista de lecciones
 */
const ModuleLessonsList = ({
  lessons = [],
  moduleId,
  completedLessons = new Set(),
  onLessonClick,
  isModuleAvailable = true,
  maxLessonsToShow = 3,
  showTitle = true, // Nueva prop para controlar si se muestra el título
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!lessons || lessons.length === 0) {
    return (
      <Box sx={{ 
        py: 2, 
        textAlign: 'center',
        opacity: 0.7,
      }}>
        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          No hay lecciones disponibles
        </Typography>
      </Box>
    );
  }

  // Limitar el número de lecciones a mostrar si maxLessonsToShow es menor que el total
  const lessonsToShow = maxLessonsToShow >= 999 ? lessons : lessons.slice(0, maxLessonsToShow);
  const hasMoreLessons = maxLessonsToShow < 999 && lessons.length > maxLessonsToShow;

  return (
    <Box sx={showTitle ? { mt: 2 } : {}}>
      {/* Título de la sección - solo si showTitle es true */}
      {showTitle && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              fontSize: '0.75rem',
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Lecciones ({lessons.length})
          </Typography>
        </Box>
      )}

      {/* Lista de lecciones */}
      <Box sx={{ 
        maxHeight: maxLessonsToShow >= 999 
          ? (isMobile ? '300px' : '400px') 
          : (isMobile ? '200px' : '250px'), 
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(255, 255, 255, 0.3)',
          borderRadius: 2,
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.5)',
          },
        },
      }}>
        {lessonsToShow.map((lesson, index) => {
          // Verificar si la lección está completada - puede estar como lessonId o moduleId-lessonId
          const lessonKey1 = lesson.id;
          const lessonKey2 = `${moduleId}-${lesson.id}`;
          const isCompleted = completedLessons.has(lessonKey1) || completedLessons.has(lessonKey2);
          const isLocked = !isModuleAvailable; // Por ahora, todas las lecciones comparten el estado del módulo
          
          return (
            <Box key={lesson.id}>
              <List sx={{ p: 0 }}>
                <LessonItem
                  lesson={lesson}
                  lessonProgress={isCompleted ? 100 : 0} // Fallback si no hay progreso en contexto
                  isCompleted={isCompleted}
                  isLocked={isLocked}
                  isAvailable={isModuleAvailable}
                  onLessonClick={onLessonClick}
                  moduleId={moduleId}
                />
              </List>
              {index < lessonsToShow.length - 1 && (
                <Divider sx={{ 
                  my: 0.5, 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  mx: 1.5,
                }} />
              )}
            </Box>
          );
        })}

        {/* Indicador de más lecciones */}
        {hasMoreLessons && (
          <Box sx={{ 
            pt: 1, 
            px: 1.5, 
            textAlign: 'center',
          }}>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                color: 'rgba(255, 255, 255, 0.7)',
                fontStyle: 'italic',
              }}
            >
              +{lessons.length - maxLessonsToShow} lección{lessons.length - maxLessonsToShow > 1 ? 'es' : ''} más
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

ModuleLessonsList.propTypes = {
  lessons: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      estimatedTime: PropTypes.number,
      description: PropTypes.string,
    })
  ),
  moduleId: PropTypes.string.isRequired,
  completedLessons: PropTypes.instanceOf(Set),
  onLessonClick: PropTypes.func,
  isModuleAvailable: PropTypes.bool,
  maxLessonsToShow: PropTypes.number,
  showTitle: PropTypes.bool, // Controla si se muestra el título "Lecciones"
};

ModuleLessonsList.defaultProps = {
  lessons: [],
  completedLessons: new Set(),
  isModuleAvailable: true,
  maxLessonsToShow: 3,
  showTitle: true,
};

export default ModuleLessonsList;

