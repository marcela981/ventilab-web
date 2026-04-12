/**
 * PATCH  /api/curriculum/lessons/[lessonId]/sections/[sectionIndex]
 *   Guarda el contenido HTML editado de una sección como Step en BD.
 *   Body: { moduleId, htmlContent, title?, sectionSourceId? }
 *
 * DELETE /api/curriculum/lessons/[lessonId]/sections/[sectionIndex]
 *   Marca la sección como inactiva (soft-delete).
 *   Body: { moduleId, sectionSourceId? }
 *
 * Requiere rol TEACHER o superior.
 */
import { requireTeacher } from '@/lib/apiAuth';
import { resolveModule, resolveLesson, logChange } from '@/lib/curriculumResolver';
import { prisma } from '@/lib/prisma';

export default async function handler(req, res) {
  if (!['PATCH', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  let user;
  try {
    ({ user } = await requireTeacher(req, res));
  } catch {
    return;
  }

  const { lessonId, sectionIndex } = req.query;
  const idx = parseInt(sectionIndex, 10);

  if (isNaN(idx) || idx < 0) {
    return res.status(400).json({ error: 'sectionIndex inválido' });
  }

  const { moduleId, htmlContent, title, sectionSourceId } = req.body ?? {};

  if (!moduleId?.trim()) return res.status(400).json({ error: 'moduleId es requerido' });

  try {
    const module = await resolveModule(moduleId, user.id);
    const lesson = await resolveLesson(lessonId, module.id, user.id);

    // ── PATCH: guardar contenido ────────────────────────────────────────────
    if (req.method === 'PATCH') {
      if (!htmlContent) return res.status(400).json({ error: 'htmlContent es requerido' });

      // Buscar Step existente por lessonId + order (o sectionSourceId si se proveyó)
      const whereClause = sectionSourceId
        ? { lessonId: lesson.id, sectionSourceId }
        : { lessonId_order: { lessonId: lesson.id, order: idx } };

      // Intentar encontrar el step existente
      let existing = null;
      if (sectionSourceId) {
        existing = await prisma.step.findFirst({
          where: { lessonId: lesson.id, sectionSourceId },
        });
      } else {
        existing = await prisma.step.findFirst({
          where: { lessonId: lesson.id, order: idx },
        });
      }

      const before = existing?.content ?? null;

      let step;
      if (existing) {
        step = await prisma.step.update({
          where: { id: existing.id },
          data: {
            content:         htmlContent,
            title:           title ?? existing.title,
            lastModifiedBy:  user.id,
            lastModifiedAt:  new Date(),
          },
        });
      } else {
        step = await prisma.step.create({
          data: {
            lessonId:        lesson.id,
            order:           idx,
            title:           title ?? null,
            content:         htmlContent,
            contentType:     'rich-text',
            sectionSourceId: sectionSourceId ?? null,
            lastModifiedBy:  user.id,
            lastModifiedAt:  new Date(),
          },
        });
      }

      await logChange({
        entityType: 'Step',
        entityId:   step.id,
        action:     existing ? 'update' : 'create',
        changedBy:  user.id,
        diff: {
          content: { before: before?.slice(0, 300) ?? null, after: htmlContent.slice(0, 300) },
          ...(title && { title: { before: existing?.title ?? null, after: title } }),
        },
        metadata: {
          lessonJsonId:    lessonId,
          moduleJsonId:    moduleId,
          sectionIndex:    idx,
          sectionSourceId: sectionSourceId ?? null,
          editorName:      user.name,
        },
      });

      // Actualizar auditoría de la lección
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { lastModifiedBy: user.id, lastModifiedAt: new Date() },
      });

      return res.status(200).json({ success: true, stepId: step.id });
    }

    // ── DELETE: soft-delete ─────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const existing = sectionSourceId
        ? await prisma.step.findFirst({ where: { lessonId: lesson.id, sectionSourceId } })
        : await prisma.step.findFirst({ where: { lessonId: lesson.id, order: idx } });

      if (existing) {
        await prisma.step.update({
          where: { id: existing.id },
          data: { isActive: false, lastModifiedBy: user.id, lastModifiedAt: new Date() },
        });

        await logChange({
          entityType: 'Step',
          entityId:   existing.id,
          action:     'delete',
          changedBy:  user.id,
          metadata: {
            lessonJsonId: lessonId,
            moduleJsonId: moduleId,
            sectionIndex: idx,
            editorName:   user.name,
          },
        });
      }

      await logChange({
        entityType: 'Lesson',
        entityId:   lesson.id,
        action:     'delete',
        changedBy:  user.id,
        metadata: { lessonJsonId: lessonId, moduleJsonId: moduleId, sectionIndex: idx, editorName: user.name },
      });

      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { lastModifiedBy: user.id, lastModifiedAt: new Date() },
      });

      return res.status(200).json({ success: true });
    }
  } catch (err) {
    console.error(`[${req.method} /api/curriculum/lessons/:id/sections/:idx]`, err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
