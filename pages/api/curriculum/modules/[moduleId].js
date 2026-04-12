/**
 * PATCH /api/curriculum/modules/[moduleId]
 * Actualiza campos de un módulo (título, descripción, orden).
 * [moduleId] es el JSON module ID (slug), no el cuid de BD.
 * Body: { title?, description?, order?, estimatedTime? }
 *
 * Requiere rol TEACHER o superior.
 */
import { requireTeacher } from '@/lib/apiAuth';
import { resolveModule, logChange } from '@/lib/curriculumResolver';
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

  const { moduleId } = req.query;
  const { title, description, order, estimatedTime } = req.body ?? {};

  if (!title && description === undefined && order === undefined && estimatedTime === undefined) {
    return res.status(400).json({ error: 'Se requiere al menos un campo a actualizar' });
  }

  try {
    const module = await resolveModule(moduleId, user.id);

    const diff = {};
    const data = { lastModifiedBy: user.id, lastModifiedAt: new Date() };

    if (title?.trim() && title.trim() !== module.title) {
      diff.title = { before: module.title, after: title.trim() };
      data.title = title.trim();
    }
    if (description !== undefined && description !== module.description) {
      diff.description = { before: module.description, after: description };
      data.description = description;
    }
    if (order !== undefined && order !== module.order) {
      diff.order = { before: module.order, after: order };
      data.order = order;
    }
    if (estimatedTime !== undefined && estimatedTime !== module.estimatedTime) {
      diff.estimatedTime = { before: module.estimatedTime, after: estimatedTime };
      data.estimatedTime = estimatedTime;
    }

    const updated = await prisma.module.update({ where: { id: module.id }, data });

    await logChange({
      entityType: 'Module',
      entityId:   module.id,
      action:     'update',
      changedBy:  user.id,
      diff,
      metadata:   { moduleJsonId: moduleId, editorName: user.name },
    });

    return res.status(200).json({ success: true, module: { id: updated.id, title: updated.title } });
  } catch (err) {
    console.error('[PATCH /api/curriculum/modules/:id]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
