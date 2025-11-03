import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { curriculumData } from '../../../data/curriculumData';

/**
 * Hook personalizado para gestionar la obtención y el estado de una lección específica
 *
 * Este hook encapsula toda la lógica relacionada con la carga de datos de una lección,
 * incluyendo manejo de estados de carga, errores y recarga de datos. Busca la lección
 * dentro del módulo correspondiente en el curriculum y proporciona información completa
 * sobre la lección solicitada.
 *
 * @param {string} lessonId - ID único de la lección a obtener
 * @param {string} moduleId - ID del módulo que contiene la lección
 * @returns {Object} Objeto con el estado y funciones de la lección
 * @returns {Object|null} returns.data - Información completa de la lección (null si no existe o está cargando)
 * @returns {boolean} returns.isLoading - Indica si los datos están en proceso de carga
 * @returns {string|null} returns.error - Mensaje de error si la lección o módulo no existe (null si no hay error)
 * @returns {Function} returns.refetch - Función para recargar los datos de la lección
 *
 * @example
 * const { data, isLoading, error, refetch } = useLesson('gas-exchange', 'respiratory-physiology');
 *
 * if (isLoading) return <Loading />;
 * if (error) return <Error message={error} />;
 * if (data) return <LessonViewer lesson={data} />;
 */
const useLesson = (lessonId, moduleId) => {
  // Estado para almacenar los datos de la lección
  const [data, setData] = useState(null);

  // Estado para indicar si los datos están cargando
  const [isLoading, setIsLoading] = useState(true);

  // Estado para manejar errores
  const [error, setError] = useState(null);

  /**
   * Función para obtener los datos de la lección desde curriculumData
   *
   * Esta función realiza las siguientes validaciones:
   * 1. Verifica que curriculumData y modules existan
   * 2. Verifica que el módulo solicitado exista
   * 3. Verifica que el módulo tenga lecciones
   * 4. Busca la lección por ID dentro del array de lecciones
   *
   * @returns {Object|null} Datos de la lección con información del módulo padre, o null si no se encuentra
   */
  const fetchLessonData = useCallback(() => {
    // Iniciar estado de carga
    setIsLoading(true);
    setError(null);
    setData(null);

    // Validar que los parámetros existan
    if (!lessonId || !moduleId) {
      setError('Se requiere lessonId y moduleId para obtener la lección');
      setIsLoading(false);
      return;
    }

    // Validar que curriculumData exista y tenga módulos
    if (!curriculumData || !curriculumData.modules) {
      setError('No se pudo acceder a los datos del curriculum');
      setIsLoading(false);
      return;
    }

    // Buscar el módulo en curriculumData
    const module = curriculumData.modules[moduleId];

    // Validar que el módulo exista
    if (!module) {
      setError(`Módulo con ID "${moduleId}" no encontrado en el curriculum`);
      setIsLoading(false);
      return;
    }

    // Validar que el módulo tenga lecciones
    if (!module.lessons || !Array.isArray(module.lessons) || module.lessons.length === 0) {
      setError(`El módulo "${module.title || moduleId}" no contiene lecciones`);
      setIsLoading(false);
      return;
    }

    // Buscar la lección específica dentro del array de lecciones
    const lesson = module.lessons.find((lesson) => lesson.id === lessonId);

    // Validar que la lección exista
    if (!lesson) {
      setError(
        `Lección con ID "${lessonId}" no encontrada en el módulo "${module.title || moduleId}"`
      );
      setIsLoading(false);
      return;
    }

    // Construir el objeto de datos con información completa
    // Incluye tanto los datos de la lección como información del módulo padre
    const lessonData = {
      // Datos de la lección
      ...lesson,

      // Información del módulo padre
      moduleInfo: {
        id: module.id,
        title: module.title,
        level: module.level,
        order: module.order,
        duration: module.duration,
        prerequisites: module.prerequisites || [],
        learningObjectives: module.learningObjectives || [],
        bloomLevel: module.bloomLevel,
        difficulty: module.difficulty,
        estimatedTime: module.estimatedTime,
      },

      // Información de posición de la lección dentro del módulo
      lessonPosition: {
        current: module.lessons.findIndex((l) => l.id === lessonId) + 1,
        total: module.lessons.length,
      },

      // Referencias a lecciones anterior y siguiente
      navigation: {
        previousLesson:
          module.lessons[module.lessons.findIndex((l) => l.id === lessonId) - 1] || null,
        nextLesson:
          module.lessons[module.lessons.findIndex((l) => l.id === lessonId) + 1] || null,
      },
    };

    // Establecer los datos de la lección
    setData(lessonData);
    setIsLoading(false);
  }, [lessonId, moduleId]);

  /**
   * Función para recargar los datos de la lección
   *
   * Útil cuando se necesita refrescar los datos, por ejemplo:
   * - Después de actualizar el progreso
   * - Después de cambiar parámetros del usuario
   * - Para reintentar después de un error
   *
   * @example
   * const { refetch } = useLesson('gas-exchange', 'respiratory-physiology');
   * // Recargar datos después de completar la lección
   * await markLessonComplete();
   * refetch();
   */
  const refetch = useCallback(() => {
    fetchLessonData();
  }, [fetchLessonData]);

  // Effect para cargar los datos cuando cambien lessonId o moduleId
  useEffect(() => {
    fetchLessonData();
  }, [fetchLessonData]);

  // Retornar objeto con el estado y funciones
  return {
    data,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Validación de PropTypes para el hook useLesson
 *
 * Aunque los hooks no usan PropTypes directamente como los componentes,
 * esta documentación sirve como referencia de tipos para los desarrolladores.
 */
useLesson.propTypes = {
  lessonId: PropTypes.string.isRequired,
  moduleId: PropTypes.string.isRequired,
};

/**
 * Documentación de tipos del valor de retorno
 *
 * @typedef {Object} UseLessonReturn
 * @property {Object|null} data - Datos completos de la lección
 * @property {string} data.id - ID único de la lección
 * @property {string} data.type - Tipo de lección (video, interactive, reading, simulation, case-study)
 * @property {string} data.title - Título de la lección
 * @property {number} data.duration - Duración estimada en minutos
 * @property {Object} data.content - Contenido específico de la lección según su tipo
 * @property {Object} data.moduleInfo - Información del módulo padre
 * @property {string} data.moduleInfo.id - ID del módulo
 * @property {string} data.moduleInfo.title - Título del módulo
 * @property {string} data.moduleInfo.level - Nivel del módulo (beginner, intermediate, advanced)
 * @property {number} data.moduleInfo.order - Orden del módulo dentro del nivel
 * @property {number} data.moduleInfo.duration - Duración total del módulo en minutos
 * @property {string[]} data.moduleInfo.prerequisites - IDs de módulos prerequisitos
 * @property {string[]} data.moduleInfo.learningObjectives - Objetivos de aprendizaje
 * @property {string} data.moduleInfo.bloomLevel - Nivel de taxonomía de Bloom
 * @property {string} data.moduleInfo.difficulty - Nivel de dificultad
 * @property {string} data.moduleInfo.estimatedTime - Tiempo estimado en formato legible
 * @property {Object} data.lessonPosition - Posición de la lección en el módulo
 * @property {number} data.lessonPosition.current - Número de la lección actual (1-indexed)
 * @property {number} data.lessonPosition.total - Total de lecciones en el módulo
 * @property {Object} data.navigation - Enlaces de navegación
 * @property {Object|null} data.navigation.previousLesson - Datos de la lección anterior
 * @property {Object|null} data.navigation.nextLesson - Datos de la lección siguiente
 * @property {boolean} isLoading - Estado de carga
 * @property {string|null} error - Mensaje de error (null si no hay error)
 * @property {Function} refetch - Función para recargar los datos
 */

export default useLesson;
