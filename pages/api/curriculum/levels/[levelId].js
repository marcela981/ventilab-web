/**
 * PATCH /api/curriculum/levels/[levelId]
 * Actualiza campos de un nivel (título, descripción, orden).
 * Body: { title?, description?, order? }
 *
 * Requiere rol ADMIN o superior.
 */
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isAdminOrAbove } from '@/lib/roles';
import { logChange } from '@/lib/curriculumResolver';
import { prisma } from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' });
  if (!isAdminOrAbove(session.user.role)) return res.status(403).json({ error: 'Se requiere rol de administrador' });

  const { levelId } = req.query;
  const { title, description, order } = req.body ?? {};

  if (!title?.trim() && description === undefined && order === undefined) {
    return res.status(400).json({ error: 'Se requiere al menos un campo a actualizar' });
  }

  try {
    const level = await prisma.level.findUnique({ where: { id: levelId } });
    if (!level) return res.status(404).json({ error: 'Nivel no encontrado' });

    const diff = {};
    const data = { lastModifiedBy: session.user.id, lastModifiedAt: new Date() };

    if (title?.trim() && title.trim() !== level.title) {
      diff.title = { before: level.title, after: title.trim() };
      data.title = title.trim();
    }
    if (description !== undefined && description !== level.description) {
      diff.description = { before: level.description, after: description };
      data.description = description;
    }
    if (order !== undefined && order !== level.order) {
      diff.order = { before: level.order, after: order };
      data.order = order;
    }

    const updated = await prisma.level.update({ where: { id: levelId }, data });

    await logChange({
      entityType: 'Level',
      entityId:   levelId,
      action:     'update',
      changedBy:  session.user.id,
      diff,
      metadata:   { editorName: session.user.name },
    });

    return res.status(200).json({ success: true, level: { id: updated.id, title: updated.title } });
  } catch (err) {
    console.error('[PATCH /api/curriculum/levels/:id]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
