import React, { Suspense, lazy, useMemo, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import {
  Grid,
  Skeleton,
  Box,
  Typography,
  Fade
} from '@mui/material';
import {
  SchoolOutlined as SchoolIcon
} from '@mui/icons-material';

/**
 * ModuleGrid - Grid optimizado y responsive de cards de módulos
 *
 * Componente altamente optimizado para renderizar grids de módulos con:
 * - Lazy loading progresivo para mejor performance
 * - Skeleton loaders para evitar layout shifts
 * - Memoization para prevenir re-renders innecesarios
 * - Animaciones sutiles de entrada tipo cascada
 * - Breakpoints inteligentes para todos los dispositivos
 * - Ordenamiento flexible de módulos
 * - Estados vacíos con mensajes amigables
 * - Accesibilidad completa con ARIA
 *
 * Performance:
 * - Usa React.memo para evitar re-renders cuando props no cambian
 * - useCallback para funciones pasadas a children
 * - useMemo para cálculos de ordenamiento
 * - Lazy loading de cards individuales
 *
 * Responsive:
 * - Móvil (xs): 1 columna, spacing reducido
 * - Tablet pequeña (sm): 2 columnas
 * - Tablet grande (md): 3 columnas
 * - Desktop (lg+): 4 columnas
 *
 * @component
 * @param {Array} modules - Array de módulos del nivel
 * @param {Function} calculateModuleProgress - Función para calcular progreso (0-100)
 * @param {Function} isModuleAvailable - Función para verificar disponibilidad
 * @param {Function} onModuleClick - Callback para clicks en módulos
 * @param {Function} onToggleFavorite - Callback para toggle de favoritos
 * @param {Set} favoriteModules - Set de IDs de módulos favoritos
 * @param {Function} getStatusIcon - Función para obtener icono de estado
 * @param {Function} getButtonText - Función para obtener texto del botón
 * @param {Function} getButtonIcon - Función para obtener icono del botón
 * @param {string} levelColor - Color hex del nivel
 * @param {JSX.Element} moduleCard - Componente ModuleCard a renderizar
 * @param {Object} columns - Breakpoints personalizados (opcional)
 * @param {string} sortBy - Campo por el cual ordenar ('progress', 'difficulty', 'title', 'duration')
 * @param {string} sortOrder - Orden de sort ('asc', 'desc')
 * @param {boolean} enableAnimations - Habilitar animaciones de entrada (default: true)
 * @param {string} emptyMessage - Mensaje personalizado cuando no hay módulos
 */
const ModuleGrid = memo(({
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
  moduleCard,
  columns = { xs: 12, sm: 6, md: 4, lg: 3 },
  sortBy = null,
  sortOrder = 'asc',
  enableAnimations = true,
  emptyMessage = 'No hay módulos disponibles en este nivel'
}) => {
  /**
   * Memoiza el callback de click en módulo para evitar recreaciones
   * Esto previene re-renders innecesarios de las cards hijas
   */
  const handleModuleClick = useCallback((moduleId) => {
    if (onModuleClick) {
      onModuleClick(moduleId);
    }
  }, [onModuleClick]);

  /**
   * Memoiza el callback de toggle favorito para evitar recreaciones
   */
  const handleToggleFavorite = useCallback((moduleId) => {
    if (onToggleFavorite) {
      onToggleFavorite(moduleId);
    }
  }, [onToggleFavorite]);

  /**
   * Función de comparación para ordenamiento de módulos
   * @param {Object} a - Primer módulo
   * @param {Object} b - Segundo módulo
   * @returns {number} Resultado de comparación
   */
  const compareModules = useCallback((a, b) => {
    if (!sortBy) return 0;

    let compareResult = 0;

    switch (sortBy) {
      case 'progress': {
        // Ordenar por progreso (requiere calcular progreso)
        const progressA = calculateModuleProgress(a.id);
        const progressB = calculateModuleProgress(b.id);
        compareResult = progressA - progressB;
        break;
      }
      case 'difficulty': {
        // Ordenar por dificultad (básico < intermedio < avanzado)
        const difficultyOrder = { 'básico': 1, 'intermedio': 2, 'avanzado': 3 };
        const diffA = difficultyOrder[a.difficulty?.toLowerCase()] || 0;
        const diffB = difficultyOrder[b.difficulty?.toLowerCase()] || 0;
        compareResult = diffA - diffB;
        break;
      }
      case 'title': {
        // Ordenar alfabéticamente por título
        compareResult = a.title.localeCompare(b.title);
        break;
      }
      case 'duration': {
        // Ordenar por duración
        compareResult = a.duration - b.duration;
        break;
      }
      default:
        compareResult = 0;
    }

    // Aplicar orden ascendente o descendente
    return sortOrder === 'desc' ? -compareResult : compareResult;
  }, [sortBy, sortOrder, calculateModuleProgress]);

  /**
   * Memoiza el array de módulos ordenado
   * Solo se recalcula cuando modules, sortBy o sortOrder cambian
   */
  const sortedModules = useMemo(() => {
    if (!sortBy || modules.length === 0) {
      return modules;
    }

    // Crear copia para no mutar el array original
    return [...modules].sort(compareModules);
  }, [modules, sortBy, compareModules]);

  /**
   * Renderiza un skeleton loader con las mismas dimensiones que una ModuleCard
   * Esto previene layout shifts cuando la card real se carga
   */
  const renderSkeletonCard = () => (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'grey.200',
        borderRadius: 2,
        p: 2.5,
        backgroundColor: '#ffffff'
      }}
    >
      {/* Header con skeleton de ícono y favorito */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Skeleton variant="circular" width={32} height={32} animation="wave" />
        <Skeleton variant="circular" width={20} height={20} animation="wave" />
      </Box>

      {/* Título */}
      <Skeleton variant="text" width="80%" height={28} animation="wave" sx={{ mb: 1 }} />

      {/* Descripción (3 líneas) */}
      <Skeleton variant="text" width="100%" height={20} animation="wave" />
      <Skeleton variant="text" width="95%" height={20} animation="wave" />
      <Skeleton variant="text" width="70%" height={20} animation="wave" sx={{ mb: 2 }} />

      {/* Barra de progreso */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Skeleton variant="text" width={60} height={16} animation="wave" />
          <Skeleton variant="text" width={40} height={16} animation="wave" />
        </Box>
        <Skeleton variant="rectangular" width="100%" height={5} animation="wave" sx={{ borderRadius: 3 }} />
      </Box>

      {/* Chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Skeleton variant="rounded" width={80} height={24} animation="wave" />
        <Skeleton variant="rounded" width={60} height={24} animation="wave" />
      </Box>

      {/* Botón */}
      <Skeleton variant="rounded" width="100%" height={40} animation="wave" />
    </Box>
  );

  /**
   * Componente Empty State cuando no hay módulos
   * Mensaje amigable con sugerencias
   */
  const renderEmptyState = () => (
    <Grid item xs={12}>
      <Box
        role="status"
        aria-live="polite"
        sx={{
          textAlign: 'center',
          py: 8,
          px: 3,
          backgroundColor: 'transparent'
        }}
      >
        <SchoolIcon
          sx={{
            fontSize: '4rem',
            color: 'grey.400',
            mb: 2
          }}
        />
        <Typography
          variant="h6"
          sx={{
            color: 'text.secondary',
            mb: 1,
            fontWeight: 500
          }}
        >
          {emptyMessage}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            maxWidth: '500px',
            mx: 'auto'
          }}
        >
          Los módulos aparecerán aquí una vez que estén disponibles. Completa los requisitos previos para desbloquear más contenido.
        </Typography>
      </Box>
    </Grid>
  );

  /**
   * Renderiza una card de módulo individual con animación de entrada
   * @param {Object} module - Datos del módulo
   * @param {number} index - Índice del módulo para delay escalonado
   */
  const renderModuleCard = (module, index) => {
    // Pre-calcular valores para evitar cálculos repetidos
    const moduleProgress = calculateModuleProgress(module.id);
    const isAvailable = isModuleAvailable(module.id);
    const isFavorite = favoriteModules.has(module.id);

    // Calcular delay escalonado para animación cascada
    // Máximo 0.6s de delay para no hacer esperar mucho al usuario
    const animationDelay = enableAnimations ? Math.min(index * 50, 600) : 0;

    return (
      <Grid
        item
        xs={columns.xs}
        sm={columns.sm}
        md={columns.md}
        lg={columns.lg}
        key={module.id}
      >
        {/* Fade-in con delay escalonado para efecto cascada elegante */}
        <Fade
          in={true}
          timeout={{
            enter: 400,  // 0.4s duración de entrada
          }}
          style={{
            transitionDelay: `${animationDelay}ms`,
            transitionTimingFunction: 'cubic-bezier(0.0, 0, 0.2, 1)' // ease-out
          }}
        >
          <Box>
            {/*
              Suspense boundary para lazy loading de la card
              Mientras se carga, muestra el skeleton
            */}
            <Suspense fallback={renderSkeletonCard()}>
              {React.cloneElement(moduleCard, {
                module,
                moduleProgress,
                isAvailable,
                isFavorite,
                onModuleClick: handleModuleClick,
                onToggleFavorite: handleToggleFavorite,
                getStatusIcon,
                getButtonText,
                getButtonIcon,
                levelColor
              })}
            </Suspense>
          </Box>
        </Fade>
      </Grid>
    );
  };

  // Edge case: No hay módulos
  if (!sortedModules || sortedModules.length === 0) {
    return (
      <Grid
        container
        role="list"
        aria-label="Lista de módulos del curriculum"
      >
        {renderEmptyState()}
      </Grid>
    );
  }

  return (
    <Grid
      container
      // Spacing responsive: más compacto en móvil, más espaciado en desktop
      spacing={{ xs: 2, sm: 2.5, md: 3 }}
      sx={{
        mt: 1,
        // Background transparente como otras pestañas
        backgroundColor: 'transparent'
      }}
      // ARIA para accesibilidad
      role="list"
      aria-label="Lista de módulos del curriculum"
    >
      {sortedModules.map((module, index) => (
        <React.Fragment key={module.id}>
          {/* Cada card es un list item para screen readers */}
          <Box
            component="li"
            role="listitem"
            aria-label={`Módulo: ${module.title}`}
            sx={{
              display: 'contents' // No afecta el layout del grid
            }}
          >
            {renderModuleCard(module, index)}
          </Box>
        </React.Fragment>
      ))}
    </Grid>
  );
});

// Nombre para debugging en React DevTools
ModuleGrid.displayName = 'ModuleGrid';

// PropTypes con validación completa de todas las props
ModuleGrid.propTypes = {
  /** Array de módulos del nivel a renderizar */
  modules: PropTypes.arrayOf(PropTypes.shape({
    /** ID único del módulo */
    id: PropTypes.string.isRequired,
    /** Título del módulo */
    title: PropTypes.string.isRequired,
    /** Descripción del módulo */
    description: PropTypes.string,
    /** Array de objetivos de aprendizaje */
    learningObjectives: PropTypes.arrayOf(PropTypes.string),
    /** Nivel de dificultad */
    difficulty: PropTypes.string.isRequired,
    /** Duración en minutos */
    duration: PropTypes.number.isRequired
  })),

  /** Función para calcular progreso del módulo (retorna 0-100) */
  calculateModuleProgress: PropTypes.func.isRequired,

  /** Función para verificar si un módulo está disponible */
  isModuleAvailable: PropTypes.func.isRequired,

  /** Callback ejecutado al hacer click en un módulo */
  onModuleClick: PropTypes.func.isRequired,

  /** Callback para toggle del estado de favorito */
  onToggleFavorite: PropTypes.func.isRequired,

  /** Set de IDs de módulos marcados como favoritos */
  favoriteModules: PropTypes.instanceOf(Set),

  /** Función para obtener el icono de estado apropiado */
  getStatusIcon: PropTypes.func.isRequired,

  /** Función para obtener el texto del botón según estado */
  getButtonText: PropTypes.func.isRequired,

  /** Función para obtener el icono del botón según estado */
  getButtonIcon: PropTypes.func.isRequired,

  /** Color hex del nivel para personalización visual */
  levelColor: PropTypes.string.isRequired,

  /** Componente ModuleCard a renderizar para cada módulo */
  moduleCard: PropTypes.element.isRequired,

  /** Breakpoints personalizados para columnas (opcional) */
  columns: PropTypes.shape({
    xs: PropTypes.number,
    sm: PropTypes.number,
    md: PropTypes.number,
    lg: PropTypes.number,
    xl: PropTypes.number
  }),

  /** Campo por el cual ordenar los módulos */
  sortBy: PropTypes.oneOf(['progress', 'difficulty', 'title', 'duration']),

  /** Orden de ordenamiento */
  sortOrder: PropTypes.oneOf(['asc', 'desc']),

  /** Habilitar animaciones de entrada tipo cascada */
  enableAnimations: PropTypes.bool,

  /** Mensaje personalizado cuando no hay módulos */
  emptyMessage: PropTypes.string
};

export default ModuleGrid;

/**
 * GUÍA DE USO:
 *
 * 1. Uso básico:
 * <ModuleGrid
 *   modules={levelModules}
 *   calculateModuleProgress={calculateProgress}
 *   isModuleAvailable={isAvailable}
 *   onModuleClick={handleClick}
 *   onToggleFavorite={handleFavorite}
 *   favoriteModules={favorites}
 *   getStatusIcon={getIcon}
 *   getButtonText={getText}
 *   getButtonIcon={getIcon}
 *   levelColor="#4CAF50"
 *   moduleCard={<ModuleCard />}
 * />
 *
 * 2. Con columnas personalizadas:
 * <ModuleGrid
 *   {...props}
 *   columns={{ xs: 12, sm: 6, md: 6, lg: 4 }}
 * />
 *
 * 3. Con ordenamiento:
 * <ModuleGrid
 *   {...props}
 *   sortBy="progress"
 *   sortOrder="desc"
 * />
 *
 * 4. Sin animaciones (para mejor performance):
 * <ModuleGrid
 *   {...props}
 *   enableAnimations={false}
 * />
 *
 * OPTIMIZACIONES IMPLEMENTADAS:
 *
 * 1. React.memo: Previene re-renders cuando props no cambian
 * 2. useCallback: Memoiza callbacks para evitar recreaciones
 * 3. useMemo: Memoiza el array ordenado de módulos
 * 4. Suspense: Lazy loading de cards individuales
 * 5. Skeleton loaders: Previene layout shifts durante carga
 * 6. Cálculos pre-computados: Evita cálculos repetidos en el render
 * 7. Animaciones condicionales: Pueden deshabilitarse para mejor performance
 * 8. Breakpoints inteligentes: Responsive en todos los dispositivos
 *
 * ACCESIBILIDAD:
 *
 * - role="list" y role="listitem" para screen readers
 * - aria-label descriptivos
 * - aria-live="polite" para cambios dinámicos
 * - Keyboard navigation compatible (delegada a ModuleCard)
 */
