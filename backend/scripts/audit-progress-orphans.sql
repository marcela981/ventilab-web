-- =============================================================================
-- Script de Auditoría: Detectar lesson_progress huérfanos
-- =============================================================================
-- Este script identifica problemas de migración donde lesson_progress
-- tiene progressId NULL o apunta a un learning_progress inexistente
--
-- Uso:
--   psql -U your_user -d your_database -f audit-progress-orphans.sql
--   O ejecutar las queries individualmente en tu cliente SQL
-- =============================================================================

-- 1) Verificar learning_progress del usuario
-- Reemplaza 'USER_ID_AQUI' con el ID del usuario afectado
SELECT 
  id, 
  "userId", 
  "moduleId", 
  "completedAt", 
  "timeSpent", 
  score,
  "createdAt",
  "updatedAt"
FROM learning_progress
WHERE "userId" = 'USER_ID_AQUI'
ORDER BY "createdAt" DESC;

-- 2) Detectar lesson_progress huérfanos (sin progressId válido)
-- Esto identifica registros que apuntan a un learning_progress que no existe
SELECT 
  lsp.id AS lesson_progress_id,
  lsp."progressId",
  lsp."lessonId",
  lsp.completed,
  lsp.progress,
  lsp."updatedAt"
FROM lesson_progress lsp
LEFT JOIN learning_progress lp ON lp.id = lsp."progressId"
WHERE lp.id IS NULL
ORDER BY lsp."updatedAt" DESC;

-- 3) Detectar lesson_progress huérfanos con información del módulo
-- Muestra qué módulo le corresponde a cada lesson huérfana
-- Nota: Si progressId es NULL o inválido, no podemos obtener userId directamente
SELECT 
  lsp.id AS lesson_progress_id,
  lp."userId",  -- Obtener desde learning_progress si existe
  l.id AS lesson_id,
  l."moduleId",
  l.title AS lesson_title,
  lsp."progressId" AS current_progress_id,
  lsp.completed,
  lsp.progress,
  lsp."updatedAt",
  CASE 
    WHEN lsp."progressId" IS NULL THEN 'progressId es NULL'
    WHEN lp.id IS NULL THEN 'progressId apunta a learning_progress inexistente'
    ELSE 'OK'
  END AS estado
FROM lesson_progress lsp
JOIN lessons l ON l.id = lsp."lessonId"
LEFT JOIN learning_progress lp ON lp.id = lsp."progressId"
WHERE lsp."progressId" IS NULL OR lp.id IS NULL
ORDER BY lsp."updatedAt" DESC;

-- 4) Contar huérfanos por usuario (solo los que tienen progressId pero apunta a registro inexistente)
SELECT 
  lp_old."userId",
  COUNT(*) AS orphan_count
FROM lesson_progress lsp
LEFT JOIN learning_progress lp ON lp.id = lsp."progressId"
-- Intentar obtener userId desde el progressId (aunque el registro ya no exista)
LEFT JOIN learning_progress lp_old ON lp_old.id = lsp."progressId"
WHERE (lsp."progressId" IS NULL OR lp.id IS NULL)
  AND lp_old."userId" IS NOT NULL  -- Solo contar si podemos obtener userId
GROUP BY lp_old."userId"
ORDER BY orphan_count DESC;

-- 4b) Contar todos los huérfanos (incluyendo los que no tienen userId recuperable)
SELECT 
  COUNT(*) AS total_orphans,
  COUNT(CASE WHEN lsp."progressId" IS NULL THEN 1 END) AS null_progress_id,
  COUNT(CASE WHEN lsp."progressId" IS NOT NULL AND lp.id IS NULL THEN 1 END) AS invalid_progress_id
FROM lesson_progress lsp
LEFT JOIN learning_progress lp ON lp.id = lsp."progressId"
WHERE lsp."progressId" IS NULL OR lp.id IS NULL;

-- 5) Verificar si hay learning_progress faltantes por (userId, moduleId)
-- Solo funciona para lesson_progress que tienen progressId válido
-- Los huérfanos completos (progressId NULL) no se pueden reparar automáticamente
SELECT DISTINCT
  lp."userId",
  l."moduleId",
  COUNT(DISTINCT lsp."lessonId") AS lessons_with_progress,
  COUNT(DISTINCT lsp.id) AS lesson_progress_count
FROM lesson_progress lsp
JOIN lessons l ON l.id = lsp."lessonId"
JOIN learning_progress lp ON lp.id = lsp."progressId"  -- Solo los que tienen progressId válido
LEFT JOIN learning_progress lp_module
  ON lp_module."userId" = lp."userId" AND lp_module."moduleId" = l."moduleId"
WHERE lp_module.id IS NULL  -- No existe learning_progress para este módulo
GROUP BY lp."userId", l."moduleId"
ORDER BY lessons_with_progress DESC;

