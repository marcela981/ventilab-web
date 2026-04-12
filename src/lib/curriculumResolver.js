/**
 * Helpers para encontrar (o crear) registros de Module/Lesson en la BD
 * a partir de los IDs que usan los archivos JSON del currículo.
 *
 * Estrategia:
 *   - Module se identifica por su `slug` (= JSON moduleId).
 *   - Lesson se identifica por (moduleId DB, slug = JSON lessonId).
 *   - Si no existen, se crean ("upsert") la primera vez que se editan.
 */
import { prisma } from '@/lib/prisma';

/**
 * Resuelve (o crea) el registro Module dado su JSON id.
 * @param {string} moduleJsonId  — e.g. "module-01-fundamentals"
 * @param {string} editorUserId — ID del usuario que edita (para auditoría)
 */
export async function resolveModule(moduleJsonId, editorUserId) {
  return prisma.module.upsert({
    where: { slug: moduleJsonId },
    update: {
      lastModifiedBy: editorUserId,
      lastModifiedAt: new Date(),
    },
    create: {
      slug: moduleJsonId,
      title: moduleJsonId,        // título placeholder hasta sincronización
      lastModifiedBy: editorUserId,
      lastModifiedAt: new Date(),
    },
  });
}

/**
 * Resuelve (o crea) el registro Lesson dado su JSON id y el módulo DB.
 * @param {string} lessonJsonId  — e.g. "module-01-inversion-fisiologica"
 * @param {string} moduleDbId    — ID cuid del Module en BD
 * @param {string} editorUserId
 */
export async function resolveLesson(lessonJsonId, moduleDbId, editorUserId) {
  return prisma.lesson.upsert({
    where: {
      moduleId_slug: { moduleId: moduleDbId, slug: lessonJsonId },
    },
    update: {
      lastModifiedBy: editorUserId,
      lastModifiedAt: new Date(),
    },
    create: {
      moduleId: moduleDbId,
      slug:     lessonJsonId,
      title:    lessonJsonId,  // placeholder
      lastModifiedBy: editorUserId,
      lastModifiedAt: new Date(),
    },
  });
}

/**
 * Registra un cambio en ChangeLog.
 */
export async function logChange({ entityType, entityId, action, changedBy, diff, metadata }) {
  return prisma.changeLog.create({
    data: {
      entityType,
      entityId,
      action,
      changedBy,
      diff:     diff     ?? undefined,
      metadata: metadata ?? undefined,
    },
  });
}
