/*
* Funcionalidad: Content prerequisites service
* Descripción: Backend calls of the prerequisites editor (levels and modules) through the typed api-client. Read keys used with useApiQuery: GET /api/levels/{id}/prerequisites (current prerequisites and dependent levels) and GET /api/modules/{id} (module detail: current prerequisites and dependent modules; modules have no prerequisites GET). setNodePrerequisites saves the whole selection with the replace endpoints (PUT /api/levels/{id}/prerequisites {prerequisiteLevelIds}, PUT /api/modules/{id}/prerequisites {prerequisiteIds}; an empty list removes every prerequisite), the simplest option the API supports (no add/remove diff). fetchDependents reads who requires a level or module, used only to explain a 409 circular dependency (the backend answers just the code, with data null). Default (fast) timeout; errors reject with ApiError. Depends on @shared/api-client and the content prerequisites entity.
* Versión: 1.0 (C3)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiGet, apiPut } from "@shared/api-client/api-request";
import type { DependencyRef, PrerequisiteKind } from "../../application/entities/content-prerequisites";

export const LEVEL_PREREQUISITES_PATH = "/api/levels/{id}/prerequisites";
export const MODULE_DETAIL_PATH = "/api/modules/{id}";

export async function setNodePrerequisites(kind: PrerequisiteKind, id: string, prerequisiteIds: readonly string[]): Promise<void> {
  const params = { id };

  if (kind === "level") {
    await apiPut(LEVEL_PREREQUISITES_PATH, { params, body: { prerequisiteLevelIds: [...prerequisiteIds] } });
  } else {
    await apiPut("/api/modules/{id}/prerequisites", { params, body: { prerequisiteIds: [...prerequisiteIds] } });
  }
}

export async function fetchDependents(kind: PrerequisiteKind, id: string): Promise<DependencyRef[]> {
  const params = { id };

  if (kind === "level") {
    const { data } = await apiGet(LEVEL_PREREQUISITES_PATH, { params });

    return data.dependentLevels.map((level) => ({ id: level.levelId, title: level.levelTitle }));
  }

  const { data } = await apiGet(MODULE_DETAIL_PATH, { params });

  return data.dependentModules.map((module) => ({ id: module.id, title: module.title }));
}
