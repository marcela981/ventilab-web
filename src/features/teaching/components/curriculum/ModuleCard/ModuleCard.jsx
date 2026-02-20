import React, { useMemo, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTheme, useMediaQuery, Skeleton, Snackbar, Alert, Box } from '@mui/material';
import { useLearningProgress } from '@/features/progress/LearningProgressContext';
import useModuleAvailability from '@/features/teaching/hooks/useModuleAvailability';
import { useModuleProgress } from '@/features/teaching/hooks/useModuleProgress';
import { useProgress } from '@/features/teaching/hooks/useProgress';
import { useModuleLessonsCount } from '@/features/teaching/hooks/useModuleLessonsCount';
import { getModuleStatus } from './moduleCardHelpers';
import ModuleCardHeader from './ModuleCardHeader';
import ModuleCardMeta from './ModuleCardMeta';
import ModuleCardBody from './ModuleCardBody';
import ModuleCardFooter from './ModuleCardFooter';
import ComingSoonBadge from './ComingSoonBadge';
import { isModuleComingSoon } from '@/features/teaching/data/curriculum/selectors.js';
import { useModuleProgressDirect } from '@/hooks/useModuleProgressDirect';
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
  
  // Obtener progreso global del usuario usando useProgress
  const { progress: userProgress, stats, refetch: refetchProgress } = useProgress();
  
  // Obtener conteo real de lecciones del módulo desde la BD
  const { count: totalLessonsFromDB, loading: isLoadingLessonsCount } = useModuleLessonsCount(module.id);
  
  // Obtener progreso del módulo usando el nuevo hook (para compatibilidad)
  const { progress, isLoading: isLoadingProgress, error: progressError } = useModuleProgress(
    module.id,
    { autoLoad: true, reloadOnMount: false }
  );
  
  // Obtener lecciones completadas y progreso agregado del contexto
  const { completedLessons, syncStatus, moduleProgressAggregated, getModuleProgressAggregated, snapshot } = useLearningProgress();

  // Progreso directo desde el backend - fuente de verdad para el progress bar
  // Incluye retry de token para casos donde el auth es asíncrono
  const { data: directProgress, loading: loadingDirectProgress } = useModuleProgressDirect(module?.id);

  const moduleProgressAggregate = useMemo(() => {
    // SOURCE 0: Dato directo del backend (MÁS CONFIABLE)
    if (directProgress) {
      return {
        percent: directProgress.percentInt / 100,
        percentInt: directProgress.percentInt,
        completedLessons: directProgress.completedLessons,
        totalLessons: directProgress.totalLessons,
        isCompleted: directProgress.isCompleted,
        completedAt: directProgress.isCompleted ? new Date() : null,
        completedPages: 0,
        totalPages: directProgress.totalLessons,
      };
    }

    // SOURCE 1: Calcular directo desde snapshot.lessons (más confiable)
    // El snapshot tiene los lessonIds reales tal como están guardados en DB
    // Las lecciones del módulo están en module.lessons[i].id (curriculum local)
    if (snapshot?.lessons && Array.isArray(snapshot.lessons) && snapshot.lessons.length > 0) {
      const moduleLessonIds = new Set(
        (module?.lessons || []).map(l => l.id)
      );

      if (moduleLessonIds.size > 0) {
        let completedCount = 0;
        let totalWithProgress = 0;

        for (const snapshotLesson of snapshot.lessons) {
          const sId = snapshotLesson.lessonId || '';
          const progressValue = Math.max(0, Math.min(1, snapshotLesson.progress || 0));

          // Estrategia A: match exacto con lesson.id del curriculum
          const directMatch = moduleLessonIds.has(sId);

          // Estrategia B: el snapshotLesson.lessonId contiene el module.id como prefijo
          const prefixMatch = sId.startsWith(module.id + '-') || sId.startsWith(module.id + '/');

          // Estrategia C: algún lesson.id del curriculum está contenido en el snapshotId
          const reverseMatch = !directMatch && !prefixMatch &&
            Array.from(moduleLessonIds).some(lid => sId.includes(lid) || lid.includes(sId));

          if (directMatch || prefixMatch || reverseMatch) {
            totalWithProgress++;
            if (progressValue >= 0.99) completedCount++;
          }
        }

        const totalLessons = module?.lessons?.length || 0;
        const effectiveTotal = totalLessons > 0 ? totalLessons : totalWithProgress;

        if (effectiveTotal > 0 && totalWithProgress > 0) {
          const percentInt = Math.round((completedCount / effectiveTotal) * 100);
          const progressVal = completedCount / effectiveTotal;
          return {
            percent: progressVal,
            percentInt,
            completedLessons: completedCount,
            totalLessons: effectiveTotal,
            isCompleted: completedCount === effectiveTotal && effectiveTotal > 0,
            completedAt: completedCount === effectiveTotal ? new Date() : null,
            completedPages: 0,
            totalPages: effectiveTotal,
          };
        }
      }
    }

    // SOURCE 2: Fallback a moduleProgressAggregated del context
    const contextProgress = moduleProgressAggregated?.[module.id];
    if (contextProgress && (contextProgress.progressPercent > 0 || contextProgress.completedLessons > 0)) {
      const progressValue = contextProgress.progress ?? 0;
      const isCompleted = progressValue === 1;
      const normalizedPercentInt = Math.max(0, Math.min(100,
        contextProgress.progressPercent ?? Math.round(progressValue * 100)
      ));
      return {
        percent: progressValue,
        percentInt: normalizedPercentInt,
        completedLessons: contextProgress.completedLessons ?? 0,
        totalLessons: contextProgress.totalLessons ?? 0,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        completedPages: 0,
        totalPages: contextProgress.totalLessons ?? 0,
      };
    }

    // SOURCE 3: Último fallback - todo en 0
    return {
      percent: 0,
      percentInt: 0,
      completedLessons: 0,
      totalLessons: module?.lessons?.length || 0,
      isCompleted: false,
      completedAt: null,
      completedPages: 0,
      totalPages: module?.lessons?.length || 0,
    };
  }, [directProgress, snapshot, module, moduleProgressAggregated]);
  
  // Determinar si el módulo tiene lecciones
  const hasLessons = moduleProgressAggregate.totalLessons > 0;
  
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
  
  // Determinar disponibilidad final del módulo.
  // PRIORIDAD:
  // 1) Módulos coming_soon nunca están disponibles.
  // 2) Si el padre proporciona isAvailableProp (desde ModuleGrid / LevelStepper),
  //    usar SIEMPRE ese valor como fuente de verdad para habilitar o bloquear el módulo.
  // 3) Si no se proporciona isAvailableProp, usar el cálculo interno del hook useModuleAvailability.
  //
  // Esto evita que el hook interno "corrija" a bloqueado un módulo que el grid ya marcó como disponible,
  // lo que hacía que el botón se viera deshabilitado aunque la lógica externa dijera que debía estar activo.
  const finalIsAvailable = isComingSoon
    ? false
    : (isAvailableProp !== undefined ? isAvailableProp : isAvailable);
  
  // Usar progreso para determinar el status
  // El botón debe mostrarse siempre que el módulo esté disponible (por prerrequisitos)
  // No bloquear por hasLessons (puede ser false durante carga o si la API no devuelve conteo)
  const moduleProgressPercent = moduleProgressAggregate.percentInt;
  const effectiveIsAvailable = finalIsAvailable;
  const status = getModuleStatus(moduleProgressPercent, effectiveIsAvailable);

  // Handler para prevenir que el click de la card se active cuando se hace scroll en el body
  const handleCardClick = (e) => {
    // Si el módulo no está disponible, bloquear todos los clicks
    if (!finalIsAvailable) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Solo el botón del footer abre el módulo. Clic en título, header o body no navega.
    const target = e.target;
    const isClickableArea = target.closest('button') ||
                            target.closest('a') ||
                            target.closest('[role="tab"]') ||
                            target.closest(`.${styles.cardBody}`) ||
                            target.closest(`.${styles.cardFooter}`) ||
                            target.closest(`.${styles.cardHeader}`) ||
                            target.closest('[data-block-overlay]');

    if (isClickableArea) {
      return;
    }
    // No navegar al hacer click en la card; únicamente el botón "Comenzar/Continuar/Completado" navega
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
          cursor: finalIsAvailable ? 'default' : 'not-allowed',
          position: 'relative',
          borderColor: borderColor,
          borderWidth: '1px',
          borderStyle: 'solid',
          opacity: !finalIsAvailable ? 0.6 : 1,
          pointerEvents: finalIsAvailable ? 'auto' : undefined, // No aplicar 'none' aquí para permitir tooltip
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
            pointerEvents: finalIsAvailable ? 'auto' : 'none', // Bloquear eventos en el contenido cuando está bloqueado
          }}
        >
          {/* Barra de progreso del módulo - encima de los títulos */}
          <div style={{ padding: '8px 16px 0', opacity: effectiveIsAvailable ? 1 : 0.6 }}>
            {(isLoadingProgress || isLoadingLessonsCount || loadingDirectProgress) ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: 4, flex: 1 }} />
                <Skeleton variant="text" width={36} />
              </Box>
            ) : (
              <CurriculumProgressBar
                value={moduleProgressAggregate.percentInt}
              />
            )}
          </div>

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
            missingPrerequisites={missingPrerequisites}
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
            isAvailable={effectiveIsAvailable}
            levelColor={levelColor}
            theme={theme}
            onModuleClick={onModuleClick}
            moduleId={module.id}
          />
        </div>
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

