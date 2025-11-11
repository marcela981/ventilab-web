-- =============================================================================
-- Script de Reparación: Backfill de learning_progress y relink de lesson_progress
-- =============================================================================
-- Este script:
-- 1. Crea learning_progress faltantes para (userId, moduleId) que tienen lesson_progress
-- 2. Religa lesson_progress.progressId al learning_progress correcto
--
-- IMPORTANTE: Ejecuta primero audit-progress-orphans.sql para verificar el problema
-- IMPORTANTE: Haz backup de tu base de datos antes de ejecutar este script
--
-- Uso:
--   psql -U your_user -d your_database -f fix-progress-orphans.sql
--   O ejecutar las queries individualmente en una transacción
-- =============================================================================

BEGIN;

-- Verificar que existe el unique constraint en (userId, moduleId)
-- Si no existe, créalo primero:
-- ALTER TABLE learning_progress ADD CONSTRAINT learning_progress_userId_moduleId_key 
--   UNIQUE ("userId", "moduleId");

-- Paso 1: Crear learning_progress faltantes por (userId, moduleId)
-- Solo funciona para lesson_progress que tienen progressId válido
-- Los huérfanos completos (progressId NULL) necesitan reparación manual
WITH needed AS (
  SELECT DISTINCT 
    lp."userId",  -- Obtener desde learning_progress existente
    l."moduleId"
  FROM lesson_progress lsp
  JOIN lessons l ON l.id = lsp."lessonId"
  JOIN learning_progress lp ON lp.id = lsp."progressId"  -- Solo los que tienen progressId válido
  LEFT JOIN learning_progress lp_module
    ON lp_module."userId" = lp."userId" AND lp_module."moduleId" = l."moduleId"
  WHERE lp_module.id IS NULL  -- No existe learning_progress para este módulo
),
ins AS (
  INSERT INTO learning_progress (
    id, 
    "userId", 
    "moduleId", 
    "completedAt", 
    "timeSpent", 
    score, 
    "createdAt", 
    "updatedAt"
  )
  SELECT 
    gen_random_uuid(), 
    n."userId", 
    n."moduleId", 
    NULL, 
    0, 
    0, 
    NOW(), 
    NOW()
  FROM needed n
  ON CONFLICT ("userId", "moduleId") DO NOTHING
  RETURNING id, "userId", "moduleId"
)
-- Paso 2: Religar lesson_progress → progressId correcto
-- Solo funciona para lesson_progress que tienen progressId válido pero apunta al módulo incorrecto
UPDATE lesson_progress lsp
SET "progressId" = lp_correct.id
FROM lessons l,
     learning_progress lp_current,
     learning_progress lp_correct
WHERE lsp."lessonId" = l.id
  AND lp_current.id = lsp."progressId"  -- progressId actual
  AND lp_correct."userId" = lp_current."userId" 
  AND lp_correct."moduleId" = l."moduleId"
  AND lsp."progressId" != lp_correct.id  -- Solo actualizar si el progressId es incorrecto
  AND lp_correct.id IS NOT NULL;

-- Verificar resultados
SELECT 
  'learning_progress creados' AS action,
  COUNT(*) AS count
FROM learning_progress lp
WHERE lp."createdAt" > NOW() - INTERVAL '1 minute';

SELECT 
  'lesson_progress actualizados' AS action,
  COUNT(*) AS count
FROM lesson_progress lsp
JOIN lessons l ON l.id = lsp."lessonId"
JOIN learning_progress lp_current ON lp_current.id = lsp."progressId"
JOIN learning_progress lp 
  ON lp."userId" = lp_current."userId" 
  AND lp."moduleId" = l."moduleId"
WHERE lsp."progressId" = lp.id
  AND lsp."updatedAt" > NOW() - INTERVAL '1 minute';

-- Verificar que no quedan huérfanos
SELECT 
  'lesson_progress huérfanos restantes' AS check_name,
  COUNT(*) AS count
FROM lesson_progress lsp
LEFT JOIN learning_progress lp ON lp.id = lsp."progressId"
WHERE lp.id IS NULL;

-- Si el count es 0, todo está bien. Si no, revisa los logs anteriores.

COMMIT;

-- =============================================================================
-- NOTAS:
-- - Si usas UUIDs diferentes a gen_random_uuid(), ajusta la función
-- - Si tienes un esquema diferente a "public", ajusta los nombres de tabla
-- - Después de ejecutar, corre: npx prisma generate
-- =============================================================================

