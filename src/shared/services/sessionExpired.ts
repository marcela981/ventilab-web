/*
 * Funcionalidad: Manejador central de sesión expirada
 * Descripción: Punto único de logout ante 401/token expirado o inválido, para
 *              cualquier rol. Limpia la sesión completa (JWT y user en
 *              localStorage, cookie de NextAuth y snapshot de usuario en
 *              memoria vía broadcast de useSession), notifica por authEvents
 *              ('auth:logout' → SocketContext cierra el socket) y redirige a
 *              /auth/login?expired=1. Idempotente: múltiples 401 simultáneos
 *              producen un solo logout y un solo redirect, sin loops si ya se
 *              está en la página de login.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { signOut } from 'next-auth/react';
import { removeAuthToken } from '@/shared/services/authService';
import { authEvents } from '@/shared/services/authEvents';

export const LOGIN_ROUTE = '/auth/login';

/** Idempotencia: true mientras un logout por expiración está en curso. */
let inProgress = false;

/**
 * Cierra la sesión limpiamente tras detectar un token expirado/inválido.
 * Seguro de llamar N veces (solo la primera actúa) y desde cualquier módulo
 * cliente (interceptores Axios, SocketContext, etc.). No-op en SSR.
 *
 * @param reason Motivo del cierre (telemetría/depuración), p. ej.
 *               'token_refresh_failed' | 'forbidden' | 'socket_auth_error'
 */
export function handleSessionExpired(reason: string = 'token_expired'): void {
  if (typeof window === 'undefined') return;
  if (inProgress) return;
  inProgress = true;

  // 1. Limpiar credenciales locales (ventilab_auth_token + ventilab_user_data).
  removeAuthToken();

  // 2. Avisar al resto de la app (SocketContext desconecta el socket).
  authEvents.emit('auth:logout', { reason });

  const onLoginPage = window.location.pathname.startsWith(LOGIN_ROUTE);

  // 3. Invalidar la cookie de NextAuth; el broadcast de signOut pone useSession
  //    en 'unauthenticated' y vacía el snapshot de usuario en memoria.
  //    Con timeout: si /api/auth/signout no responde, se redirige igual.
  const signOutSafe = Promise.race([
    signOut({ redirect: false }).catch(() => undefined),
    new Promise((resolve) => window.setTimeout(resolve, 3000)),
  ]);

  void signOutSafe.then(() => {
    if (onLoginPage) {
      // Ya estamos en login: no redirigir (evita loop). Se libera el flag para
      // poder manejar una expiración futura tras un nuevo login.
      inProgress = false;
      return;
    }
    window.location.href = `${LOGIN_ROUTE}?expired=1`;
  });
}

export default handleSessionExpired;
