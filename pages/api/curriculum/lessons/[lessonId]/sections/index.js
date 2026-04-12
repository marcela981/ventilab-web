/**
 * GET /api/curriculum/lessons/[lessonId]/sections
 *   Devuelve el estado de los Steps en BD para una lección.
 *   Incluye tanto activos como inactivos (isActive=false = eliminados).
 *   Requiere rol TEACHER o superior.
 *
 * Query params: moduleId (requerido)
 */
import { requireTeacher } from '@/lib/apiAuth';
import { resolveModule, resolveLesson } from '@/lib/curriculumResolver';
import { prisma } from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  let user;
  try {
    ({ user } = await requireTeacher(req, res));
  } catch {
    return;
  }

  const { lessonId, moduleId } = req.query;

  if (!moduleId?.trim()) return res.status(400).json({ error: 'moduleId es requerido' });

  try {
    // Si la lección aún no existe en BD, devolver lista vacía (sin crear registro)
    const module = await prisma.module.findUnique({ where: { slug: moduleId.trim() } });
    if (!module) return res.status(200).json({ steps: [] });

    const lesson = await prisma.lesson.findFirst({
      where: { moduleId: module.id, slug: lessonId },
    });
    if (!lesson) return res.status(200).json({ steps: [] });

    const steps = await prisma.step.findMany({
      where: { lessonId: lesson.id },
      select: {
        id:              true,
        order:           true,
        sectionSourceId: true,
        title:           true,
        content:         true,
        contentType:     true,
        isActive:        true,
        lastModifiedAt:  true,
      },
      orderBy: { order: 'asc' },
    });

    return res.status(200).json({ steps });
  } catch (err) {
    console.error('[GET /api/curriculum/lessons/:id/sections]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
