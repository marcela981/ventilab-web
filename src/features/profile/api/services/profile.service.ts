/*
* Funcionalidad: Profile service
* Descripción: Backend calls of the profile page through the typed api-client: the SWR key of `GET /api/users/me` (read through useApiQuery) and `PATCH /api/users/me` with the changed fields (answers `data: null`). Both routes use the slow timeout (SLOW_ROUTES, database / cold start). Errors reject with ApiError. Depends on @shared/api-client and the profile DTOs.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiPatch } from "@shared/api-client/api-request";
import type { UpdateMeRequestDTO } from "../dtos/profile.dto";

export const MY_PROFILE_PATH = "/api/users/me";

export async function updateMyProfile(changes: UpdateMeRequestDTO): Promise<void> {
  await apiPatch(MY_PROFILE_PATH, { body: changes });
}
