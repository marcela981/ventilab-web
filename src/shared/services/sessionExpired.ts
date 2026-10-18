/*
 * Funcionalidad: Manejador central de sesión expirada
 * Descripción: Punto único de logout ante 401/token expirado o inválido, para
 *              cualquier rol. Limpia la sesión completa (JWT y user en
 *              localStorage), notifica por authEvents
 *              ('auth:logout' → SocketContext cierra el socket) y redirige a
 *              /auth/login?expired=1. Idempotente: múltiples 401 simultáneos
 *              producen un solo logout y un solo redirect, sin loops si ya se
 *              está en la página de login.
 *              v1.1 (T8): para todo llamador, removeAuthToken borra AMBOS tokens del
 *              backend (access + refresh) vía clearTokens() de
 *              @shared/api-client/token-storage, que notifica a la sesión nueva
 *              (fin de sesión y cierre del socket realtime) una sola vez.
 *              v1.2 (B3.4, D4): sin NextAuth; ya no hay signOut de su cookie,
 *              la redirección es inmediata.
 * Versión: 1.2
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

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

  // 1. Limpiar credenciales locales: ambos tokens del backend vía clearTokens()
  //    (notifica a la sesión nueva y al RealtimeProvider) + ventilab_user_data.
  removeAuthToken();

  // 2. Avisar al resto de la app (SocketContext desconecta el socket).
  authEvents.emit('auth:logout', { reason });

  if (window.location.pathname.startsWith(LOGIN_ROUTE)) {
    // Ya estamos en login: no redirigir (evita loop). Se libera el flag después de
    // las llamadas simultáneas (microtarea) para poder manejar una expiración futura
    // tras un nuevo login.
    queueMicrotask(() => {
      inProgress = false;
    });
    return;
  }

  // 3. Redirigir al login (NextAuth ya no existe: no hay cookie que invalidar).
  window.location.href = `${LOGIN_ROUTE}?expired=1`;
}

export default handleSessionExpired;
