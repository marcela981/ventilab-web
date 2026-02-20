/**
 * Lazy Media Components Module
 * 
 * Este módulo exporta versiones lazy-loaded (carga diferida) de todos los
 * componentes multimedia para mejorar el rendimiento inicial de la aplicación.
 * 
 * Los componentes se cargan solo cuando son necesarios, reduciendo el bundle
 * inicial y mejorando los tiempos de carga.
 */

import dynamic from 'next/dynamic';
import { Skeleton } from '@mui/material';
import MediaSkeleton from './MediaSkeleton';

/**
 * Skeleton de carga por defecto para componentes lazy
 */
const DefaultLoadingSkeleton = () => (
  <MediaSkeleton variant="default" />
);

/**
 * VideoPlayer - Carga diferida del reproductor de video
 */
export const LazyVideoPlayer = dynamic(
  () => import('./VideoPlayer'),
  {
    ssr: false,
    loading: () => <MediaSkeleton variant="video" />,
  }
);

/**
 * ZoomableImage - Carga diferida del componente de imagen con zoom
 */
export const LazyZoomableImage = dynamic(
  () => import('./ZoomableImage'),
  {
    ssr: false,
    loading: () => <MediaSkeleton variant="image" />,
  }
);

/**
 * ZoomableSVG - Carga diferida del componente SVG con pan/zoom
 */
export const LazyZoomableSVG = dynamic(
  () => import('./ZoomableSVG'),
  {
    ssr: false,
    loading: () => <MediaSkeleton variant="svg" />,
  }
);

/**
 * WaveformVisualization - Carga diferida de visualización de formas de onda
 */
export const LazyWaveformVisualization = dynamic(
  () => import('./WaveformVisualization'),
  {
    ssr: false,
    loading: () => <MediaSkeleton variant="default" height={300} />,
  }
);

/**
 * InteractiveQuiz - Carga diferida del quiz interactivo
 */
export const LazyInteractiveQuiz = dynamic(
  () => import('./InteractiveQuiz'),
  {
    ssr: false,
    loading: () => <DefaultLoadingSkeleton />,
  }
);

/**
 * InteractiveChecklist - Carga diferida de la checklist interactiva
 */
export const LazyInteractiveChecklist = dynamic(
  () => import('./InteractiveChecklist'),
  {
    ssr: false,
    loading: () => <DefaultLoadingSkeleton />,
  }
);

/**
 * MarkdownRenderer - Carga diferida del renderizador de Markdown
 */
export const LazyMarkdownRenderer = dynamic(
  () => import('./MarkdownRenderer'),
  {
    ssr: true, // Markdown puede renderizarse en servidor
    loading: () => (
      <Skeleton variant="rectangular" width="100%" height={200} animation="wave" />
    ),
  }
);

/**
 * Helper para crear componentes lazy personalizados
 * 
 * @param {Function} importFn - Función que retorna el import del componente
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.ssr - Si debe renderizarse en servidor (default: false)
 * @param {React.Component} options.loading - Componente de carga (default: MediaSkeleton)
 * @returns {React.Component} Componente lazy
 */
export const createLazyMediaComponent = (importFn, options = {}) => {
  const { ssr = false, loading = DefaultLoadingSkeleton } = options;
  
  return dynamic(importFn, {
    ssr,
    loading,
  });
};

export default {
  LazyVideoPlayer,
  LazyZoomableImage,
  LazyZoomableSVG,
  LazyWaveformVisualization,
  LazyInteractiveQuiz,
  LazyInteractiveChecklist,
  LazyMarkdownRenderer,
  createLazyMediaComponent,
};

