import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DURATIONS,
  EASINGS,
  calculateStaggerDelay,
  STAGGER_CONFIG,
  prefersReducedMotion,
  getAccessibleDuration,
  createFadeConfig,
} from '../styles/animations';

/**
 * useAnimations - Hooks personalizados para animaciones
 *
 * Collection de hooks de React para facilitar la implementación
 * de animaciones consistentes y accesibles en toda la aplicación.
 *
 * @module useAnimations
 */

// ==================== HOOK: useReducedMotion ====================

/**
 * Hook para detectar preferencia de movimiento reducido
 * Se actualiza automáticamente si el usuario cambia la preferencia
 *
 * @returns {boolean} true si el usuario prefiere movimiento reducido
 *
 * @example
 * function MyComponent() {
 *   const reducedMotion = useReducedMotion();
 *
 *   return (
 *     <Box
 *       sx={{
 *         transition: reducedMotion ? 'none' : 'all 0.3s ease'
 *       }}
 *     >
 *       Content
 *     </Box>
 *   );
 * }
 */
export const useReducedMotion = () => {
  const [reduced, setReduced] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Handler para cambios en la preferencia
    const handleChange = (event) => {
      setReduced(event.matches);
    };

    // Listener moderno
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Fallback para navegadores antiguos
    else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return reduced;
};

// ==================== HOOK: useStaggerAnimation ====================

/**
 * Hook para animaciones escalonadas en listas
 * Calcula automáticamente los delays para crear efecto cascada
 *
 * @param {number} itemCount - Número de items en la lista
 * @param {number} baseDelay - Delay base entre items (default: 50ms)
 * @param {number} maxDelay - Delay máximo permitido (default: 600ms)
 * @returns {Object} { getDelay, getStyle, isComplete }
 *
 * @example
 * function List({ items }) {
 *   const stagger = useStaggerAnimation(items.length);
 *
 *   return items.map((item, index) => (
 *     <Fade key={item.id} {...createFadeConfig(300, stagger.getDelay(index))}>
 *       <Box>{item.content}</Box>
 *     </Fade>
 *   ));
 * }
 */
export const useStaggerAnimation = (
  itemCount,
  baseDelay = STAGGER_CONFIG.baseDelay,
  maxDelay = STAGGER_CONFIG.maxDelay
) => {
  const reducedMotion = useReducedMotion();

  // Calcular delay para un índice específico
  const getDelay = useCallback(
    (index) => {
      if (reducedMotion) return 0;
      return calculateStaggerDelay(index, baseDelay, maxDelay);
    },
    [reducedMotion, baseDelay, maxDelay]
  );

  // Obtener estilo CSS completo para un elemento
  const getStyle = useCallback(
    (index) => {
      const delay = getDelay(index);
      return {
        transitionDelay: `${delay}ms`,
        transitionDuration: `${getAccessibleDuration(STAGGER_CONFIG.duration)}ms`,
        transitionTimingFunction: EASINGS.easeOut,
      };
    },
    [getDelay]
  );

  // Calcular tiempo total de la animación
  const totalDuration = useMemo(() => {
    if (reducedMotion) return 0;
    const lastDelay = getDelay(Math.max(0, itemCount - 1));
    return lastDelay + STAGGER_CONFIG.duration;
  }, [itemCount, getDelay, reducedMotion]);

  // Estado para saber si la animación completa finalizó
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (itemCount === 0 || reducedMotion) {
      setIsComplete(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsComplete(true);
    }, totalDuration);

    return () => clearTimeout(timer);
  }, [totalDuration, itemCount, reducedMotion]);

  return {
    getDelay,
    getStyle,
    isComplete,
    totalDuration,
  };
};

// ==================== HOOK: useFadeIn ====================

/**
 * Hook simplificado para fade-in de componentes
 * Maneja automáticamente el estado de visibilidad
 *
 * @param {number} delay - Delay antes de mostrar (default: 0)
 * @param {number} duration - Duración de la animación (default: 300ms)
 * @returns {Object} { show, fadeProps }
 *
 * @example
 * function MyComponent() {
 *   const { show, fadeProps } = useFadeIn(100);
 *
 *   return (
 *     <Fade {...fadeProps}>
 *       <Box>Content appears after 100ms</Box>
 *     </Fade>
 *   );
 * }
 */
export const useFadeIn = (delay = 0, duration = DURATIONS.medium) => {
  const [show, setShow] = useState(delay === 0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (delay === 0 || reducedMotion) {
      setShow(true);
      return;
    }

    const timer = setTimeout(() => {
      setShow(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, reducedMotion]);

  const fadeProps = useMemo(
    () => createFadeConfig(duration, 0),
    [duration]
  );

  return {
    show,
    fadeProps,
  };
};

// ==================== HOOK: useHoverAnimation ====================

/**
 * Hook para manejar animaciones hover de forma declarativa
 * Útil para animaciones complejas que requieren estado
 *
 * @param {Object} hoverStyle - Estilos a aplicar en hover
 * @param {Object} baseStyle - Estilos base
 * @returns {Object} { isHovered, handleMouseEnter, handleMouseLeave, style }
 *
 * @example
 * function Card() {
 *   const hover = useHoverAnimation(
 *     { transform: 'translateY(-4px)', boxShadow: '...' },
 *     { transform: 'translateY(0)', boxShadow: 'none' }
 *   );
 *
 *   return (
 *     <Box
 *       onMouseEnter={hover.handleMouseEnter}
 *       onMouseLeave={hover.handleMouseLeave}
 *       sx={hover.style}
 *     >
 *       Content
 *     </Box>
 *   );
 * }
 */
export const useHoverAnimation = (hoverStyle = {}, baseStyle = {}) => {
  const [isHovered, setIsHovered] = useState(false);
  const reducedMotion = useReducedMotion();

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const style = useMemo(() => {
    const currentStyle = isHovered ? { ...baseStyle, ...hoverStyle } : baseStyle;

    // Si reduced motion, no aplicar transformaciones
    if (reducedMotion) {
      const { transform, transition, ...rest } = currentStyle;
      return rest;
    }

    return currentStyle;
  }, [isHovered, hoverStyle, baseStyle, reducedMotion]);

  return {
    isHovered,
    handleMouseEnter,
    handleMouseLeave,
    style,
  };
};

// ==================== HOOK: useProgressAnimation ====================

/**
 * Hook para animar barras de progreso de forma suave
 * Transiciona el valor gradualmente en lugar de saltar
 *
 * @param {number} targetValue - Valor objetivo (0-100)
 * @param {number} duration - Duración de la transición (default: 500ms)
 * @returns {number} Valor animado actual
 *
 * @example
 * function ProgressBar({ progress }) {
 *   const animatedProgress = useProgressAnimation(progress, 500);
 *
 *   return (
 *     <LinearProgress
 *       variant="determinate"
 *       value={animatedProgress}
 *     />
 *   );
 * }
 */
export const useProgressAnimation = (targetValue, duration = DURATIONS.slower) => {
  const [currentValue, setCurrentValue] = useState(targetValue);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Si reduced motion, actualizar inmediatamente
    if (reducedMotion) {
      setCurrentValue(targetValue);
      return;
    }

    const startValue = currentValue;
    const difference = targetValue - startValue;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Usar easing easeOut para suavizar
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      const newValue = startValue + difference * easedProgress;
      setCurrentValue(newValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [targetValue, duration, reducedMotion]);

  return currentValue;
};

// ==================== HOOK: useCountAnimation ====================

/**
 * Hook para animar números (contadores)
 * Cuenta desde 0 hasta el valor target de forma suave
 *
 * @param {number} targetValue - Valor objetivo
 * @param {number} duration - Duración de la animación (default: 1000ms)
 * @returns {number} Valor animado actual
 *
 * @example
 * function Counter({ value }) {
 *   const animatedValue = useCountAnimation(value, 1000);
 *
 *   return (
 *     <Typography variant="h2">
 *       {Math.round(animatedValue)}
 *     </Typography>
 *   );
 * }
 */
export const useCountAnimation = (targetValue, duration = 1000) => {
  const [currentValue, setCurrentValue] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      setCurrentValue(targetValue);
      return;
    }

    const startTime = Date.now();
    const startValue = currentValue;
    const difference = targetValue - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing easeOut
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      const newValue = startValue + difference * easedProgress;
      setCurrentValue(newValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [targetValue, duration, reducedMotion]);

  return currentValue;
};

// ==================== HOOK: useScrollReveal ====================

/**
 * Hook para revelar elementos cuando entran en el viewport
 * Útil para animaciones on-scroll
 *
 * @param {Object} options - Opciones del IntersectionObserver
 * @returns {Object} { ref, isVisible }
 *
 * @example
 * function ScrollReveal() {
 *   const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });
 *
 *   return (
 *     <Box
 *       ref={ref}
 *       sx={{
 *         opacity: isVisible ? 1 : 0,
 *         transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
 *         transition: 'all 0.6s ease-out'
 *       }}
 *     >
 *       Content reveals on scroll
 *     </Box>
 *   );
 * }
 */
export const useScrollReveal = (options = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [node, setNode] = useState(null);
  const reducedMotion = useReducedMotion();

  // Callback ref para obtener el elemento DOM
  const ref = useCallback((element) => {
    setNode(element);
  }, []);

  useEffect(() => {
    if (!node || reducedMotion) {
      if (reducedMotion) setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Una vez visible, dejar de observar
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [node, options, reducedMotion]);

  return {
    ref,
    isVisible,
  };
};

// ==================== EXPORTS ====================

export default {
  useReducedMotion,
  useStaggerAnimation,
  useFadeIn,
  useHoverAnimation,
  useProgressAnimation,
  useCountAnimation,
  useScrollReveal,
};

/**
 * GUÍA DE USO DE HOOKS:
 *
 * 1. useReducedMotion:
 * - Detecta automáticamente preferencia del usuario
 * - Se actualiza en tiempo real si cambia
 * - Usar para deshabilitar animaciones condicionalmente
 *
 * 2. useStaggerAnimation:
 * - Perfect para listas de items
 * - Calcula delays automáticamente
 * - Incluye callback isComplete para saber cuándo terminó
 *
 * 3. useFadeIn:
 * - Simplifica fade-in básico
 * - Maneja el estado de visibilidad
 * - Compatible con Material UI Fade
 *
 * 4. useHoverAnimation:
 * - Para animaciones hover complejas
 * - Maneja estado hover internamente
 * - Respeta reduced motion automáticamente
 *
 * 5. useProgressAnimation:
 * - Suaviza cambios en barras de progreso
 * - Evita saltos bruscos
 * - Duración configurable
 *
 * 6. useCountAnimation:
 * - Anima números/contadores
 * - Cuenta desde 0 hasta valor target
 * - Ideal para estadísticas
 *
 * 7. useScrollReveal:
 * - Revela elementos al hacer scroll
 * - Usa IntersectionObserver (performante)
 * - Se desactiva después de revelar
 *
 * PERFORMANCE:
 * - Todos los hooks están optimizados con useMemo y useCallback
 * - Respetan automáticamente prefers-reduced-motion
 * - Usan requestAnimationFrame para animaciones suaves
 * - Cleanup apropiado en useEffect para evitar memory leaks
 */
