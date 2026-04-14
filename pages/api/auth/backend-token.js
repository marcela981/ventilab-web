/*
 * Funcionalidad: Backend Token Generator
 * Descripción: Genera JWT para autenticación con Express backend
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const token = jwt.sign(
    {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  return res.status(200).json({ token });
}
