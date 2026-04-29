/**
 * =============================================================================
 * VentyLab — ModuleCard
 * =============================================================================
 *
 * SOURCE OF TRUTH FOR PROGRESS:
 *   `useProgress()` from `@/features/ensenanza/shared/progreso`. The hook
 *   wraps SWR around `GET /api/progress/overview` and exposes `modules[]`
 *   with the canonical contract `{ moduleId, lessonsTotal, lessonsCompleted,
 *   percent }`. We look up this card's row by `moduleId` and use its
 *   `percent` to drive the progress bar — no localStorage reads, no
 *   `snapshot.lessons` derivations, no `progressByModule` fallbacks.
 *
 * The legacy context (`useLearningProgress`) is still consulted ONLY for
 * cross-cutting concerns that have not yet been migrated (sync status banner,
 * lesson list expansion). It is no longer the source of truth for the bar.
 *
 * Module: src/features/ensenanza/shared/components/modulos/ModuleCard/ModuleCard.jsx
 * =============================================================================
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useTheme, useMediaQuery, Skeleton, Snackbar, Alert, Box } from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import { useLearningProgress } from '@/features/progress/LearningProgressContext';
import useModuleAvailability from '@/features/ensenanza/shared/hooks/useModuleAvailability';
import { useAuth } from '@/shared/hooks/useAuth';
import { useEditMode } from '@/features/ensenanza/shared/components/edit/EditModeContext';
import DependencyModal from '@/features/ensenanza/shared/components/edit/DependencyModal/DependencyModal';
import { curriculumData } from '@/features/ensenanza/shared/data/curriculumData';
import depStyles from '@/features/ensenanza/shared/components/edit/DependencyModal/ui/DependencyModal.module.css';

import { getModuleStatus } from './moduleCardHelpers';
import ModuleCardHeader from './ModuleCardHeader';
import ModuleCardMeta from './ModuleCardMeta';
import ModuleCardBody from './ModuleCardBody';
import ModuleCardFooter from './ModuleCardFooter';
import ComingSoonBadge from './ComingSoonBadge';
import { isModuleComingSoon } from '@/features/ensenanza/shared/data/curriculum/selectors.js';
import { useProgress } from '@/features/ensenanza/shared/progreso';
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
  const { isTeacher } = useAuth();
  const isTeacherPlus = isTeacher();
  const { isEditMode } = useEditMode();
  const [depModalOpen, setDepModalOpen] = useState(false);
  

  // SINGLE source of truth for the progress bar: GET /api/progress/overview
  // delivered by `useProgress()` (SWR-backed). We pick this card's row from
  // `modules[]` by `moduleId` — no localStorage, no `snapshot.lessons`
  // mapping heuristics, no `progressByModule` fallbacks.
  const {
    getModuleProgress: getOverviewModuleProgress,
    isLoading: isLoadingProgress,
    error: progressError,
  } = useProgress();

  // Legacy context — kept ONLY for cross-cutting UI concerns (sync banner,
  // lesson-list expansion). It is NOT consulted for the progress bar.
  const { completedLessons, syncStatus } = useLearningProgress();

  const moduleProgressAggregate = useMemo(() => {
    const dto = getOverviewModuleProgress(module?.id);
    const fallbackTotal = module?.lessons?.length || 0;

    if (!dto) {
      return {
        percent: 0,
        percentInt: 0,
        completedLessons: 0,
        totalLessons: fallbackTotal,
        isCompleted: false,
        completedAt: null,
        completedPages: 0,
        totalPages: fallbackTotal,
      };
    }

    const totalLessons = dto.lessonsTotal || fallbackTotal;
    const isCompleted = totalLessons > 0 && dto.lessonsCompleted >= totalLessons;
    return {
      percent: dto.percent / 100,
      percentInt: dto.percent,
      completedLessons: dto.lessonsCompleted,
      totalLessons,
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
      completedPages: dto.lessonsCompleted,
      totalPages: totalLessons,
    };
  }, [getOverviewModuleProgress, module?.id, module?.lessons?.length]);

  const hasLessons = moduleProgressAggregate.totalLessons > 0;
  
  // Estado para tabs internos de la card
  const [activeTab, setActiveTab] = useState(0);
  
  // Estado para Snackbar de errores
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Mostrar error en Snackbar cuando hay un error de sincronización
  useEffect(() => {
    if (progressError && syncStatus === 'error') {
      const msg = progressError instanceof Error ? progressError.message : String(progressError);
      setSnackbarMessage(msg);
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
  
  // El progreso se re-renderiza automáticamente cuando SWR revalida la
  // respuesta de /api/progress/overview — no se requiere efecto adicional.
  
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
  // 0) TEACHER / ADMIN / SUPERUSER: acceso irrestricto — ignora isAvailableProp y coming_soon.
  // 1) Módulos coming_soon nunca están disponibles para estudiantes.
  // 2) Si el padre proporciona isAvailableProp, usar ese valor como fuente de verdad.
  // 3) Si no se proporciona isAvailableProp, usar el cálculo interno del hook useModuleAvailability.
  const finalIsAvailable = isTeacherPlus
    ? true
    : (isComingSoon ? false : (isAvailableProp !== undefined ? isAvailableProp : isAvailable));
  
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
            {isLoadingProgress ? (
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
  
          {/* Switch de dependencias — solo visible en modo edición para teacher+ */}
          {isEditMode && isTeacherPlus && (
            <div style={{ padding: '2px 16px 4px' }}>
              <button
                type="button"
                className={`${depStyles['dep-switch']} ${(module.prerequisites?.length > 0) ? depStyles['dep-switch--active'] : ''}`}
                onClick={(e) => { e.stopPropagation(); setDepModalOpen(true); }}
                aria-label="Editar prerequisitos del módulo"
              >
                <AccountTreeOutlinedIcon className={depStyles['dep-switch__icon']} style={{ fontSize: 12 }} />
                Prerequisitos
                {module.prerequisites?.length > 0 && (
                  <span className={depStyles['dep-switch__badge']} data-count={module.prerequisites.length} />
                )}
              </button>
            </div>
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
      
      {/* Modal de prerequisitos — solo accesible en modo edición */}
      {isEditMode && isTeacherPlus && (
        <DependencyModal
          open={depModalOpen}
          onClose={() => setDepModalOpen(false)}
          onSave={(selectedIds) => {
            // TODO Fase 3: PATCH /api/modules/{module.id}/prerequisites
          }}
          module={module}
          allModules={curriculumData.modules}
          levels={curriculumData.levels}
        />
      )}

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
export default ModuleCard;

