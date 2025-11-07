import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTheme, useMediaQuery } from '@mui/material';
import { useLearningProgress } from '../../../../contexts/LearningProgressContext';
import useModuleAvailability from '../../../../hooks/useModuleAvailability';
import { getModuleStatus } from './moduleCardHelpers';
import ModuleCardHeader from './ModuleCardHeader';
import ModuleCardMeta from './ModuleCardMeta';
import ModuleCardBody from './ModuleCardBody';
import ModuleCardFooter from './ModuleCardFooter';
import ModuleCardOverlay from './ModuleCardOverlay';
import styles from '@/styles/curriculum.module.css';

/**
 * ModuleCard - Card minimalista y optimizada para módulos de aprendizaje
 *
 * Componente de card individual que muestra información de un módulo con un diseño
 * flat moderno, microinteracciones suaves y clara jerarquía visual.
 *
 * Características principales:
 * - Diseño flat con border sutil de 1px
 * - Hover effect elegante con elevación de 2px y sombra suave
 * - Transiciones suaves de 0.25s ease-in-out
 * - Estados visuales claros (completado, en progreso, disponible, bloqueado)
 * - Título y descripción con truncado automático (ellipsis)
 * - Barra de progreso delgada y minimalista (5px)
 * - Chips minimalistas con colores pasteles
 * - Botón de favorito con fondo semi-transparente
 * - Totalmente responsive con aspect ratio consistente
 * - Opacidad reducida para módulos bloqueados (0.5)
 *
 * @component
 * @param {Object} module - Datos completos del módulo
 * @param {string} module.id - ID único del módulo
 * @param {string} module.title - Título del módulo
 * @param {string} module.description - Descripción del módulo
 * @param {Array<string>} module.learningObjectives - Objetivos de aprendizaje
 * @param {string} module.difficulty - Nivel de dificultad
 * @param {number} module.duration - Duración en minutos
 * @param {number} moduleProgress - Porcentaje de progreso (0-100)
 * @param {boolean} isAvailable - Si el módulo está disponible para el usuario
 * @param {boolean} isFavorite - Si el módulo está marcado como favorito
 * @param {Function} onModuleClick - Callback al hacer click en la card
 * @param {Function} onToggleFavorite - Callback para toggle de favorito
 * @param {Function} getStatusIcon - Función para obtener icono según estado
 * @param {Function} getButtonText - Función para obtener texto del botón
 * @param {Function} getButtonIcon - Función para obtener icono del botón
 * @param {string} levelColor - Color hex del nivel (para personalización)
 * @param {string[]} [completedModules=[]] - Array de IDs de módulos completados por el usuario
 * @returns {JSX.Element} Card de módulo optimizada
 */
const ModuleCard = ({
  module,
  moduleProgress,
  isAvailable: isAvailableProp,
  isFavorite,
  onModuleClick,
  onToggleFavorite,
  onLessonClick, // Nueva prop para manejar clicks en lecciones
  getStatusIcon, // Mantenido por compatibilidad, no se usa (manejado internamente)
  getButtonText, // Mantenido por compatibilidad, no se usa (manejado internamente)
  getButtonIcon, // Mantenido por compatibilidad, no se usa (manejado internamente)
  levelColor,
  completedModules = []
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Obtener lecciones completadas del contexto
  const { completedLessons } = useLearningProgress();
  
  // Estado para tabs internos de la card
  const [activeTab, setActiveTab] = useState(0);

  // Calcular disponibilidad usando el hook centralizado
  const { isAvailable, missingPrerequisites, status: availabilityStatus } = useModuleAvailability({
    moduleId: module.id,
    prerequisites: module.prerequisites || [],
    completedModules
  });

  // Prioridad: si completedModules tiene datos, usar siempre el cálculo interno (más preciso)
  // Si no hay completedModules, usar isAvailableProp si está disponible, o el cálculo interno
  // Esto permite que el nuevo sistema basado en prerrequisitos tenga prioridad cuando hay datos
  const finalIsAvailable = completedModules.length > 0
    ? isAvailable  // Si hay datos de módulos completados, usar cálculo interno basado en prerrequisitos
    : (isAvailableProp !== undefined ? isAvailableProp : isAvailable);

  const status = getModuleStatus(moduleProgress, finalIsAvailable);

  // Handler para prevenir que el click de la card se active cuando se hace scroll en el body
  const handleCardClick = (e) => {
    // Si el módulo no está disponible, bloquear todos los clicks
    if (!finalIsAvailable) {
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
                               target.closest('[data-block-overlay]'); // Prevenir clicks en el overlay
    
    if (isClickableElement) {
      return;
    }
    
    if (finalIsAvailable && onModuleClick) {
      onModuleClick(module.id);
    }
  };

  // Handler para el cardBody para prevenir propagación de eventos
  const handleCardBodyInteraction = (e) => {
    e.stopPropagation();
  };

  // Estado para manejar hover de la card
  const [isHovered, setIsHovered] = useState(false);

  // Determinar color de borde según disponibilidad
  const borderColor = finalIsAvailable ? '#0BBAF4' : '#e0e0e0';

  return (
    <article
      className={`${styles.card} ${status === 'locked' ? styles.locked : ''} ${status === 'completed' ? styles.completed : ''} ${status === 'in-progress' ? styles.inProgress : ''} ${status === 'available' ? styles.available : ''}`}
      role="article"
      aria-label={`Módulo: ${module.title}`}
      onClick={handleCardClick}
      aria-disabled={!finalIsAvailable}
      title={!finalIsAvailable ? 'Módulo bloqueado' : undefined}
      style={{
        cursor: finalIsAvailable ? 'pointer' : 'not-allowed',
        position: 'relative',
        borderColor: borderColor,
        borderWidth: '1px',
        borderStyle: 'solid',
        opacity: !finalIsAvailable ? 0.6 : 1,
        pointerEvents: !finalIsAvailable ? 'none' : 'auto',
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
        <ModuleCardHeader
          module={module}
          isFavorite={isFavorite}
          isAvailable={finalIsAvailable}
          status={status}
          availabilityStatus={availabilityStatus}
          levelColor={levelColor}
          isHovered={isHovered}
          onToggleFavorite={onToggleFavorite}
        />

        <ModuleCardMeta
          module={module}
          moduleProgress={moduleProgress}
          isAvailable={finalIsAvailable}
          status={status}
          theme={theme}
        />

        <ModuleCardBody
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          module={module}
          isAvailable={finalIsAvailable}
          completedLessons={completedLessons}
          onLessonClick={onLessonClick}
          handleCardBodyInteraction={handleCardBodyInteraction}
        />

        <ModuleCardFooter
          status={status}
          isAvailable={finalIsAvailable}
          levelColor={levelColor}
          theme={theme}
          onModuleClick={onModuleClick}
          moduleId={module.id}
        />
      </div>

      {/* Overlay para módulos bloqueados */}
      {!finalIsAvailable && (
        <ModuleCardOverlay missingPrerequisites={missingPrerequisites} />
      )}
    </article>
  );
};

// PropTypes con documentación completa
ModuleCard.propTypes = {
  /** Objeto con todos los datos del módulo */
  module: PropTypes.shape({
    /** ID único del módulo */
    id: PropTypes.string.isRequired,
    /** Título del módulo */
    title: PropTypes.string.isRequired,
    /** Descripción del módulo */
    description: PropTypes.string,
    /** Array de objetivos de aprendizaje */
    learningObjectives: PropTypes.arrayOf(PropTypes.string),
    /** Nivel de dificultad (ej: "básico", "intermedio", "avanzado") */
    difficulty: PropTypes.string.isRequired,
    /** Duración estimada en minutos */
    duration: PropTypes.number.isRequired
  }).isRequired,
  /** Porcentaje de progreso del módulo (0-100) */
  moduleProgress: PropTypes.number.isRequired,
  /** Indica si el módulo está disponible para el usuario */
  isAvailable: PropTypes.bool.isRequired,
  /** Indica si el módulo está marcado como favorito */
  isFavorite: PropTypes.bool.isRequired,
  /** Callback ejecutado al hacer click en la card */
  onModuleClick: PropTypes.func.isRequired,
  /** Callback para toggle del estado de favorito */
  onToggleFavorite: PropTypes.func.isRequired,
  /** Callback para cuando se hace click en una lección (opcional) */
  onLessonClick: PropTypes.func,
  /** Función para obtener el icono de estado apropiado (opcional, mantenido por compatibilidad) */
  getStatusIcon: PropTypes.func,
  /** Función para obtener el texto del botón según estado (opcional, mantenido por compatibilidad) */
  getButtonText: PropTypes.func,
  /** Función para obtener el icono del botón según estado (opcional, mantenido por compatibilidad) */
  getButtonIcon: PropTypes.func,
  /** Color hex del nivel para personalización visual */
  levelColor: PropTypes.string.isRequired,
  /** Array de IDs de módulos completados por el usuario (opcional) */
  completedModules: PropTypes.arrayOf(PropTypes.string)
};

export default ModuleCard;
