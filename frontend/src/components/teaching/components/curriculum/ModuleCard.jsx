import React, { useMemo, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTheme, useMediaQuery, Skeleton, Snackbar, Alert, Box } from '@mui/material';
import { useLearningProgress } from '../../../../contexts/LearningProgressContext';
import useModuleAvailability from '../../../../hooks/useModuleAvailability';
import { useModuleProgress } from '../../../../hooks/useModuleProgress';
import { getModuleStatus } from './moduleCardHelpers';
import ModuleCardHeader from './ModuleCardHeader';
import ModuleCardMeta from './ModuleCardMeta';
import ModuleCardBody from './ModuleCardBody';
import ModuleCardFooter from './ModuleCardFooter';
import ModuleCardOverlay from './ModuleCardOverlay';
import ComingSoonBadge from './ComingSoonBadge';
import { isModuleComingSoon } from '../../../../data/curriculum/selectors.js';
import styles from '@/styles/curriculum.module.css';
import CurriculumProgressBar from './CurriculumProgressBar';

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
 * - Carga progreso del módulo con skeleton loading
 * - Actualización en caliente cuando cambia el progreso
 * - Manejo de errores con Snackbar
 *
 * @component
 * @param {Object} module - Datos completos del módulo
 * @param {string} module.id - ID único del módulo
 * @param {string} module.title - Título del módulo
 * @param {string} module.description - Descripción del módulo
 * @param {Array<string>} module.learningObjectives - Objetivos de aprendizaje
 * @param {string} module.difficulty - Nivel de dificultad
 * @param {number} module.duration - Duración en minutos
 * @param {number} moduleProgress - Porcentaje de progreso (0-100) [DEPRECATED: usar progreso del contexto]
 * @param {boolean} isAvailable - Si el módulo está disponible para el usuario
 * @param {boolean} isFavorite - Si el módulo está marcado como favorito
 * @param {Function} onModuleClick - Callback al hacer click en la card
 * @param {Function} onToggleFavorite - Callback para toggle de favorito
 * @param {Function} getStatusIcon - Función para obtener icono según estado
 * @param {Function} getButtonText - Función para obtener texto del botón
 * @param {Function} getButtonIcon - Función para obtener icono del botón
 * @param {string} levelColor - Color hex del nivel (para personalización)
 * @param {string[]} [completedModules=[]] - Array de IDs de módulos completados por el usuario
 * @param {Object} [precalculatedProgress] - Progreso precalculado desde ModuleGrid (opcional)
 * @returns {JSX.Element} Card de módulo optimizada
 */
const ModuleCard = ({
  module,
  moduleProgress: moduleProgressProp, // DEPRECATED: mantener por compatibilidad
  isAvailable: isAvailableProp,
  isFavorite,
  onModuleClick,
  onToggleFavorite,
  onLessonClick,
  getStatusIcon, // Mantenido por compatibilidad, no se usa (manejado internamente)
  getButtonText, // Mantenido por compatibilidad, no se usa (manejado internamente)
  getButtonIcon, // Mantenido por compatibilidad, no se usa (manejado internamente)
  levelColor,
  completedModules = [],
  precalculatedProgress // DEPRECATED: mantener por compatibilidad
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Obtener progreso del módulo usando el nuevo hook
  const { progress, isLoading: isLoadingProgress, error: progressError } = useModuleProgress(
    module.id,
    { autoLoad: true, reloadOnMount: false }
  );
  
  // Obtener lecciones completadas del contexto para compatibilidad
  const { completedLessons, syncStatus } = useLearningProgress();
  
  // Usar progreso del hook o precalculado/legacy como fallback
  const moduleProgressAggregate = useMemo(() => {
    // Prioridad: progreso del hook > precalculado > legacy prop
    if (progress && progress.totalLessons > 0) {
      return progress;
    }
    if (precalculatedProgress) {
      return precalculatedProgress;
    }
    // Fallback a cálculo legacy si no hay datos
    return {
      percent: (moduleProgressProp || 0) / 100,
      percentInt: moduleProgressProp || 0,
      completedLessons: 0,
      totalLessons: (module?.lessons || []).length,
      isCompleted: (moduleProgressProp || 0) >= 100,
      completedAt: null,
    };
  }, [progress, precalculatedProgress, moduleProgressProp, module?.lessons]);
  
  // Estado para tabs internos de la card
  const [activeTab, setActiveTab] = useState(0);
  
  // Estado para Snackbar de errores
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Mostrar error en Snackbar cuando hay un error de sincronización
  useEffect(() => {
    if (progressError && syncStatus === 'error') {
      setSnackbarMessage(progressError);
      setSnackbarOpen(true);
    }
  }, [progressError, syncStatus]);
  
  // Cerrar Snackbar
  const handleCloseSnackbar = useCallback((event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  }, []);
  
  // Escuchar cambios en el progreso del módulo para actualización en caliente
  useEffect(() => {
    // El progreso se actualiza automáticamente cuando cambia progressByModule en el contexto
    // No necesitamos hacer nada adicional aquí, solo re-renderizar cuando cambia
  }, [progress]);
  
  // Check if module is coming soon or placeholder
  const isComingSoon = isModuleComingSoon(module.id);
  
  // Calcular disponibilidad usando el hook centralizado
  const { isAvailable, missingPrerequisites, status: availabilityStatus } = useModuleAvailability({
    moduleId: module.id,
    prerequisites: module.prerequisites || [],
    completedModules
  });
  
  // Prioridad: si completedModules tiene datos, usar siempre el cálculo interno (más preciso)
  // Si no hay completedModules, usar isAvailableProp si está disponible, o el cálculo interno
  // IMPORTANT: Módulos coming_soon nunca están disponibles
  const finalIsAvailable = isComingSoon 
    ? false  // Módulos coming_soon siempre están bloqueados
    : (completedModules.length > 0
      ? isAvailable  // Si hay datos de módulos completados, usar cálculo interno basado en prerrequisitos
      : (isAvailableProp !== undefined ? isAvailableProp : isAvailable));
  
  // Usar progreso para determinar el status
  const moduleProgressPercent = moduleProgressAggregate.percentInt;
  const status = getModuleStatus(moduleProgressPercent, finalIsAvailable);
  
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
                               target.closest('[data-block-overlay]');
    
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
    <>
      <article
        className={`${styles.card} ${status === 'locked' ? styles.locked : ''} ${status === 'completed' ? styles.completed : ''} ${status === 'in-progress' ? styles.inProgress : ''} ${status === 'available' ? styles.available : ''}`}
        role="article"
        aria-label={`Módulo: ${module.title}`}
        onClick={handleCardClick}
        aria-disabled={!finalIsAvailable || isComingSoon}
        title={isComingSoon 
          ? 'Este módulo está en preparación y se habilitará pronto' 
          : (!finalIsAvailable ? 'Módulo bloqueado' : undefined)
        }
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
            completedAt={moduleProgressAggregate.completedAt}
          />
          
          {/* Badge "En construcción" para módulos coming_soon */}
          {isComingSoon && (
            <Box sx={{ px: 2, pb: 1, display: 'flex', justifyContent: 'flex-start' }}>
              <ComingSoonBadge 
                show={true}
                tooltip="Este módulo está en preparación y se habilitará pronto"
              />
            </Box>
          )}
  
          <ModuleCardMeta
            module={module}
            isAvailable={finalIsAvailable}
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
  
          {/* Barra de progreso con skeleton mientras carga */}
          <div style={{ marginTop: 8, opacity: finalIsAvailable ? 1 : 0.6 }}>
            {isLoadingProgress ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: 4, flex: 1 }} />
                <Skeleton variant="text" width={36} />
                <Skeleton variant="text" width={40} />
              </Box>
            ) : (
              <CurriculumProgressBar
                value={moduleProgressAggregate.percentInt}
                label={`${moduleProgressAggregate.completedLessons}/${moduleProgressAggregate.totalLessons || (module?.lessons || []).length || 0}`}
              />
            )}
          </div>
        </div>
  
        {/* Overlay para módulos bloqueados */}
        {!finalIsAvailable && (
          <ModuleCardOverlay missingPrerequisites={missingPrerequisites} />
        )}
      </article>
      
      {/* Snackbar para errores de sincronización */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="error"
          variant="filled"
          role="alert"
          aria-live="polite"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
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
  /** Porcentaje de progreso del módulo (0-100) [DEPRECATED: usar progreso del contexto] */
  moduleProgress: PropTypes.number,
  /** Indica si el módulo está disponible para el usuario */
  isAvailable: PropTypes.bool,
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
  completedModules: PropTypes.arrayOf(PropTypes.string),
  /** Progreso precalculado desde ModuleGrid para optimización (opcional, DEPRECATED) */
  precalculatedProgress: PropTypes.shape({
    percent: PropTypes.number,
    percentInt: PropTypes.number,
    completedLessons: PropTypes.number,
    totalLessons: PropTypes.number
  })
};

export default ModuleCard;
