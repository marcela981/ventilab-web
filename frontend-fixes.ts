// =============================================================================
// FIXES PARA FRONTEND - INTEGRAR GUARDADO DE PROGRESO
// =============================================================================

// =============================================================================
// FIX 1: Hook personalizado para manejar progreso de lección
// Crear archivo: src/hooks/useLessonProgressSave.js
// =============================================================================

import { useCallback, useRef, useEffect } from 'react';
import { updateLessonProgress } from '@/services/api/progressService';

/**
 * Hook para guardar progreso de lección automáticamente
 * 
 * @param {string} lessonId - ID de la lección
 * @param {string} moduleId - ID del módulo
 * @param {number} totalSections - Total de secciones en la lección
 * @param {Object} options - Opciones adicionales
 */
export function useLessonProgressSave(lessonId, moduleId, totalSections, options = {}) {
  const {
    debounceMs = 2000,
    onSaveSuccess = () => {},
    onSaveError = (error) => console.error('Error guardando progreso:', error),
  } = options;

  const timeSpentRef = useRef(0);
  const lastSaveRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Calcular tiempo transcurrido
  const getTimeSpent = useCallback(() => {
    const now = Date.now();
    const elapsed = Math.round((now - startTimeRef.current) / 1000);
    startTimeRef.current = now;
    return elapsed;
  }, []);

  // Función para guardar progreso
  const saveProgress = useCallback(async (currentSectionIndex, forceImmediate = false) => {
    if (!lessonId) return;

    // Cancelar save pendiente
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const doSave = async () => {
      try {
        const completionPercentage = Math.round(
          ((currentSectionIndex + 1) / totalSections) * 100
        );
        const timeSpent = getTimeSpent();

        const result = await updateLessonProgress({
          lessonId,
          moduleId,
          completionPercentage,
          timeSpentDelta: timeSpent,
          completed: completionPercentage >= 100,
        });

        lastSaveRef.current = {
          sectionIndex: currentSectionIndex,
          timestamp: Date.now(),
          completionPercentage,
        };

        onSaveSuccess(result);
        return result;
      } catch (error) {
        onSaveError(error);
        throw error;
      }
    };

    if (forceImmediate) {
      return doSave();
    }

    // Debounce save
    saveTimeoutRef.current = setTimeout(doSave, debounceMs);
  }, [lessonId, moduleId, totalSections, debounceMs, getTimeSpent, onSaveSuccess, onSaveError]);

  // Guardar inmediatamente (para cuando el usuario sale)
  const saveImmediately = useCallback(async (currentSectionIndex) => {
    return saveProgress(currentSectionIndex, true);
  }, [saveProgress]);

  return {
    saveProgress,
    saveImmediately,
    lastSave: lastSaveRef.current,
  };
}

export default useLessonProgressSave;

// =============================================================================
// FIX 2: Integrar en LessonViewer.jsx
// Agregar estas modificaciones al archivo existente
// =============================================================================

// PASO 1: Agregar imports al inicio del archivo
import { useLessonProgressSave } from '@/hooks/useLessonProgressSave';
import { useEffect } from 'react';

// PASO 2: Dentro del componente LessonViewer, agregar el hook
// Después de las declaraciones de estado existentes:

const LessonViewer = ({ moduleId, lessonId, onClose, onNavigateLesson, onMarkComplete }) => {
  // ... estados existentes ...
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  
  // NUEVO: Hook para guardar progreso
  const totalSections = lesson?.sections?.length || 1;
  const { saveProgress, saveImmediately } = useLessonProgressSave(
    lessonId,
    moduleId,
    totalSections,
    {
      debounceMs: 1500, // Esperar 1.5 segundos antes de guardar
      onSaveSuccess: (result) => {
        console.log('✅ Progreso guardado:', result);
      },
      onSaveError: (error) => {
        console.error('❌ Error guardando progreso:', error);
        // Opcionalmente mostrar un toast/snackbar al usuario
      },
    }
  );

  // PASO 3: Modificar handleNextSection para guardar progreso
  const handleNextSection = useCallback(() => {
    if (currentSectionIndex < totalSections - 1) {
      const newIndex = currentSectionIndex + 1;
      setCurrentSectionIndex(newIndex);
      
      // Guardar progreso (con debounce)
      saveProgress(newIndex);
    }
  }, [currentSectionIndex, totalSections, saveProgress]);

  // PASO 4: Modificar handlePrevSection
  const handlePrevSection = useCallback(() => {
    if (currentSectionIndex > 0) {
      const newIndex = currentSectionIndex - 1;
      setCurrentSectionIndex(newIndex);
      
      // También guardar cuando retrocede (por si el usuario navega atrás y sale)
      saveProgress(newIndex);
    }
  }, [currentSectionIndex, saveProgress]);

  // PASO 5: Guardar al cerrar la lección
  const handleClose = useCallback(async () => {
    // Guardar progreso inmediatamente antes de cerrar
    try {
      await saveImmediately(currentSectionIndex);
    } catch {
      // Continuar aunque falle el guardado
    }
    onClose?.();
  }, [currentSectionIndex, saveImmediately, onClose]);

  // PASO 6: Guardar al navegar a otra lección
  const handleLessonNavigation = useCallback(async (targetModuleId, targetLessonId) => {
    // Guardar progreso actual antes de navegar
    try {
      await saveImmediately(currentSectionIndex);
    } catch {
      // Continuar aunque falle
    }
    
    // Navegar
    if (onNavigateLesson) {
      onNavigateLesson(targetModuleId, targetLessonId);
    }
  }, [currentSectionIndex, saveImmediately, onNavigateLesson]);

  // PASO 7: Guardar cuando el usuario cierra la pestaña/sale
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Intentar guardar (no es garantizado que funcione)
      navigator.sendBeacon?.(
        `/api/progress/lesson/${lessonId}`,
        JSON.stringify({
          completionPercentage: Math.round(((currentSectionIndex + 1) / totalSections) * 100),
          timeSpentDelta: 60, // Estimado
        })
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [lessonId, currentSectionIndex, totalSections]);

  // ... resto del componente ...
};

// =============================================================================
// FIX 3: Cargar progreso inicial al entrar a la lección
// Agregar en LessonViewer.jsx
// =============================================================================

// Agregar import
import { getLessonProgress } from '@/services/api/progressService';

// Dentro del componente, agregar efecto para cargar progreso inicial:
useEffect(() => {
  const loadSavedProgress = async () => {
    if (!lessonId) return;
    
    try {
      const savedProgress = await getLessonProgress(lessonId);
      
      if (savedProgress && savedProgress.currentStep > 0) {
        // Calcular el índice de sección basado en el progreso guardado
        const savedIndex = Math.floor(
          (savedProgress.completionPercentage / 100) * totalSections
        );
        
        // Verificar que el índice es válido
        if (savedIndex > 0 && savedIndex < totalSections) {
          setCurrentSectionIndex(savedIndex);
          console.log(`📍 Reanudando en sección ${savedIndex + 1}/${totalSections}`);
        }
      }
    } catch (error) {
      console.warn('No se pudo cargar progreso guardado:', error);
      // No es crítico, simplemente empezar desde el inicio
    }
  };

  loadSavedProgress();
}, [lessonId, totalSections]);

// =============================================================================
// FIX 4: Actualizar progressService para manejar el nuevo formato
// Verificar que src/services/api/progressService.js tenga estas funciones:
// =============================================================================

/**
 * Obtener progreso de una lección
 */
export const getLessonProgress = async (lessonId) => {
  const response = await fetchJSONWithNoCache(
    `${API_BASE_URL}/progress/lesson/${lessonId}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );
  return response;
};

/**
 * Actualizar progreso de una lección
 */
export const updateLessonProgress = async (payload) => {
  const { lessonId, ...data } = payload;
  
  if (!lessonId) {
    throw new Error('lessonId es requerido');
  }

  const response = await fetchJSONWithNoCache(
    `${API_BASE_URL}/progress/lesson/${lessonId}`,
    {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );
  
  return response;
};

// =============================================================================
// FIX 5: Mostrar progreso en las cards de módulos (Curriculum Dashboard)
// Modificar el componente que muestra las cards de módulos
// =============================================================================

// En el componente donde muestras los módulos (ej: CurriculumDashboard.jsx),
// agregar llamada para obtener progreso:

import { useEffect, useState } from 'react';
import { getModuleProgress } from '@/services/api/progressService';

// Dentro del componente:
const [moduleProgressMap, setModuleProgressMap] = useState({});

useEffect(() => {
  const loadModuleProgress = async () => {
    const progressPromises = modules.map(async (module) => {
      try {
        const progress = await getModuleProgress(module.id);
        return { moduleId: module.id, progress };
      } catch {
        return { moduleId: module.id, progress: null };
      }
    });
    
    const results = await Promise.all(progressPromises);
    const progressMap = {};
    results.forEach(({ moduleId, progress }) => {
      progressMap[moduleId] = progress;
    });
    setModuleProgressMap(progressMap);
  };

  loadModuleProgress();
}, [modules]);

// En el JSX de cada card de módulo:
<ModuleCard>
  <CardContent>
    <Typography>{module.title}</Typography>
    
    {/* Barra de progreso */}
    {moduleProgressMap[module.id] && (
      <Box sx={{ mt: 2 }}>
        <LinearProgress 
          variant="determinate" 
          value={moduleProgressMap[module.id].completionPercentage || 0}
        />
        <Typography variant="caption" color="text.secondary">
          {moduleProgressMap[module.id].completedLessons || 0} / {moduleProgressMap[module.id].totalLessons || '?'} lecciones
        </Typography>
      </Box>
    )}
  </CardContent>
</ModuleCard>

// =============================================================================
// RESUMEN DE ARCHIVOS A MODIFICAR
// =============================================================================
/*
Frontend:
1. src/hooks/useLessonProgressSave.js - CREAR NUEVO
2. src/components/teaching/LessonViewer.jsx - MODIFICAR
3. src/services/api/progressService.js - VERIFICAR/ACTUALIZAR
4. src/components/curriculum/CurriculumDashboard.jsx (o similar) - MODIFICAR

Backend:
1. src/index.ts - trust proxy fix
2. src/middleware/rateLimiter.ts - validate option
3. src/routes/progress.ts - agregar rutas
4. src/controllers/progress.controller.ts - agregar handlers
5. src/services/progress.service.ts - corregir upsert
6. prisma/schema.prisma - agregar campos
*/