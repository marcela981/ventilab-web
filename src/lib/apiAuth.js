/**
 * Helpers para autenticación y autorización en API routes de Next.js.
 * Devuelve el usuario autenticado o lanza error HTTP.
 */
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isTeacherOrAbove } from '@/lib/roles';

/**
 * Valida que la request tenga sesión y que el usuario sea TEACHER o superior.
 * @returns {{ session, user }} — user incluye id, email, role, name
 * @throws Escribe la respuesta HTTP y lanza para cortar la ejecución
 */
export async function requireTeacher(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    res.status(401).json({ error: 'No autenticado' });
    throw new Error('UNAUTHORIZED');
  }

  if (!isTeacherOrAbove(session.user.role)) {
    res.status(403).json({ error: 'Se requiere rol de profesor o superior' });
    throw new Error('FORBIDDEN');
  }

  return { session, user: session.user };
}
