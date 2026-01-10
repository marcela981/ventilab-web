"use client";

import React, { useMemo, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Fade
} from '@mui/material';
import { ModuleCard } from '../../../../view-components/teaching/components/curriculum';
import LessonCard from './LessonCard';
// Importar estilos CSS Module para grid y cards del currículo
import styles from '@/styles/curriculum.module.css';
import useCurriculumProgress from '@/hooks/useCurriculumProgress';
import { useLearningProgress } from '@/contexts/LearningProgressContext';
import { buildLessonsArray } from './lessonHelpers';
import { useLessonAvailability } from '../../hooks/useLessonAvailability';
import { curriculumData } from '../../../../data/curriculumData';

/**
 * ModuleGrid - Componente unificado y optimizado para renderizar grid de módulos
 *
 * Renderiza un grid responsive de módulos de aprendizaje usando CSS Grid con soporte para
 * ordenamiento, animaciones, y personalización completa. Optimizado con
 * React.memo, useMemo y useCallback para máximo rendimiento.
 *
 * Utiliza CSS Grid con auto-fill para crear un layout responsive que se adapta
 * automáticamente al tamaño de la pantalla. Las cards mantienen un aspect-ratio
 * consistente (16:10) con alturas mínimas y máximas definidas.
 *
 * Características nuevas:
 * - Carga automática del progreso de todos los módulos al montar
 * - Actualización en caliente cuando cambia el progreso
 * - Usa el nuevo modelo unificado LearningProgress + LessonProgress
 *
 * @component
 * @param {Array} modules - Array de módulos a renderizar
 * @param {Function} calculateModuleProgress - Función que retorna progreso (0-100) [DEPRECATED]
 * @param {Function} isModuleAvailable - Función que determina disponibilidad
 * @param {Function} onModuleClick - Callback al hacer click en un módulo
 * @param {Function} onToggleFavorite - Callback para toggle de favoritos
 * @param {Set} favoriteModules - Set de IDs de módulos favoritos
 * @param {Function} getStatusIcon - Función que retorna icono de estado
 * @param {Function} getButtonText - Función para texto del botón
 * @param {Function} getButtonIcon - Función para icono del botón
 * @param {string} levelColor - Color hex del nivel
 * @param {React.Component} moduleCard - Componente ModuleCard customizado (opcional)
 * @param {Object} columns - Breakpoints personalizados (deprecated: ahora se usa CSS Grid auto-fill)
 * @param {string} sortBy - Campo por el cual ordenar (opcional)
 * @param {string} sortOrder - Orden asc o desc (opcional)
 * @param {boolean} enableAnimations - Habilitar animaciones fade-in (default: true)
 * @param {string} emptyMessage - Mensaje cuando no hay módulos (opcional)
 * @param {string} mode - Modo de renderizado: 'modules' (default) o 'lessons'
 * @param {string} levelId - ID del nivel para filtrar lecciones cuando mode='lessons' (opcional)
 * @returns {JSX.Element} Grid de módulos o lecciones optimizado
 */
const ModuleGrid = ({
  modules = [],
  calculateModuleProgress, // DEPRECATED: mantener por compatibilidad
  isModuleAvailable,
  onModuleClick,
  onToggleFavorite,
  favoriteModules = new Set(),
  getStatusIcon,
  getButtonText,
  getButtonIcon,
  levelColor,
  moduleCard: CustomModuleCard,
  columns, // Deprecated: ahora se usa CSS Grid con auto-fill, se mantiene por compatibilidad
  sortBy,
  sortOrder = 'asc',
  enableAnimations = true,
  emptyMessage = 'No hay módulos disponibles',
  mode = 'modules', // 'modules' o 'lessons'
  levelId = null // Para filtrar lecciones por nivel cuando mode='lessons'
}) => {
  const { loadModuleProgress, progressByModule } = useLearningProgress();
  const { isLessonAvailable } = useLessonAvailability();
  
  // Si mode === 'lessons', construir arreglo plano de lecciones
  const lessons = useMemo(() => {
    if (mode === 'lessons') {
      return buildLessonsArray(levelId);
    }
    return [];
  }, [mode, levelId]);

  // Ordenar lecciones por nivel y orden para verificación de disponibilidad
  // IMPORTANTE: Debe ordenar primero por módulo (order del módulo) y luego por lección (order de la lección)
  const sortedLessonsInLevel = useMemo(() => {
    if (mode !== 'lessons' || !levelId || !lessons || lessons.length === 0) {
      return [];
    }
    
    // Crear una copia y ordenar las lecciones
    const sorted = [...lessons].sort((a, b) => {
      // Primero, obtener los módulos
      const moduleA = curriculumData?.modules?.[a.moduleId];
      const moduleB = curriculumData?.modules?.[b.moduleId];
      
      // Si no encontramos los módulos, usar orden 0
      const moduleOrderA = moduleA?.order ?? 999;
      const moduleOrderB = moduleB?.order ?? 999;
      
      // Si los módulos tienen diferente order, ordenar por módulo
      if (moduleOrderA !== moduleOrderB) {
        return moduleOrderA - moduleOrderB;
      }
      
      // Si están en el mismo módulo, ordenar por order de la lección
      const lessonOrderA = a.order ?? 999;
      const lessonOrderB = b.order ?? 999;
      
      return lessonOrderA - lessonOrderB;
    });
    
    return sorted;
  }, [lessons, mode, levelId]);
  
  // Precalcular progreso agregado para todos los módulos de una vez (solo si mode === 'modules')
  const progressByModuleFromHook = useCurriculumProgress(mode === 'modules' ? modules : []);
  
  // Cargar progreso de todos los módulos al montar (con throttling para evitar rate limiting)
  // Solo si mode === 'modules'
  useEffect(() => {
    if (mode !== 'modules' || modules.length === 0) return;
    
    // Cargar progreso de módulos en lotes para evitar rate limiting
    const loadAllProgress = async () => {
      const BATCH_SIZE = 3; // Cargar 3 módulos a la vez
      const DELAY_BETWEEN_BATCHES = 500; // 500ms entre lotes
      
      for (let i = 0; i < modules.length; i += BATCH_SIZE) {
        const batch = modules.slice(i, i + BATCH_SIZE);
        
        // Cargar lote en paralelo
        const loadPromises = batch.map(module => 
          loadModuleProgress(module.id, { force: false }).catch(error => {
            // Ignorar errores de rate limiting ya que se manejan en el contexto
            if (error.status !== 429 && !error.message?.includes('Too many requests')) {
              console.warn(`[ModuleGrid] Failed to load progress for module ${module.id}:`, error);
            }
            return null;
          })
        );
        
        await Promise.allSettled(loadPromises);
        
        // Esperar antes de cargar el siguiente lote (excepto para el último)
        if (i + BATCH_SIZE < modules.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }
    };
    
    loadAllProgress();
  }, [modules, loadModuleProgress, mode]);
  
  /**
   * Ordena módulos o lecciones según el campo y orden especificados
   * @returns {Array} Array ordenado
   */
  const sortedItems = useMemo(() => {
    // Para lecciones, usar las lecciones ya ordenadas por nivel
    const itemsToSort = mode === 'lessons' 
      ? (sortedLessonsInLevel.length > 0 ? sortedLessonsInLevel : lessons)
      : modules;
    
    if (!sortBy || itemsToSort.length === 0) return itemsToSort;

    const sorted = [...itemsToSort].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'progress':
          if (mode === 'modules') {
            // Usar progreso precalculado si está disponible, sino usar la función legacy
            aValue = progressByModuleFromHook[a.id]?.percentInt ?? (calculateModuleProgress ? calculateModuleProgress(a.id) : 0);
            bValue = progressByModuleFromHook[b.id]?.percentInt ?? (calculateModuleProgress ? calculateModuleProgress(b.id) : 0);
          } else {
            // Para lecciones, el progreso se calcula en LessonCard
            return 0;
          }
          break;
        case 'difficulty':
          const difficultyOrder = { básico: 1, intermedio: 2, avanzado: 3, basic: 1, intermediate: 2, advanced: 3 };
          aValue = difficultyOrder[a.difficulty?.toLowerCase()] || 0;
          bValue = difficultyOrder[b.difficulty?.toLowerCase()] || 0;
          break;
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        case 'duration':
          aValue = mode === 'modules' ? (a.duration || 0) : (a.estimatedTime || 0);
          bValue = mode === 'modules' ? (b.duration || 0) : (b.estimatedTime || 0);
          break;
        default:
          return 0;
      }

      // Comparación numérica o alfabética
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      return 0;
    });

    return sorted;
  }, [mode, modules, lessons, sortBy, sortOrder, calculateModuleProgress, progressByModuleFromHook]);

  /**
   * Handler memoizado para clicks en módulos
   */
  const handleModuleClick = useCallback((moduleId) => {
    if (onModuleClick) {
      onModuleClick(moduleId);
    }
  }, [onModuleClick]);

  /**
   * Handler memoizado para clicks en lecciones (acepta moduleId y lessonId)
   */
  const handleLessonClick = useCallback((moduleId, lessonId) => {
    // Si onModuleClick está definido, llamarlo con ambos parámetros
    // Esto debería ser handleSectionClick de TeachingModule.jsx
    if (onModuleClick) {
      onModuleClick(moduleId, lessonId);
    }
  }, [onModuleClick]);

  /**
   * Handler memoizado para toggle de favoritos
   */
  const handleToggleFavorite = useCallback((moduleId) => {
    if (onToggleFavorite) {
      onToggleFavorite(moduleId);
    }
  }, [onToggleFavorite]);

  /**
   * Obtiene las funciones de personalización o funciones por defecto
   * ModuleCard puede usar estas funciones si están disponibles, o usar su lógica interna
   */
  const getStatusIconFn = getStatusIcon || (() => null);
  const getButtonTextFn = getButtonText || ((module, progress, available) => {
    if (progress === 100) return 'Completado';
    if (progress > 0) return 'Continuar';
    if (available) return 'Comenzar';
    return 'Bloqueado';
  });
  const getButtonIconFn = getButtonIcon || (() => null);

  // Renderizar estado vacío elegante con CTA
  if (sortedItems.length === 0) {
    const emptyTitle = mode === 'lessons' 
      ? 'No hay lecciones disponibles todavía'
      : 'No hay módulos disponibles todavía';
    const emptyDescription = mode === 'lessons'
      ? 'Las lecciones se habilitarán próximamente. Vuelve pronto para comenzar tu formación.'
      : (emptyMessage || 'Los módulos de aprendizaje se habilitarán próximamente. Vuelve pronto para comenzar tu formación.');
    
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          px: 2,
          maxWidth: 500,
          mx: 'auto'
        }}
        role="status"
        aria-live="polite"
        aria-label={mode === 'lessons' ? 'No hay lecciones disponibles' : 'No hay módulos disponibles'}
      >
        <Typography
          variant="h6"
          sx={{
            color: 'text.primary',
            fontSize: '1.25rem',
            fontWeight: 600,
            mb: 2,
            // WCAG AA: Ensure sufficient contrast
            '@media (prefers-contrast: high)': {
              fontWeight: 700,
            },
          }}
        >
          {emptyTitle}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontSize: '0.95rem',
            opacity: 0.8,
            mb: 3,
            lineHeight: 1.6
          }}
        >
          {emptyDescription}
        </Typography>
        {/* CTA button could be added here if needed */}
      </Box>
    );
  }

  // Componente de card a usar según el modo
  const CardComponent = mode === 'lessons' 
    ? LessonCard 
    : (CustomModuleCard || ModuleCard);

  // Calcular módulos completados (progreso = 100%) - solo para modo modules
  const completedModules = useMemo(() => {
    if (mode !== 'modules') return [];
    return modules
      .filter(module => {
        const progress = progressByModuleFromHook[module.id];
        return progress?.percentInt === 100;
      })
      .map(module => module.id);
  }, [modules, progressByModuleFromHook, mode]);

  return (
    <div
      className={styles.grid}
      role="list"
      aria-label={mode === 'lessons' ? 'Lista de lecciones de aprendizaje' : 'Lista de módulos de aprendizaje'}
    >
      {sortedItems.map((item, index) => {
        if (mode === 'lessons') {
          // Renderizar LessonCard
          const lesson = item;
          // Verificar disponibilidad usando la lógica de desbloqueo secuencial
          const available = isLessonAvailable(lesson, sortedLessonsInLevel);
          
          // Obtener allowEmpty del lesson
          const allowEmpty = lesson.allowEmpty === true;
          
          const cardContent = (
            <CardComponent
              lesson={lesson}
              isAvailable={available && !allowEmpty}
              allowEmpty={allowEmpty}
              levelColor={levelColor}
              onLessonClick={handleLessonClick}
            />
          );

          // Renderizar con o sin animación
          const wrappedContent = enableAnimations ? (
            <Fade
              in={true}
              timeout={300 + index * 50}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <div>
                {cardContent}
              </div>
            </Fade>
          ) : (
            cardContent
          );

          return (
            <div
              key={`${lesson.moduleId}-${lesson.lessonId}`}
              role="listitem"
              aria-label={`Lección: ${lesson.title}`}
            >
              {wrappedContent}
            </div>
          );
        } else {
          // Renderizar ModuleCard (código original)
          const module = item;
          // Usar progreso precalculado del hook
          const precalculatedProgress = progressByModuleFromHook[module.id];
          
          // Mantener compatibilidad con función legacy si no hay progreso del hook
          const moduleProgress = precalculatedProgress?.percentInt ?? (
            calculateModuleProgress
              ? calculateModuleProgress(module.id)
              : 0
          );
          
          const available = isModuleAvailable
            ? isModuleAvailable(module.id)
            : true;
          const isFavorite = favoriteModules && typeof favoriteModules.has === 'function' 
            ? favoriteModules.has(module.id) 
            : false;

          const cardContent = (
            <CardComponent
              module={module}
              moduleProgress={moduleProgress} // DEPRECATED: mantener por compatibilidad
              isAvailable={available}
              isFavorite={isFavorite}
              onModuleClick={handleModuleClick}
              onToggleFavorite={handleToggleFavorite}
              onLessonClick={onModuleClick} // Reutilizar handleModuleClick para lecciones
              getStatusIcon={getStatusIconFn}
              getButtonText={getButtonTextFn}
              getButtonIcon={getButtonIconFn}
              levelColor={levelColor}
              completedModules={completedModules}
              precalculatedProgress={precalculatedProgress} // Pasar progreso agregado completo
            />
          );

          // Renderizar con o sin animación
          // Nota: Fade necesita un wrapper, pero lo mantenemos mínimo para no romper el grid
          const wrappedContent = enableAnimations ? (
            <Fade
              in={true}
              timeout={300 + index * 50}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <div>
                {cardContent}
              </div>
            </Fade>
          ) : (
            cardContent
          );

          return (
            <div
              key={module.id}
              role="listitem"
              aria-label={`Módulo: ${module.title}`}
            >
              {wrappedContent}
            </div>
          );
        }
      })}
    </div>
  );
};

// Optimización con React.memo
const MemoizedModuleGrid = React.memo(ModuleGrid, (prevProps, nextProps) => {
  // Comparación personalizada para optimización
  if (prevProps.mode !== nextProps.mode) return false;
  if (prevProps.levelId !== nextProps.levelId) return false;
  
  // Solo comparar módulos si estamos en modo 'modules'
  if (prevProps.mode === 'modules') {
    if (prevProps.modules.length !== nextProps.modules.length) return false;
  }
  
  if (prevProps.sortBy !== nextProps.sortBy) return false;
  if (prevProps.sortOrder !== nextProps.sortOrder) return false;
  if (prevProps.enableAnimations !== nextProps.enableAnimations) return false;
  if (prevProps.levelColor !== nextProps.levelColor) return false;
  
  // Comparar Sets de favoritos (solo si están definidos)
  const prevFavModules = prevProps.favoriteModules;
  const nextFavModules = nextProps.favoriteModules;
  if (prevFavModules && nextFavModules) {
    if (prevFavModules.size !== nextFavModules.size) return false;
    const prevFavs = Array.from(prevFavModules);
    const nextFavs = Array.from(nextFavModules);
    if (!prevFavs.every((id, i) => id === nextFavs[i])) return false;
  } else if (prevFavModules !== nextFavModules) {
    // Si uno está definido y el otro no, son diferentes
    return false;
  }

  // Si las funciones son las mismas referencias, no re-renderizar
  if (prevProps.calculateModuleProgress !== nextProps.calculateModuleProgress) return false;
  if (prevProps.isModuleAvailable !== nextProps.isModuleAvailable) return false;
  if (prevProps.onModuleClick !== nextProps.onModuleClick) return false;
  if (prevProps.onToggleFavorite !== nextProps.onToggleFavorite) return false;

  return true;
});

// PropTypes completos
MemoizedModuleGrid.propTypes = {
  /** Array de módulos a renderizar */
  modules: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    learningObjectives: PropTypes.arrayOf(PropTypes.string),
    difficulty: PropTypes.string,
    duration: PropTypes.number
  })),
  /** Función que calcula el progreso del módulo (retorna 0-100) [DEPRECATED] */
  calculateModuleProgress: PropTypes.func,
  /** Función que determina si un módulo está disponible */
  isModuleAvailable: PropTypes.func,
  /** Callback ejecutado al hacer click en un módulo */
  onModuleClick: PropTypes.func,
  /** Callback para toggle de favorito en un módulo */
  onToggleFavorite: PropTypes.func,
  /** Set de IDs de módulos marcados como favoritos */
  favoriteModules: PropTypes.instanceOf(Set),
  /** Función que retorna el icono de estado apropiado */
  getStatusIcon: PropTypes.func,
  /** Función que retorna el texto del botón según estado */
  getButtonText: PropTypes.func,
  /** Función que retorna el icono del botón según estado */
  getButtonIcon: PropTypes.func,
  /** Color hexadecimal del nivel para personalización */
  levelColor: PropTypes.string,
  /** Componente ModuleCard customizado (opcional) */
  moduleCard: PropTypes.elementType,
  /** Breakpoints personalizados para el Grid (deprecated: ahora se usa CSS Grid con auto-fill) */
  columns: PropTypes.shape({
    xs: PropTypes.number,
    sm: PropTypes.number,
    md: PropTypes.number,
    lg: PropTypes.number,
    xl: PropTypes.number
  }),
  /** Campo por el cual ordenar (progress, difficulty, title, duration) */
  sortBy: PropTypes.oneOf(['progress', 'difficulty', 'title', 'duration']),
  /** Orden de ordenamiento (asc o desc) */
  sortOrder: PropTypes.oneOf(['asc', 'desc']),
  /** Habilitar animaciones fade-in (default: true) */
  enableAnimations: PropTypes.bool,
  /** Mensaje a mostrar cuando no hay módulos */
  emptyMessage: PropTypes.string,
  /** Modo de renderizado: 'modules' (default) o 'lessons' */
  mode: PropTypes.oneOf(['modules', 'lessons']),
  /** ID del nivel para filtrar lecciones cuando mode='lessons' (opcional) */
  levelId: PropTypes.string
};

// DisplayName para React DevTools
MemoizedModuleGrid.displayName = 'ModuleGrid';

export default MemoizedModuleGrid;
