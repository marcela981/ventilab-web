/**
 * Animation System - Sistema de animaciones consistente
 *
 * Configuración centralizada de todas las animaciones, transiciones y efectos
 * visuales del proyecto. Garantiza consistencia, performance y accesibilidad
 * en todas las interacciones animadas.
 *
 * Características:
 * - Duraciones estandarizadas para consistencia
 * - Curvas de animación optimizadas para naturalidad
 * - Respeta prefers-reduced-motion para accesibilidad
 * - Optimizado para 60fps en todos los dispositivos
 * - Keyframes reutilizables para efectos comunes
 * - Hooks personalizados para facilitar implementación
 *
 * @module AnimationSystem
 * @version 1.0.0
 */

// ==================== CONFIGURACIÓN DE DURACIONES ====================

/**
 * Duraciones estándar para todas las animaciones
 * Usar estas constantes en lugar de valores hardcodeados
 *
 * @constant {Object}
 */
export const DURATIONS = {
  /** 150ms - Micro-interacciones, hover states */
  instant: 150,

  /** 200ms - Animaciones rápidas, cambios de estado simples */
  fast: 200,

  /** 250ms - Transiciones estándar para la mayoría de elementos */
  normal: 250,

  /** 300ms - Animaciones de entrada/salida de componentes */
  medium: 300,

  /** 400ms - Animaciones complejas, múltiples propiedades */
  slow: 400,

  /** 500ms - Animaciones de énfasis, barras de progreso */
  slower: 500,

  /** 600ms - Animaciones de entrada de página */
  slowest: 600,
};

/**
 * Duraciones en formato string para CSS
 * @constant {Object}
 */
export const DURATION_CSS = {
  instant: `${DURATIONS.instant}ms`,
  fast: `${DURATIONS.fast}ms`,
  normal: `${DURATIONS.normal}ms`,
  medium: `${DURATIONS.medium}ms`,
  slow: `${DURATIONS.slow}ms`,
  slower: `${DURATIONS.slower}ms`,
  slowest: `${DURATIONS.slowest}ms`,
};

// ==================== CURVAS DE ANIMACIÓN ====================

/**
 * Curvas de animación (timing functions) optimizadas
 * Basadas en las curvas de Material Design
 *
 * @constant {Object}
 */
export const EASINGS = {
  /** Suave entrada y salida - para la mayoría de transiciones */
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

  /** Acelera al salir - para elementos que salen de la pantalla */
  easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',

  /** Decelera al entrar - para elementos que entran a la pantalla */
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',

  /** Movimiento dramático y rápido */
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',

  /** Entrada con rebote suave */
  easeOutBack: 'cubic-bezier(0.34, 1.56, 0.64, 1)',

  /** Elástico suave para micro-interacciones */
  easeOutElastic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  /** Linear para cambios constantes */
  linear: 'linear',
};

// ==================== PROPIEDADES DE TRANSICIÓN ====================

/**
 * Configuraciones de transición CSS listas para usar
 * Combinan duración y curva apropiadas
 *
 * @constant {Object}
 */
export const TRANSITIONS = {
  /** Transición estándar para todos los cambios */
  all: `all ${DURATION_CSS.normal} ${EASINGS.easeInOut}`,

  /** Transición para colores */
  color: `color ${DURATION_CSS.normal} ${EASINGS.easeInOut}`,

  /** Transición para background */
  background: `background-color ${DURATION_CSS.normal} ${EASINGS.easeInOut}`,

  /** Transición para transformaciones */
  transform: `transform ${DURATION_CSS.normal} ${EASINGS.easeOut}`,

  /** Transición para opacidad */
  opacity: `opacity ${DURATION_CSS.normal} ${EASINGS.easeInOut}`,

  /** Transición para box-shadow */
  shadow: `box-shadow ${DURATION_CSS.normal} ${EASINGS.easeOut}`,

  /** Transición rápida para hover */
  hover: `all ${DURATION_CSS.fast} ${EASINGS.easeOut}`,

  /** Transición lenta para progreso */
  progress: `transform ${DURATION_CSS.slower} ${EASINGS.easeOut}`,
};

// ==================== EFECTOS DE ENTRADA ====================

/**
 * Configuraciones para animaciones de entrada (fade-in)
 * Compatible con Material UI Fade component
 *
 * @constant {Object}
 */
export const FADE_IN = {
  /** Desde opacidad 0 */
  from: {
    opacity: 0,
    transform: 'translateY(20px)',
  },

  /** Hasta opacidad 1 */
  to: {
    opacity: 1,
    transform: 'translateY(0)',
  },

  /** Configuración para uso con transition */
  config: {
    duration: DURATIONS.medium,
    easing: EASINGS.easeOut,
  },
};

/**
 * Fade in desde la izquierda
 * @constant {Object}
 */
export const FADE_IN_LEFT = {
  from: {
    opacity: 0,
    transform: 'translateX(-20px)',
  },
  to: {
    opacity: 1,
    transform: 'translateX(0)',
  },
  config: {
    duration: DURATIONS.medium,
    easing: EASINGS.easeOut,
  },
};

/**
 * Fade in desde la derecha
 * @constant {Object}
 */
export const FADE_IN_RIGHT = {
  from: {
    opacity: 0,
    transform: 'translateX(20px)',
  },
  to: {
    opacity: 1,
    transform: 'translateX(0)',
  },
  config: {
    duration: DURATIONS.medium,
    easing: EASINGS.easeOut,
  },
};

/**
 * Scale fade in (crece mientras aparece)
 * @constant {Object}
 */
export const SCALE_FADE_IN = {
  from: {
    opacity: 0,
    transform: 'scale(0.95)',
  },
  to: {
    opacity: 1,
    transform: 'scale(1)',
  },
  config: {
    duration: DURATIONS.medium,
    easing: EASINGS.easeOut,
  },
};

// ==================== EFECTOS HOVER ====================

/**
 * Configuraciones para efectos hover consistentes
 * Usar en todos los elementos interactivos
 *
 * @constant {Object}
 */
export const HOVER_EFFECTS = {
  /** Elevación estándar - para cards y botones */
  lift: {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: TRANSITIONS.hover,
  },

  /** Elevación sutil - para elementos pequeños */
  liftSubtle: {
    transform: 'translateY(-1px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
    transition: TRANSITIONS.hover,
  },

  /** Scale ligero - para íconos y chips */
  scale: {
    transform: 'scale(1.02)',
    transition: TRANSITIONS.hover,
  },

  /** Scale más pronunciado - para elementos de énfasis */
  scaleUp: {
    transform: 'scale(1.05)',
    transition: TRANSITIONS.hover,
  },

  /** Brillo - para imágenes */
  brightness: {
    filter: 'brightness(1.1)',
    transition: TRANSITIONS.hover,
  },

  /** Glow sutil - para botones primary */
  glow: {
    boxShadow: '0 4px 20px rgba(16, 174, 222, 0.4)',
    transition: TRANSITIONS.hover,
  },
};

// ==================== ANIMACIONES DE CARGA ====================

/**
 * Configuración para skeleton loaders
 * Compatible con Material UI Skeleton
 *
 * @constant {Object}
 */
export const SKELETON_CONFIG = {
  animation: 'wave',
  variant: 'rectangular',
  sx: {
    borderRadius: '8px',
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
};

/**
 * Configuración para pulse effect (elementos que requieren atención)
 * @constant {Object}
 */
export const PULSE_ANIMATION = {
  keyframes: `
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.9;
        transform: scale(1.02);
      }
    }
  `,
  css: {
    animation: `pulse 2s ${EASINGS.easeInOut} infinite`,
  },
};

/**
 * Configuración para bounce effect (completar tareas)
 * @constant {Object}
 */
export const BOUNCE_ANIMATION = {
  keyframes: `
    @keyframes bounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-5px);
      }
    }
  `,
  css: {
    animation: `bounce 0.6s ${EASINGS.easeOut}`,
  },
};

/**
 * Configuración para shimmer effect (loading)
 * @constant {Object}
 */
export const SHIMMER_ANIMATION = {
  keyframes: `
    @keyframes shimmer {
      0% {
        background-position: -1000px 0;
      }
      100% {
        background-position: 1000px 0;
      }
    }
  `,
  css: {
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '1000px 100%',
    animation: `shimmer 2s ${EASINGS.linear} infinite`,
  },
};

// ==================== ANIMACIONES ESCALONADAS ====================

/**
 * Calcula el delay para animaciones escalonadas
 *
 * @param {number} index - Índice del elemento en la lista
 * @param {number} baseDelay - Delay base en ms (default: 50)
 * @param {number} maxDelay - Delay máximo en ms (default: 600)
 * @returns {number} Delay en milisegundos
 *
 * @example
 * const delay = calculateStaggerDelay(5, 50, 600); // 250ms
 */
export const calculateStaggerDelay = (index, baseDelay = 50, maxDelay = 600) => {
  return Math.min(index * baseDelay, maxDelay);
};

/**
 * Configuración para animaciones en cascada
 * @constant {Object}
 */
export const STAGGER_CONFIG = {
  baseDelay: 50,      // 50ms entre cada elemento
  maxDelay: 600,      // Máximo 600ms de delay
  duration: DURATIONS.slow,
  easing: EASINGS.easeOut,
};

// ==================== ACCESIBILIDAD ====================

/**
 * Detecta si el usuario prefiere movimiento reducido
 * Importante para accesibilidad
 *
 * @returns {boolean} true si el usuario prefiere movimiento reducido
 */
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Hook personalizado para respetar prefers-reduced-motion
 * Retorna la duración apropiada según la preferencia del usuario
 *
 * @param {number} normalDuration - Duración normal de la animación
 * @returns {number} Duración ajustada o 0 si movimiento reducido
 *
 * @example
 * const duration = useReducedMotion(300); // 0 si reduced motion, 300 si no
 */
export const getAccessibleDuration = (normalDuration) => {
  return prefersReducedMotion() ? 0 : normalDuration;
};

/**
 * Obtiene transición accesible
 *
 * @param {string} transition - Transición CSS normal
 * @returns {string} Transición o 'none' si movimiento reducido
 *
 * @example
 * const transition = getAccessibleTransition(TRANSITIONS.all);
 */
export const getAccessibleTransition = (transition) => {
  return prefersReducedMotion() ? 'none' : transition;
};

// ==================== UTILIDADES ====================

/**
 * Genera string de transición CSS para múltiples propiedades
 *
 * @param {Array<string>} properties - Array de propiedades CSS
 * @param {number} duration - Duración en ms
 * @param {string} easing - Curva de animación
 * @returns {string} String de transición CSS
 *
 * @example
 * createTransition(['opacity', 'transform'], 300, EASINGS.easeOut)
 * // 'opacity 300ms cubic-bezier(...), transform 300ms cubic-bezier(...)'
 */
export const createTransition = (properties, duration = DURATIONS.normal, easing = EASINGS.easeInOut) => {
  const accessibleDuration = getAccessibleDuration(duration);
  if (accessibleDuration === 0) return 'none';

  return properties
    .map(prop => `${prop} ${accessibleDuration}ms ${easing}`)
    .join(', ');
};

/**
 * Crea configuración de Fade para Material UI
 *
 * @param {number} duration - Duración en ms
 * @param {number} delay - Delay en ms
 * @returns {Object} Props para Fade component
 *
 * @example
 * <Fade {...createFadeConfig(300, 100)}>
 *   <Box>Content</Box>
 * </Fade>
 */
export const createFadeConfig = (duration = DURATIONS.medium, delay = 0) => ({
  in: true,
  timeout: {
    enter: getAccessibleDuration(duration),
  },
  style: {
    transitionDelay: `${getAccessibleDuration(delay)}ms`,
    transitionTimingFunction: EASINGS.easeOut,
  },
});

/**
 * Crea estilo para animación de entrada escalonada
 *
 * @param {number} index - Índice del elemento
 * @param {number} baseDelay - Delay base
 * @returns {Object} Objeto de estilos CSS-in-JS
 *
 * @example
 * <Box sx={createStaggerStyle(3, 50)}>
 *   Content
 * </Box>
 */
export const createStaggerStyle = (index, baseDelay = STAGGER_CONFIG.baseDelay) => {
  const delay = calculateStaggerDelay(index, baseDelay, STAGGER_CONFIG.maxDelay);

  return {
    animation: `fadeInUp ${STAGGER_CONFIG.duration}ms ${EASINGS.easeOut}`,
    animationDelay: `${getAccessibleDuration(delay)}ms`,
    animationFillMode: 'both',
  };
};

// ==================== KEYFRAMES CSS ====================

/**
 * Keyframes CSS para insertar en el documento
 * Usar con styled-components o emotion
 */
export const CSS_KEYFRAMES = `
  /* Fade In Up */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Fade In */
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* Scale In */
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Slide In Left */
  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* Slide In Right */
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* Pulse */
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.9;
      transform: scale(1.02);
    }
  }

  /* Bounce */
  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  /* Shimmer */
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }

  /* Rotate */
  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Respeto a prefers-reduced-motion */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

// ==================== PRESETS COMUNES ====================

/**
 * Configuraciones predefinidas para casos de uso comunes
 */
export const ANIMATION_PRESETS = {
  /** Para cards de módulos */
  moduleCard: {
    transition: TRANSITIONS.all,
    '&:hover': HOVER_EFFECTS.lift,
  },

  /** Para botones */
  button: {
    transition: TRANSITIONS.hover,
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(16, 174, 222, 0.3)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  },

  /** Para chips */
  chip: {
    transition: TRANSITIONS.hover,
    '&:hover': HOVER_EFFECTS.scale,
  },

  /** Para íconos */
  icon: {
    transition: TRANSITIONS.transform,
    '&:hover': {
      transform: 'scale(1.1)',
    },
  },

  /** Para progress bars */
  progressBar: {
    transition: TRANSITIONS.progress,
    '& .MuiLinearProgress-bar': {
      transition: TRANSITIONS.progress,
    },
  },
};

// ==================== EXPORTS ====================

export default {
  // Configuración
  DURATIONS,
  DURATION_CSS,
  EASINGS,
  TRANSITIONS,

  // Efectos
  FADE_IN,
  FADE_IN_LEFT,
  FADE_IN_RIGHT,
  SCALE_FADE_IN,
  HOVER_EFFECTS,

  // Loading
  SKELETON_CONFIG,
  PULSE_ANIMATION,
  BOUNCE_ANIMATION,
  SHIMMER_ANIMATION,

  // Stagger
  STAGGER_CONFIG,
  calculateStaggerDelay,

  // Accesibilidad
  prefersReducedMotion,
  getAccessibleDuration,
  getAccessibleTransition,

  // Utilidades
  createTransition,
  createFadeConfig,
  createStaggerStyle,

  // CSS
  CSS_KEYFRAMES,

  // Presets
  ANIMATION_PRESETS,
};

/**
 * GUÍA DE USO:
 *
 * 1. Importar configuraciones:
 * import { DURATIONS, EASINGS, TRANSITIONS } from '@/styles/animations';
 *
 * 2. Usar en componentes Material UI:
 * <Box sx={{ transition: TRANSITIONS.all }}>
 *
 * 3. Aplicar hover effects:
 * <Card sx={{ '&:hover': HOVER_EFFECTS.lift }}>
 *
 * 4. Animaciones escalonadas:
 * {items.map((item, index) => (
 *   <Fade key={item.id} {...createFadeConfig(300, calculateStaggerDelay(index))}>
 *     <Box>{item.content}</Box>
 *   </Fade>
 * ))}
 *
 * 5. Verificar accesibilidad:
 * const duration = getAccessibleDuration(DURATIONS.normal);
 *
 * 6. Progress bar suave:
 * <LinearProgress sx={ANIMATION_PRESETS.progressBar} />
 *
 * MEJORES PRÁCTICAS:
 *
 * - Siempre usar constantes en lugar de valores hardcodeados
 * - Verificar prefers-reduced-motion para accesibilidad
 * - Mantener animaciones por debajo de 500ms para percepción de velocidad
 * - Usar easeOut para entrada, easeIn para salida, easeInOut para transiciones
 * - No animar demasiados elementos simultáneamente (max 10-15)
 * - Preferir transform y opacity sobre otras propiedades (mejor performance)
 * - Usar will-change con precaución (solo para animaciones críticas)
 */
