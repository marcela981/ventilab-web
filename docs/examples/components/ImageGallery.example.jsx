/**
 * Ejemplos de uso de ImageGallery con React.lazy
 * 
 * Este archivo muestra cómo importar y usar ImageGallery con lazy loading
 * desde LessonViewer u otros componentes.
 */

import React, { Suspense, lazy } from 'react';
import { Box, Skeleton } from '@mui/material';

// ============================================================================
// Ejemplo 1: Importación lazy básica
// ============================================================================

const LazyImageGallery = lazy(() => import('./ImageGallery'));

/**
 * Ejemplo de uso básico con lazy loading
 */
export const BasicLazyExample = () => {
  const images = [
    {
      src: '/images/diagram-1.jpg',
      alt: 'Diagrama del sistema respiratorio',
      caption: 'Figura 1: Estructura básica del sistema respiratorio humano',
    },
    {
      src: '/images/diagram-2.jpg',
      alt: 'Ventilador mecánico',
      caption: 'Figura 2: Componentes principales del ventilador',
    },
  ];

  return (
    <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={400} />}>
      <LazyImageGallery images={images} />
    </Suspense>
  );
};

// ============================================================================
// Ejemplo 2: Uso completo con manejo de errores
// ============================================================================

/**
 * Ejemplo completo con todas las características
 */
export const FullFeaturedExample = () => {
  const images = [
    {
      src: '/images/anatomy-lungs.jpg',
      alt: 'Anatomía de los pulmones',
      caption: 'Figura 1: Vista anatómica detallada de los pulmones humanos mostrando los lóbulos y segmentos principales',
    },
    {
      src: '/images/ventilator-circuit.jpg',
      alt: 'Circuito del ventilador',
      caption: 'Figura 2: Diagrama del circuito respiratorio del ventilador mecánico',
    },
    {
      src: '/images/pressure-volume.jpg',
      alt: 'Curva presión-volumen',
      caption: 'Figura 3: Curva característica presión-volumen en pacientes con SDRA',
    },
    {
      src: '/images/waveforms.jpg',
      alt: 'Formas de onda ventilatorias',
      caption: 'Figura 4: Formas de onda típicas durante la ventilación mecánica',
    },
  ];

  const handleImageError = (index, src) => {
    console.error(`Error al cargar imagen ${index + 1}:`, src);
    // Aquí puedes enviar el error a un servicio de logging
  };

  return (
    <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={400} />}>
      <LazyImageGallery
        images={images}
        onImageError={handleImageError}
      />
    </Suspense>
  );
};

// ============================================================================
// Ejemplo 3: Columnas personalizadas
// ============================================================================

/**
 * Ejemplo con número de columnas fijo
 */
export const CustomColumnsExample = () => {
  const images = [
    { src: '/images/img1.jpg', alt: 'Imagen 1', caption: 'Descripción 1' },
    { src: '/images/img2.jpg', alt: 'Imagen 2', caption: 'Descripción 2' },
    { src: '/images/img3.jpg', alt: 'Imagen 3', caption: 'Descripción 3' },
  ];

  return (
    <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={400} />}>
      <LazyImageGallery
        images={images}
        columns={3} // Fijo a 3 columnas en todos los breakpoints
      />
    </Suspense>
  );
};

// ============================================================================
// Ejemplo 4: Imágenes sin captions
// ============================================================================

/**
 * Ejemplo con imágenes que no tienen captions
 */
export const NoCaptionsExample = () => {
  const images = [
    { src: '/images/img1.jpg', alt: 'Imagen descriptiva 1' },
    { src: '/images/img2.jpg', alt: 'Imagen descriptiva 2' },
    { src: '/images/img3.jpg' }, // Sin alt, se generará automáticamente
  ];

  return (
    <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={400} />}>
      <LazyImageGallery images={images} />
    </Suspense>
  );
};

// ============================================================================
// Ejemplo 5: Integración en LessonViewer
// ============================================================================

/**
 * Cómo importar y usar en LessonViewer.jsx:
 * 
 * ```jsx
 * // Al inicio del archivo LessonViewer.jsx
 * import React, { Suspense, lazy } from 'react';
 * import { Skeleton } from '@mui/material';
 * 
 * const LazyImageGallery = lazy(() => 
 *   import('./media/ImageGallery')
 * );
 * 
 * // Dentro del componente, en la sección de renderizado:
 * const lessonImages = lessonData.images || [];
 * 
 * <Suspense fallback={<Skeleton variant="rectangular" width="100%" height={400} />}>
 *   <LazyImageGallery
 *     images={lessonImages}
 *     onImageError={(index, src) => {
 *       console.error('Error en imagen de lección:', index, src);
 *       // Manejar error según sea necesario
 *     }}
 *   />
 * </Suspense>
 * ```
 */

// ============================================================================
// Ejemplo 6: Estado vacío
// ============================================================================

/**
 * El componente maneja automáticamente el estado vacío:
 * 
 * ```jsx
 * // Si images es [] o undefined, se muestra automáticamente:
 * <ImageGallery images={[]} />
 * // Muestra: "No hay imágenes disponibles"
 * ```
 */

export default {
  BasicLazyExample,
  FullFeaturedExample,
  CustomColumnsExample,
  NoCaptionsExample,
};

