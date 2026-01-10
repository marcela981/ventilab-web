/**
 * Ejemplos de uso de InteractiveDiagram con React.lazy
 * 
 * Este archivo muestra cómo importar y usar InteractiveDiagram con lazy loading
 * desde LessonViewer u otros componentes.
 */

import React, { Suspense, lazy } from 'react';
import { Skeleton } from '@mui/material';
import MediaSkeleton from '../content/MediaSkeleton';

// ============================================================================
// Ejemplo 1: Importación lazy básica con URL
// ============================================================================

const LazyInteractiveDiagram = lazy(() => import('./InteractiveDiagram'));

/**
 * Ejemplo de uso básico con lazy loading
 */
export const BasicLazyExample = () => {
  return (
    <Suspense fallback={<MediaSkeleton variant="svg" />}>
      <LazyInteractiveDiagram
        svgSrc="/diagrams/ventilator-circuit.svg"
        height={600}
        width="100%"
        aria-label="Diagrama interactivo del circuito del ventilador mecánico"
      />
    </Suspense>
  );
};

// ============================================================================
// Ejemplo 2: Curva presión-volumen con SVG inline
// ============================================================================

/**
 * Ejemplo completo: Curva presión-volumen
 * El SVG puede tener nodos con data-tip o <title> para tooltips
 */
export const PressureVolumeCurveExample = () => {
  const svgString = `
    <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <title>Curva presión-volumen</title>
      </defs>
      <g>
        <path
          d="M 100 500 Q 200 400 300 300 T 500 200 T 700 150"
          stroke="#1976d2"
          stroke-width="3"
          fill="none"
          data-tip="Curva presión-volumen característica"
        />
        <circle
          cx="300"
          cy="300"
          r="8"
          fill="#d32f2f"
          data-tip="Punto de inflexión inferior (LIP)"
        />
        <circle
          cx="500"
          cy="200"
          r="8"
          fill="#d32f2f"
          data-tip="Punto de inflexión superior (UIP)"
        />
        <text x="50" y="550" font-size="14" fill="#666">
          Volumen (ml)
        </text>
        <text x="750" y="580" font-size="14" fill="#666">
          Presión (cmH2O)
        </text>
      </g>
    </svg>
  `;

  return (
    <Suspense fallback={<MediaSkeleton variant="svg" />}>
      <LazyInteractiveDiagram
        svgString={svgString}
        height={600}
        width="100%"
        initialScale={1.2}
        onLoad={() => console.log('Curva presión-volumen cargada')}
        onError={(error) => console.error('Error:', error)}
        aria-label="Curva presión-volumen interactiva del sistema respiratorio"
      />
    </Suspense>
  );
};

// ============================================================================
// Ejemplo 3: Diagrama del sistema respiratorio con callbacks
// ============================================================================

/**
 * Ejemplo con callbacks y manejo de errores
 */
export const RespiratorySystemExample = () => {
  const handleLoad = () => {
    console.log('Diagrama del sistema respiratorio cargado exitosamente');
  };

  const handleError = (error) => {
    console.error('Error al cargar diagrama:', error);
    // Aquí puedes enviar el error a un servicio de logging
  };

  return (
    <Suspense fallback={<MediaSkeleton variant="svg" />}>
      <LazyInteractiveDiagram
        svgSrc="/diagrams/respiratory-system.svg"
        height={700}
        width={900}
        initialScale={1}
        onLoad={handleLoad}
        onError={handleError}
        aria-label="Diagrama interactivo del sistema respiratorio humano"
      />
    </Suspense>
  );
};

// ============================================================================
// Ejemplo 4: SVG con tooltips usando data-tip
// ============================================================================

/**
 * Ejemplo de SVG con tooltips usando atributo data-tip
 * 
 * El SVG debe tener elementos con data-tip="Texto del tooltip"
 * o elementos <title> dentro de los nodos SVG
 */
export const TooltipExample = () => {
  const svgWithTooltips = `
    <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      <g>
        <rect
          x="100"
          y="100"
          width="200"
          height="150"
          fill="#4caf50"
          data-tip="Ventrículo izquierdo: Bombea sangre oxigenada al cuerpo"
        />
        <rect
          x="400"
          y="100"
          width="200"
          height="150"
          fill="#f44336"
          data-tip="Ventrículo derecho: Bombea sangre desoxigenada a los pulmones"
        />
        <circle
          cx="200"
          cy="350"
          r="50"
          fill="#2196f3"
        >
          <title>Atrio izquierdo: Recibe sangre oxigenada de los pulmones</title>
        </circle>
        <circle
          cx="500"
          cy="350"
          r="50"
          fill="#ff9800"
        >
          <title>Atrio derecho: Recibe sangre desoxigenada del cuerpo</title>
        </circle>
      </g>
    </svg>
  `;

  return (
    <Suspense fallback={<MediaSkeleton variant="svg" />}>
      <LazyInteractiveDiagram
        svgString={svgWithTooltips}
        height={600}
        aria-label="Diagrama del corazón con tooltips interactivos"
      />
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
 * import MediaSkeleton from '../content/MediaSkeleton';
 * 
 * const LazyInteractiveDiagram = lazy(() => 
 *   import('./media/InteractiveDiagram')
 * );
 * 
 * // Dentro del componente, en la sección de renderizado:
 * <Suspense fallback={<MediaSkeleton variant="svg" />}>
 *   <LazyInteractiveDiagram
 *     svgSrc={lessonData.diagramUrl}
 *     height={600}
 *     width="100%"
 *     initialScale={1}
 *     onLoad={() => {
 *       console.log('Diagrama de lección cargado');
 *     }}
 *     onError={(error) => {
 *       console.error('Error en diagrama de lección:', error);
 *     }}
 *     aria-label={`Diagrama interactivo: ${lessonData.title}`}
 *   />
 * </Suspense>
 * ```
 */

// ============================================================================
// Ejemplo 6: Prioridad svgString sobre svgSrc
// ============================================================================

/**
 * Si se proporcionan ambos svgSrc y svgString, se prioriza svgString:
 * 
 * ```jsx
 * <InteractiveDiagram
 *   svgSrc="/diagrams/default.svg"  // Se ignora
 *   svgString="<svg>...</svg>"      // Se usa este
 *   height={500}
 * />
 * ```
 */

export default {
  BasicLazyExample,
  PressureVolumeCurveExample,
  RespiratorySystemExample,
  TooltipExample,
};

