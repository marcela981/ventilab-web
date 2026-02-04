/**
 * Ejemplos de uso de VideoPlayer con React.lazy
 * 
 * Este archivo muestra cómo importar y usar VideoPlayer con lazy loading
 * desde LessonViewer u otros componentes.
 */

import React, { Suspense, lazy } from 'react';
import { Box } from '@mui/material';
import MediaSkeleton from '../content/MediaSkeleton';

// ============================================================================
// Ejemplo 1: Importación lazy básica
// ============================================================================

const LazyVideoPlayer = lazy(() => import('./VideoPlayer'));

/**
 * Ejemplo de uso básico con lazy loading
 */
export const BasicLazyExample = () => {
  return (
    <Suspense fallback={<MediaSkeleton variant="video" />}>
      <LazyVideoPlayer
        url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        title="Ejemplo de video de YouTube"
        provider="youtube"
      />
    </Suspense>
  );
};

// ============================================================================
// Ejemplo 2: Uso en LessonViewer con todas las props
// ============================================================================

/**
 * Ejemplo completo con todas las características
 */
export const FullFeaturedExample = () => {
  const handleError = (error, url) => {
    console.error('Error al cargar video:', error, url);
    // Aquí puedes enviar el error a un servicio de logging
  };

  return (
    <Suspense fallback={<MediaSkeleton variant="video" />}>
      <LazyVideoPlayer
        url="https://vimeo.com/148751763"
        title="Introducción a la Ventilación Mecánica"
        provider="vimeo"
        start={30} // Inicia en el segundo 30
        poster="/posters/ventilation-intro.jpg"
        onError={handleError}
      />
    </Suspense>
  );
};

// ============================================================================
// Ejemplo 3: Múltiples videos con detección automática
// ============================================================================

/**
 * Ejemplo con múltiples videos usando provider="auto"
 */
export const MultipleVideosExample = () => {
  const videos = [
    {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Video de YouTube',
      provider: 'auto',
    },
    {
      url: 'https://vimeo.com/148751763',
      title: 'Video de Vimeo',
      provider: 'auto',
    },
  ];

  return (
    <Box>
      {videos.map((video, index) => (
        <Box key={index} sx={{ mb: 3 }}>
          <Suspense fallback={<MediaSkeleton variant="video" />}>
            <LazyVideoPlayer {...video} />
          </Suspense>
        </Box>
      ))}
    </Box>
  );
};

// ============================================================================
// Ejemplo 4: Integración en LessonViewer
// ============================================================================

/**
 * Cómo importar y usar en LessonViewer.jsx:
 * 
 * ```jsx
 * // Al inicio del archivo LessonViewer.jsx
 * import React, { Suspense, lazy } from 'react';
 * import MediaSkeleton from '../content/MediaSkeleton';
 * 
 * const LazyVideoPlayer = lazy(() => 
 *   import('./media/VideoPlayer')
 * );
 * 
 * // Dentro del componente, en la sección de renderizado:
 * <Suspense fallback={<MediaSkeleton variant="video" />}>
 *   <LazyVideoPlayer
 *     url={lessonData.videoUrl}
 *     title={lessonData.videoTitle}
 *     provider="auto"
 *     start={lessonData.videoStartTime}
 *     poster={lessonData.videoPoster}
 *     onError={(error, url) => {
 *       console.error('Error en video de lección:', error);
 *       // Manejar error según sea necesario
 *     }}
 *   />
 * </Suspense>
 * ```
 */

// ============================================================================
// URLs de prueba para desarrollo
// ============================================================================

/**
 * URLs de prueba para desarrollo y testing:
 * 
 * YouTube:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ (video corto)
 * - https://www.youtube.com/watch?v=jNQXAC9IVRw (video educativo)
 * 
 * Vimeo:
 * - https://vimeo.com/148751763 (video de ejemplo)
 * - https://vimeo.com/1084537 (video corto)
 * 
 * Uso en desarrollo:
 * ```jsx
 * <VideoPlayer
 *   url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 *   title="Video de prueba"
 *   provider="auto"
 * />
 * ```
 */

export default {
  BasicLazyExample,
  FullFeaturedExample,
  MultipleVideosExample,
};

