import React, { useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTheme, useMediaQuery, Box } from '@mui/material';
import { useRouter } from 'next/router';
import { useLearningProgress } from '../../../../contexts/LearningProgressContext';
import LessonCardHeader from './LessonCardHeader';
import LessonCardMeta from './LessonCardMeta';
import LessonCardBody from './LessonCardBody';
import LessonCardFooter from './LessonCardFooter';
import styles from '@/styles/curriculum.module.css';
import CurriculumProgressBar from './CurriculumProgressBar';

/**
 * LessonCard - Card minimalista y optimizada para lecciones de aprendizaje
 *
 * Componente de card individual que muestra información de una lección con un diseño
 * flat moderno, similar a ModuleCard pero adaptado para lecciones.
 *
 * @component
 * @param {Object} lesson - Datos completos de la lección
 * @param {string} lesson.moduleId - ID del módulo al que pertenece la lección
 * @param {string} lesson.lessonId - ID único de la lección
 * @param {string} lesson.title - Título de la lección
 * @param {string} lesson.description - Descripción de la lección
 * @param {number} lesson.estimatedTime - Tiempo estimado en minutos
 * @param {string} lesson.difficulty - Nivel de dificultad
 * @param {number} lesson.order - Orden de la lección
 * @param {number} lesson.pages - Número de páginas (sections.length)
 * @param {boolean} isAvailable - Si la lección está disponible para el usuario
 * @param {string} levelColor - Color hex del nivel (para personalización)
 * @returns {JSX.Element} Card de lección optimizada
 */
const LessonCard = ({
  lesson,
  isAvailable = true,
  allowEmpty = false,
  levelColor,
  onLessonClick
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  
  // Obtener progreso de la lección del contexto
  const { completedLessons, progressByModule } = useLearningProgress();
  
  // Calcular progreso de la lección
  // completedLessons es un Set, no un array, así que usamos .has() en lugar de .includes()
  // Verificar ambos formatos por compatibilidad: solo lessonId y moduleId-lessonId
  const isCompleted = useMemo(() => {
    if (!completedLessons || typeof completedLessons.has !== 'function') {
      return false;
    }
    const lessonKey1 = lesson.lessonId;
    const lessonKey2 = `${lesson.moduleId}-${lesson.lessonId}`;
    return completedLessons.has(lessonKey1) || completedLessons.has(lessonKey2);
  }, [completedLessons, lesson.moduleId, lesson.lessonId]);
  
  // Estado para tabs internos de la card
  const [activeTab, setActiveTab] = useState(0);
  
  // Estado para manejar hover de la card
  const [isHovered, setIsHovered] = useState(false);
  
  // Determinar estado de la lección
  const status = useMemo(() => {
    if (isCompleted) return 'completed';
    // Verificar si hay progreso en el módulo para esta lección
    const moduleProgress = progressByModule[lesson.moduleId];
    if (moduleProgress?.lessonsProgress?.[lesson.lessonId]) {
      return 'in-progress';
    }
    return isAvailable ? 'available' : 'locked';
  }, [isCompleted, isAvailable, lesson.moduleId, lesson.lessonId, progressByModule]);
  
  // Determinar color de borde según disponibilidad
  const borderColor = isAvailable ? '#0BBAF4' : '#e0e0e0';
  
  // Handler para navegar a la lección
  const handleLessonClick = useCallback((e) => {
    if (!isAvailable || allowEmpty) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Si el click viene del cardBody, footer, o botones/interactivos, no activar el onClick de la card
    const target = e.target;
    const isClickableElement = target.closest('button') || 
                               target.closest('a') || 
                               target.closest('[role="tab"]') ||
                               target.closest(`.${styles.cardBody}`) ||
                               target.closest(`.${styles.cardFooter}`) ||
                               target.closest('[data-block-overlay]');
    
    if (isClickableElement) {
      return;
    }
    
    if (isAvailable && !allowEmpty) {
      // Si hay onLessonClick (callback desde TeachingModule), usarlo
      // Esto permite verificar prerequisitos y manejar navegación centralmente
      if (onLessonClick) {
        onLessonClick(lesson.moduleId, lesson.lessonId);
      } else {
        // Fallback: usar router.push directamente (comportamiento legacy)
        router.push(`/teaching/${lesson.moduleId}/${lesson.lessonId}`);
      }
    }
  }, [isAvailable, allowEmpty, lesson.moduleId, lesson.lessonId, router, onLessonClick]);
  
  // Handler para el cardBody para prevenir propagación de eventos
  const handleCardBodyInteraction = (e) => {
    e.stopPropagation();
  };
  
  // Calcular porcentaje de progreso (0-100)
  const progressPercent = isCompleted ? 100 : 0;
  
  return (
    <article
      className={`${styles.card} ${status === 'locked' ? styles.locked : ''} ${status === 'completed' ? styles.completed : ''} ${status === 'in-progress' ? styles.inProgress : ''} ${status === 'available' ? styles.available : ''}`}
      role="article"
      aria-label={`Lección: ${lesson.title}. ${lesson.description ? lesson.description.substring(0, 100) : ''}`}
      onClick={handleLessonClick}
      aria-disabled={!isAvailable || allowEmpty}
      title={allowEmpty ? 'Contenido en preparación' : (!isAvailable ? `Lección bloqueada: ${lesson.title}` : lesson.title)}
      style={{
        cursor: (isAvailable && !allowEmpty) ? 'pointer' : 'not-allowed',
        position: 'relative',
        borderColor: borderColor,
        borderWidth: '1px',
        borderStyle: 'solid',
        opacity: (!isAvailable || allowEmpty) ? 0.6 : 1,
        pointerEvents: (!isAvailable || allowEmpty) ? 'none' : 'auto',
        transition: 'opacity 0.25s ease-in-out',
      }}
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      {/* Contenido de la card */}
      <div
        style={{
          pointerEvents: 'inherit',
        }}
      >
        <LessonCardHeader
          lesson={lesson}
          isAvailable={isAvailable}
          status={status}
          levelColor={levelColor}
          isHovered={isHovered}
        />

        <LessonCardMeta
          lesson={lesson}
          isAvailable={isAvailable}
          allowEmpty={allowEmpty}
        />

        <LessonCardBody
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          lesson={lesson}
          isAvailable={isAvailable}
          handleCardBodyInteraction={handleCardBodyInteraction}
        />

        <LessonCardFooter
          status={status}
          isAvailable={isAvailable && !allowEmpty}
          allowEmpty={allowEmpty}
          levelColor={levelColor}
          theme={theme}
          onLessonClick={onLessonClick || ((moduleId, lessonId) => {
            // Fallback: usar router.push si no hay callback
            if (isAvailable && !allowEmpty) {
              router.push(`/teaching/${moduleId}/${lessonId}`);
            }
          })}
          moduleId={lesson.moduleId}
          lessonId={lesson.lessonId}
          lessonTitle={lesson.title}
          sections={lesson.sections || []}
        />

        {/* Barra de progreso */}
        <div style={{ marginTop: 8, opacity: isAvailable ? 1 : 0.6 }}>
          <CurriculumProgressBar
            value={progressPercent}
          />
        </div>
      </div>
    </article>
  );
};

// PropTypes con documentación completa
LessonCard.propTypes = {
  /** Objeto con todos los datos de la lección */
  lesson: PropTypes.shape({
    /** ID del módulo al que pertenece */
    moduleId: PropTypes.string.isRequired,
    /** ID único de la lección */
    lessonId: PropTypes.string.isRequired,
    /** Título de la lección */
    title: PropTypes.string.isRequired,
    /** Descripción de la lección */
    description: PropTypes.string,
    /** Tiempo estimado en minutos */
    estimatedTime: PropTypes.number,
    /** Nivel de dificultad (ej: "básico", "intermedio", "avanzado") */
    difficulty: PropTypes.string,
    /** Orden de la lección */
    order: PropTypes.number,
    /** Número de páginas (sections.length) */
    pages: PropTypes.number
  }).isRequired,
  /** Indica si la lección está disponible para el usuario */
  isAvailable: PropTypes.bool,
  /** Color hex del nivel para personalización visual */
  levelColor: PropTypes.string.isRequired,
  /** Callback ejecutado al hacer click en la lección (moduleId, lessonId) */
  onLessonClick: PropTypes.func,
  /** Indica si la lección está en construcción (allowEmpty) */
  allowEmpty: PropTypes.bool
};

export default LessonCard;

