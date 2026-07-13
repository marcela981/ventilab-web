/*
 * Funcionalidad: API client de Perfil — nombre, foto (data-URL) y contraseña
 * Descripción: Cliente HTTP del módulo profile sobre httpSlow (60 s, resiliente
 *              al cold start de Neon). Rutas reales del backend, montadas en
 *              /api/users (httpSlow ya incluye /api en la base URL):
 *                PUT  /users/me                  → nombre y foto (image acepta
 *                                                  data-URL base64; ''/null la borra)
 *                POST /users/me/change-password  → contraseña
 *                GET  /users/me                  → perfil actual
 *              El backend responde SIN envelope { success, data } — aquí se
 *              normaliza a { success, data, error } que es el contrato que ya
 *              consumen los formularios de perfil.
 * Versión: 2.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { httpSlow } from '@/shared/services/api/http';

export type ProfileUser = Record<string, unknown>;

export interface ProfileApiResult<T> {
  success: boolean;
  data: T | null;
  error: { message: string } | null;
}

// El interceptor de httpSlow ya normaliza err.message con el `message` del
// backend (4xx/5xx) o con un mensaje de red legible (ApiUnavailableError).
function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export const profileApi = {
  /** GET /users/me → { user } */
  getProfile: async (): Promise<ProfileApiResult<{ user: ProfileUser }>> => {
    try {
      const { data } = await httpSlow.get<{ user: ProfileUser }>('/users/me');
      return { success: true, data: { user: data.user }, error: null };
    } catch (error: unknown) {
      return {
        success: false,
        data: null,
        error: { message: toErrorMessage(error, 'Error al obtener el perfil') },
      };
    }
  },

  /**
   * PUT /users/me → { message, user }
   * updates.image: data-URL base64 para subir foto; null o '' para borrarla.
   */
  updateProfile: async (
    updates: { name?: string; image?: string | null },
  ): Promise<ProfileApiResult<{ user: ProfileUser }>> => {
    try {
      const { data } = await httpSlow.put<{ message: string; user: ProfileUser }>(
        '/users/me',
        updates,
      );
      return { success: true, data: { user: data.user }, error: null };
    } catch (error: unknown) {
      return {
        success: false,
        data: null,
        error: { message: toErrorMessage(error, 'Error al actualizar el perfil') },
      };
    }
  },

  /**
   * POST /users/me/change-password → { message, note }
   * La confirmación de contraseña se valida solo en el formulario; el backend
   * recibe únicamente currentPassword y newPassword.
   */
  changePassword: async (
    currentPassword: string,
    newPassword: string,
  ): Promise<ProfileApiResult<{ message: string; note?: string }>> => {
    try {
      const { data } = await httpSlow.post<{ message: string; note?: string }>(
        '/users/me/change-password',
        { currentPassword, newPassword },
      );
      return { success: true, data, error: null };
    } catch (error: unknown) {
      return {
        success: false,
        data: null,
        error: { message: toErrorMessage(error, 'Error al cambiar la contraseña') },
      };
    }
  },
};
