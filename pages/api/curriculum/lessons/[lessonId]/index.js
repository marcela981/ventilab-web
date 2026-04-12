/**
 * PATCH /api/curriculum/lessons/[lessonId]
 * Actualiza el título de una lección.
 * Requiere rol TEACHER o superior.
 *
 * Body: { moduleId: string, title: string }
 */
import { requireTeacher } from '@/lib/apiAuth';
import { resolveModule, resolveLesson, logChange } from '@/lib/curriculumResolver';
import { prisma } from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  let user;
  try {
    ({ user } = await requireTeacher(req, res));
  } catch {
    return;
  }

  const { lessonId } = req.query;
  const { moduleId, title } = req.body ?? {};

  if (!moduleId?.trim()) return res.status(400).json({ error: 'moduleId es requerido' });
  if (!title?.trim())    return res.status(400).json({ error: 'title es requerido' });

  try {
    const module  = await resolveModule(moduleId, user.id);
    const lesson  = await resolveLesson(lessonId, module.id, user.id);

    const before = lesson.title;
    const updated = await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        title:          title.trim(),
        lastModifiedBy: user.id,
        lastModifiedAt: new Date(),
      },
    });

    await logChange({
      entityType: 'Lesson',
      entityId:   lesson.id,
      action:     'update',
      changedBy:  user.id,
      diff:       { title: { before, after: title.trim() } },
      metadata:   { lessonJsonId: lessonId, moduleJsonId: moduleId, editorName: user.name },
    });

    return res.status(200).json({ success: true, lesson: { id: updated.id, title: updated.title } });
  } catch (err) {
    console.error('[PATCH /api/curriculum/lessons/:id]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
