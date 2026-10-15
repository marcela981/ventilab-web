/*
* Funcionalidad: useNodePrerequisites
* Descripción: Current prerequisites of a level or module for the prerequisites editor: GET /api/levels/{id}/prerequisites for a level, GET /api/modules/{id} (module detail) for a module; only the query of the node kind runs. `current` is null until loaded, then the prerequisites as {id, title}; `error` and `reload` report and retry the read. Focus revalidation is off (CONTENT_QUERY_CONFIG) so the open dialog is not disturbed. Depends on SWR through @shared/api-client, the prerequisites service and entity.
* Versión: 1.0 (C3)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo } from "react";
import type { ApiError } from "@shared/api-client/api-error";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { LEVEL_PREREQUISITES_PATH, MODULE_DETAIL_PATH } from "../../api/services/content-prerequisites.service";
import type { DependencyRef, PrerequisiteKind } from "../entities/content-prerequisites";
import { CONTENT_QUERY_CONFIG } from "./use-content-tree";

export type UseNodePrerequisitesResult = {
  current: DependencyRef[] | null
  error: ApiError | null
  reload: () => Promise<void>
};

export function useNodePrerequisites(kind: PrerequisiteKind, id: string): UseNodePrerequisitesResult {
  const params = { id };
  const levelQuery = useApiQuery(kind === "level" ? LEVEL_PREREQUISITES_PATH : null, { params }, CONTENT_QUERY_CONFIG);
  const moduleQuery = useApiQuery(kind === "module" ? MODULE_DETAIL_PATH : null, { params }, CONTENT_QUERY_CONFIG);
  const current = useMemo<DependencyRef[] | null>(() => {
    if (kind === "level") {
      return levelQuery.data ? levelQuery.data.data.prerequisites.map((item) => ({ id: item.levelId, title: item.levelTitle })) : null;
    }

    return moduleQuery.data ? moduleQuery.data.data.prerequisites.map((item) => ({ id: item.id, title: item.title })) : null;
  }, [kind, levelQuery.data, moduleQuery.data]);
  const { mutate: mutateLevel } = levelQuery;
  const { mutate: mutateModule } = moduleQuery;

  const reload = useCallback(async() => {
    await (kind === "level" ? mutateLevel() : mutateModule());
  }, [kind, mutateLevel, mutateModule]);

  return { current, error: (kind === "level" ? levelQuery.error : moduleQuery.error) ?? null, reload };
}
