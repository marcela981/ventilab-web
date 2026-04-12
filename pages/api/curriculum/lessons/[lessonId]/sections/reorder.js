/**
 * POST /api/curriculum/lessons/[lessonId]/sections/reorder
 * Registra el reordenamiento de secciones.
 * Body: { moduleId, from: number, to: number }
 *
 * Requiere rol TEACHER o superior.
 */
import { requireTeacher } from '@/lib/apiAuth';
import { resolveModule, resolveLesson, logChange } from '@/lib/curriculumResolver';
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  let user;
  try {
    ({ user } = await requireTeacher(req, res));
  } catch {
    return;
  }

  const { lessonId } = req.query;
  const { moduleId, from, to } = req.body ?? {};

  if (!moduleId?.trim()) return res.status(400).json({ error: 'moduleId es requerido' });
  if (typeof from !== 'number' || typeof to !== 'number') {
    return res.status(400).json({ error: 'from y to deben ser números' });
  }

  try {
    const module = await resolveModule(moduleId, user.id);
    const lesson = await resolveLesson(lessonId, module.id, user.id);

    await logChange({
      entityType: 'Lesson',
      entityId:   lesson.id,
      action:     'reorder',
      changedBy:  user.id,
      diff:       { sectionOrder: { from, to } },
      metadata:   { lessonJsonId: lessonId, moduleJsonId: moduleId, editorName: user.name },
    });

    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { lastModifiedBy: user.id, lastModifiedAt: new Date() },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[POST /api/curriculum/lessons/:id/sections/reorder]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
