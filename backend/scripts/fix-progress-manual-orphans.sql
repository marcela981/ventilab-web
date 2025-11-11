-- =============================================================================
-- Script de Reparación Manual: Lesson Progress con progressId NULL
-- =============================================================================
-- Este script maneja el caso especial de lesson_progress que tienen
-- progressId = NULL (huérfanos completos que no se pueden reparar automáticamente)
--
-- IMPORTANTE: Este script requiere que identifiques manualmente el userId
-- para cada lesson_progress huérfano. Úsalo solo si el script automático
-- no puede reparar todos los casos.
--
-- Uso:
--   1. Ejecuta audit-progress-orphans.sql para identificar huérfanos
--   2. Para cada huérfano con progressId NULL, identifica el userId correcto
--   3. Ejecuta este script con los valores correctos
-- =============================================================================

-- Ejemplo: Si tienes un lesson_progress con id 'xxx' y progressId NULL,
-- y sabes que pertenece al userId 'yyy' y moduleId 'zzz':

-- Paso 1: Crear o obtener learning_progress para (userId, moduleId)
-- INSERT INTO learning_progress (id, "userId", "moduleId", "completedAt", "timeSpent", score, "createdAt", "updatedAt")
-- VALUES (gen_random_uuid(), 'USER_ID_AQUI', 'MODULE_ID_AQUI', NULL, 0, 0, NOW(), NOW())
-- ON CONFLICT ("userId", "moduleId") DO UPDATE SET "updatedAt" = NOW()
-- RETURNING id;

-- Paso 2: Actualizar lesson_progress con el progressId correcto
-- UPDATE lesson_progress
-- SET "progressId" = 'LEARNING_PROGRESS_ID_AQUI'
-- WHERE id = 'LESSON_PROGRESS_ID_AQUI';

-- =============================================================================
-- QUERY PARA ENCONTRAR HUÉRFANOS QUE NECESITAN REPARACIÓN MANUAL
-- =============================================================================

-- Listar todos los lesson_progress con progressId NULL
-- Necesitarás identificar manualmente el userId para cada uno
SELECT 
  lsp.id AS lesson_progress_id,
  lsp."lessonId",
  l."moduleId",
  l.title AS lesson_title,
  lsp.completed,
  lsp.progress,
  lsp."createdAt",
  lsp."updatedAt",
  'Necesita userId manual' AS accion_requerida
FROM lesson_progress lsp
JOIN lessons l ON l.id = lsp."lessonId"
WHERE lsp."progressId" IS NULL
ORDER BY lsp."updatedAt" DESC;

-- =============================================================================
-- NOTAS:
-- - Si tienes logs o historial que muestre qué usuario creó estos registros,
--   puedes usarlos para identificar el userId correcto
-- - Si no puedes identificar el userId, considera eliminar estos registros huérfanos:
--   DELETE FROM lesson_progress WHERE "progressId" IS NULL;
-- - Después de reparar, ejecuta audit-progress-orphans.sql nuevamente para verificar
-- =============================================================================

