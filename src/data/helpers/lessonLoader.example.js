/**
 * =============================================================================
 * LessonLoader - Ejemplos de Uso
 * =============================================================================
 *
 * Este archivo contiene ejemplos prácticos de cómo usar el módulo lessonLoader
 * en diferentes contextos: hooks de React, componentes, y funciones utilitarias.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  loadLessonById,
  getLessonPath,
  getCachedLesson,
  clearCache,
} from './lessonLoader';

// =============================================================================
// Ejemplo 1: Integración con useLesson Hook (Simplificado)
// =============================================================================

/**
 * Hook simplificado usando lessonLoader
 * Esta versión delega toda la lógica de carga al módulo helper
 */
export const useLessonSimple = (lessonId, moduleId) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadLesson = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // El módulo lessonLoader maneja:
      // - Verificación de caché
      // - Retry logic
      // - Validación
      // - Normalización
      const lesson = await loadLessonById(lessonId, moduleId);
      setData(lesson);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [lessonId, moduleId]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  return {
    data,
    isLoading,
    error,
    refetch: loadLesson,
  };
};

// =============================================================================
// Ejemplo 2: Uso en un Componente Funcional
// =============================================================================

/**
 * Componente que carga y muestra una lección
 */
export const LessonViewer = ({ lessonId, moduleId }) => {
  const { data: lesson, isLoading, error } = useLessonSimple(lessonId, moduleId);

  if (isLoading) {
    return <div>Cargando lección...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!lesson) {
    return <div>No se encontró la lección</div>;
  }

  return (
    <div>
      <h1>{lesson.title}</h1>
      <p><strong>Módulo:</strong> {lesson.moduleId}</p>
      <p><strong>Última actualización:</strong> {lesson.lastUpdated}</p>

      <section>
        <h2>Introducción</h2>
        <p>{lesson.content.introduction.text}</p>

        <h3>Objetivos de Aprendizaje</h3>
        <ul>
          {lesson.content.introduction.objectives.map((obj, idx) => (
            <li key={idx}>{obj}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Contenido Teórico</h2>
        {lesson.content.theory.sections.map((section, idx) => (
          <div key={idx}>
            <h3>{section.title}</h3>
            <p>{section.content}</p>
          </div>
        ))}
      </section>
    </div>
  );
};

// =============================================================================
// Ejemplo 3: Precarga de Lecciones
// =============================================================================

/**
 * Hook para precargar múltiples lecciones en segundo plano
 * Útil para mejorar la experiencia del usuario
 */
export const usePreloadLessons = (lessonIds, moduleId) => {
  const [preloadedCount, setPreloadedCount] = useState(0);

  useEffect(() => {
    const preloadLessons = async () => {
      let loaded = 0;

      for (const lessonId of lessonIds) {
        try {
          // Verificar si ya está en caché
          const cached = getCachedLesson(lessonId);
          if (cached) {
            loaded++;
            continue;
          }

          // Cargar en segundo plano
          await loadLessonById(lessonId, moduleId);
          loaded++;
          setPreloadedCount(loaded);
        } catch (error) {
          console.warn(`Failed to preload lesson ${lessonId}:`, error.message);
        }
      }

      console.log(`Precargadas ${loaded} de ${lessonIds.length} lecciones`);
    };

    preloadLessons();
  }, [lessonIds, moduleId]);

  return {
    preloadedCount,
    totalLessons: lessonIds.length,
    progress: (preloadedCount / lessonIds.length) * 100,
  };
};

/**
 * Componente que usa precarga
 */
export const ModuleViewer = ({ moduleId }) => {
  const lessonsToPreload = [
    'respiratory-anatomy',
    'respiratory-mechanics',
    'gas-exchange',
    'arterial-blood-gas',
  ];

  const { preloadedCount, totalLessons, progress } = usePreloadLessons(
    lessonsToPreload,
    moduleId
  );

  const [currentLesson, setCurrentLesson] = useState(lessonsToPreload[0]);

  return (
    <div>
      <div>
        Lecciones precargadas: {preloadedCount}/{totalLessons} ({progress.toFixed(0)}%)
      </div>

      <select
        value={currentLesson}
        onChange={(e) => setCurrentLesson(e.target.value)}
      >
        {lessonsToPreload.map((lessonId) => (
          <option key={lessonId} value={lessonId}>
            {lessonId}
          </option>
        ))}
      </select>

      <LessonViewer lessonId={currentLesson} moduleId={moduleId} />
    </div>
  );
};

// =============================================================================
// Ejemplo 4: Uso Directo (Sin React)
// =============================================================================

/**
 * Función utilitaria para obtener información de una lección
 * No requiere React - puede usarse en scripts, tests, o SSR
 */
export async function getLessonInfo(lessonId, moduleId) {
  try {
    const lesson = await loadLessonById(lessonId, moduleId);

    return {
      id: lesson.lessonId,
      title: lesson.title,
      module: lesson.moduleId,
      objectiveCount: lesson.content.introduction.objectives.length,
      sectionCount: lesson.content.theory.sections.length,
      hasAssessment: lesson.content.assessment.questions.length > 0,
      lastUpdated: lesson.lastUpdated,
    };
  } catch (error) {
    console.error(`Error obteniendo info de lección ${lessonId}:`, error);
    return null;
  }
}

/**
 * Función utilitaria para verificar rutas de lecciones
 */
export function checkLessonPaths() {
  const testCases = [
    ['respiratory-anatomy', 'module-01-fundamentals'],
    ['gas-exchange', 'module-01-fundamentals'],
    ['sdra-protocol', 'module-03-configuration'],
    ['peep-strategies', 'module-03-configuration'],
  ];

  console.log('Verificando rutas de lecciones:');
  testCases.forEach(([lessonId, moduleId]) => {
    const path = getLessonPath(lessonId, moduleId);
    console.log(`${lessonId} -> ${path}`);
  });
}

// =============================================================================
// Ejemplo 5: Gestión de Caché Avanzada
// =============================================================================

/**
 * Hook para gestionar el caché de lecciones
 */
export const useLessonCacheManager = () => {
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleClearCache = useCallback(() => {
    clearCache();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  }, []);

  return {
    clearCache: handleClearCache,
    cacheCleared,
  };
};

/**
 * Componente de administración de caché
 */
export const CacheManager = () => {
  const { clearCache, cacheCleared } = useLessonCacheManager();

  return (
    <div>
      <button onClick={clearCache}>
        Limpiar Caché de Lecciones
      </button>
      {cacheCleared && (
        <div style={{ color: 'green' }}>
          ✓ Caché limpiado exitosamente
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Ejemplo 6: Uso en Next.js (SSR/SSG)
// =============================================================================

/**
 * Ejemplo de uso en getStaticProps (Next.js SSG)
 */
export async function getStaticPropsExample({ params }) {
  const { lessonId, moduleId } = params;

  try {
    const lesson = await loadLessonById(lessonId, moduleId);

    return {
      props: {
        lesson,
      },
      revalidate: 3600, // Revalidar cada hora
    };
  } catch (error) {
    return {
      notFound: true,
    };
  }
}

/**
 * Ejemplo de uso en getServerSideProps (Next.js SSR)
 */
export async function getServerSidePropsExample({ params }) {
  const { lessonId, moduleId } = params;

  try {
    const lesson = await loadLessonById(lessonId, moduleId);

    return {
      props: {
        lesson,
      },
    };
  } catch (error) {
    return {
      notFound: true,
    };
  }
}

// =============================================================================
// Ejemplo 7: Manejo de Errores Avanzado
// =============================================================================

/**
 * Hook con manejo de errores mejorado
 */
export const useLessonWithErrorHandling = (lessonId, moduleId) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadLesson = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const lesson = await loadLessonById(lessonId, moduleId);
      setData(lesson);
      setRetryCount(0); // Reset en éxito
    } catch (err) {
      setError({
        message: err.message,
        type: err.message.includes('404') ? 'NOT_FOUND' :
              err.message.includes('HTTP') ? 'NETWORK' :
              err.message.includes('JSON') ? 'PARSE' :
              'UNKNOWN',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [lessonId, moduleId]);

  const retry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
    loadLesson();
  }, [loadLesson]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  return {
    data,
    isLoading,
    error,
    retry,
    retryCount,
  };
};

/**
 * Componente con manejo de errores visual
 */
export const LessonViewerWithErrors = ({ lessonId, moduleId }) => {
  const { data, isLoading, error, retry, retryCount } =
    useLessonWithErrorHandling(lessonId, moduleId);

  if (isLoading) {
    return <div>Cargando lección...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', border: '1px solid red' }}>
        <h3>Error al cargar la lección</h3>
        <p><strong>Tipo:</strong> {error.type}</p>
        <p><strong>Mensaje:</strong> {error.message}</p>
        <p><strong>Timestamp:</strong> {error.timestamp}</p>
        <p><strong>Intentos:</strong> {retryCount}</p>
        <button onClick={retry}>Reintentar</button>
      </div>
    );
  }

  return <LessonViewer lessonId={lessonId} moduleId={moduleId} />;
};

// =============================================================================
// Exportaciones para uso en ejemplos
// =============================================================================

export default {
  useLessonSimple,
  LessonViewer,
  usePreloadLessons,
  ModuleViewer,
  getLessonInfo,
  checkLessonPaths,
  useLessonCacheManager,
  CacheManager,
  useLessonWithErrorHandling,
  LessonViewerWithErrors,
};
