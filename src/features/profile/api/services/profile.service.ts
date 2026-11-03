/*
* Funcionalidad: Profile service
* Descripción: Backend calls of the profile page through the typed api-client: the SWR key of `GET /api/users/me` (read through useApiQuery), `PATCH /api/users/me` with the changed name, `PUT /api/users/me/avatar` (multipart field `file`, sent with the http client like the media upload because the typed helpers only send JSON) and `DELETE /api/users/me/avatar`, and `POST /api/auth/change-password`, whose new token pair is stored with saveTokens (other tabs learn it through the storage event). Every call uses the slow timeout (database / storage / password hashing, cold start). Errors reject with ApiError. Depends on @shared/api-client and the profile DTOs. v1.1 (Bloque 4, W7): avatar and change-password calls.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { toApiError } from "@shared/api-client/api-error";
import { apiDelete, apiPatch, apiPost, unwrapResponse } from "@shared/api-client/api-request";
import { httpClient } from "@shared/api-client/http-client";
import { TIMEOUTS } from "@shared/api-client/timeouts";
import { saveTokens } from "@shared/api-client/token-storage";
import type { ChangePasswordRequestDTO, UpdateMeRequestDTO, UserDTO } from "../dtos/profile.dto";

export const MY_PROFILE_PATH = "/api/users/me";

export const MY_AVATAR_PATH = "/api/users/me/avatar";

export async function updateMyProfile(changes: UpdateMeRequestDTO): Promise<void> {
  await apiPatch(MY_PROFILE_PATH, { body: changes });
}

export async function uploadMyAvatar(image: Blob, fileName: string): Promise<UserDTO> {
  const form = new FormData();

  form.append("file", image, fileName);

  try {
    const response = await httpClient.put(MY_AVATAR_PATH, form, { timeout: TIMEOUTS.slow });

    return unwrapResponse<UserDTO>(response.data).data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function removeMyAvatar(): Promise<UserDTO> {
  const { data } = await apiDelete(MY_AVATAR_PATH, { timeout: "slow" });

  return data;
}

export async function changeMyPassword(request: ChangePasswordRequestDTO): Promise<void> {
  const { data } = await apiPost("/api/auth/change-password", { body: request, timeout: "slow" });

  saveTokens(data.accessToken, data.refreshToken);
}
