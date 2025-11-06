"use client";

import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Grid,
  Box,
  Typography,
  Fade
} from '@mui/material';
import ModuleCard from './ModuleCard';

/**
 * ModuleGrid - Componente unificado y optimizado para renderizar grid de módulos
 *
 * Renderiza un grid responsive de módulos de aprendizaje con soporte para
 * ordenamiento, animaciones, y personalización completa. Optimizado con
 * React.memo, useMemo y useCallback para máximo rendimiento.
 *
 * @component
 * @param {Array} modules - Array de módulos a renderizar
 * @param {Function} calculateModuleProgress - Función que retorna progreso (0-100)
 * @param {Function} isModuleAvailable - Función que determina disponibilidad
 * @param {Function} onModuleClick - Callback al hacer click en un módulo
 * @param {Function} onToggleFavorite - Callback para toggle de favoritos
 * @param {Set} favoriteModules - Set de IDs de módulos favoritos
 * @param {Function} getStatusIcon - Función que retorna icono de estado
 * @param {Function} getButtonText - Función para texto del botón
 * @param {Function} getButtonIcon - Función para icono del botón
 * @param {string} levelColor - Color hex del nivel
 * @param {React.Component} moduleCard - Componente ModuleCard customizado (opcional)
 * @param {Object} columns - Breakpoints personalizados (opcional)
 * @param {string} sortBy - Campo por el cual ordenar (opcional)
 * @param {string} sortOrder - Orden asc o desc (opcional)
 * @param {boolean} enableAnimations - Habilitar animaciones fade-in (default: true)
 * @param {string} emptyMessage - Mensaje cuando no hay módulos (opcional)
 * @returns {JSX.Element} Grid de módulos optimizado
 */
const ModuleGrid = ({
  modules = [],
  calculateModuleProgress,
  isModuleAvailable,
  onModuleClick,
  onToggleFavorite,
  favoriteModules = new Set(),
  getStatusIcon,
  getButtonText,
  getButtonIcon,
  levelColor,
  moduleCard: CustomModuleCard,
  columns = { xs: 12, sm: 6, md: 4, lg: 3 },
  sortBy,
  sortOrder = 'asc',
  enableAnimations = true,
  emptyMessage = 'No hay módulos disponibles'
}) => {
  /**
   * Ordena módulos según el campo y orden especificados
   * @param {Array} modulesToSort - Array de módulos a ordenar
   * @returns {Array} Array ordenado
   */
  const sortedModules = useMemo(() => {
    if (!sortBy || modules.length === 0) return modules;

    const sorted = [...modules].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'progress':
          aValue = calculateModuleProgress ? calculateModuleProgress(a.id) : 0;
          bValue = calculateModuleProgress ? calculateModuleProgress(b.id) : 0;
          break;
        case 'difficulty':
          const difficultyOrder = { básico: 1, intermedio: 2, avanzado: 3 };
          aValue = difficultyOrder[a.difficulty?.toLowerCase()] || 0;
          bValue = difficultyOrder[b.difficulty?.toLowerCase()] || 0;
          break;
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        case 'duration':
          aValue = a.duration || 0;
          bValue = b.duration || 0;
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
  }, [modules, sortBy, sortOrder, calculateModuleProgress]);

  /**
   * Handler memoizado para clicks en módulos
   */
  const handleModuleClick = useCallback((moduleId) => {
    if (onModuleClick) {
      onModuleClick(moduleId);
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

  // Renderizar mensaje vacío
  if (sortedModules.length === 0) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 6,
          px: 2
        }}
        role="status"
        aria-live="polite"
      >
        <Typography
          variant="body2"
          sx={{
            color: '#e8f4fd',
            fontSize: '0.95rem',
            opacity: 0.8
          }}
        >
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  // Componente de card a usar (custom o por defecto)
  const CardComponent = CustomModuleCard || ModuleCard;

  return (
    <Grid
      container
      spacing={3}
      sx={{ 
        mt: 1,
        alignItems: 'stretch' // Asegura que todas las cards tengan la misma altura
      }}
      role="list"
      aria-label="Lista de módulos de aprendizaje"
    >
      {sortedModules.map((module, index) => {
        const moduleProgress = calculateModuleProgress
          ? calculateModuleProgress(module.id)
          : 0;
        const available = isModuleAvailable
          ? isModuleAvailable(module.id)
          : true;
        const isFavorite = favoriteModules.has(module.id);

        const cardContent = (
          <CardComponent
            module={module}
            moduleProgress={moduleProgress}
            isAvailable={available}
            isFavorite={isFavorite}
            onModuleClick={handleModuleClick}
            onToggleFavorite={handleToggleFavorite}
            onLessonClick={onModuleClick} // Reutilizar handleModuleClick para lecciones
            getStatusIcon={getStatusIconFn}
            getButtonText={getButtonTextFn}
            getButtonIcon={getButtonIconFn}
            levelColor={levelColor}
          />
        );

        // Renderizar con o sin animación
        const wrappedContent = enableAnimations ? (
          <Fade
            in={true}
            timeout={300 + index * 50}
            style={{ transitionDelay: `${index * 50}ms` }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {cardContent}
            </Box>
          </Fade>
        ) : (
          cardContent
        );

        return (
          <Grid
            item
            {...columns}
            key={module.id}
            role="listitem"
            aria-label={`Módulo: ${module.title}`}
            sx={{
              display: 'flex', // Asegura que el contenido de la card se estire
              flexDirection: 'column',
              width: '100%', // Asegura ancho consistente
              minWidth: 0 // Previene overflow en flexbox
            }}
          >
            {wrappedContent}
          </Grid>
        );
      })}
    </Grid>
  );
};

// Optimización con React.memo
const MemoizedModuleGrid = React.memo(ModuleGrid, (prevProps, nextProps) => {
  // Comparación personalizada para optimización
  if (prevProps.modules.length !== nextProps.modules.length) return false;
  if (prevProps.sortBy !== nextProps.sortBy) return false;
  if (prevProps.sortOrder !== nextProps.sortOrder) return false;
  if (prevProps.enableAnimations !== nextProps.enableAnimations) return false;
  if (prevProps.levelColor !== nextProps.levelColor) return false;
  
  // Comparar Sets de favoritos
  if (prevProps.favoriteModules.size !== nextProps.favoriteModules.size) return false;
  const prevFavs = Array.from(prevProps.favoriteModules);
  const nextFavs = Array.from(nextProps.favoriteModules);
  if (!prevFavs.every((id, i) => id === nextFavs[i])) return false;

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
  /** Función que calcula el progreso del módulo (retorna 0-100) */
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
  /** Breakpoints personalizados para el Grid (default: { xs: 12, sm: 6, md: 4, lg: 3 }) */
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
  emptyMessage: PropTypes.string
};

// DisplayName para React DevTools
MemoizedModuleGrid.displayName = 'ModuleGrid';

export default MemoizedModuleGrid;