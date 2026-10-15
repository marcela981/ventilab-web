/*
* Funcionalidad: Page blocks service
* Descripción: Backend calls of the page editor through the typed api-client. PAGE_EDITOR_PATH (GET /api/pages/{id}, the page with its active blocks, every status for staff) is the useApiQuery key; PAGE_EDITOR_INVALIDATES are the reads refreshed after a save (the page itself, shared with the learning viewer; the module print view GET /api/modules/{id}/full; the lesson page summaries of the tree). savePageBlocks applies a save plan in a fixed order: DELETE /api/pages/{id}/blocks/{blockId}, PUT the changed fields of each updated block, POST each new block (the backend appends it) and, only when the order changed, PUT /api/pages/{id}/blocks/reorder with every block id. Each confirmed operation is reported at once to the SaveProgressListener (deleted id, updated id, created key and id, reordered ids) so the caller can exclude it from a retry even when a later request fails. Stops at the first failure (rejects with ApiError). A reorder entry whose id cannot be resolved (not loaded, not created in this save) fails fast with PageReorderError before any request instead of sending an empty id. The generated schema types block content as an empty object, so the bodies are cast. Default (fast) timeout. Depends on @shared/api-client, the content editor DTOs and the page draft entity. v1.1 (C4 review): progress listener for every completed operation (not only creates) and PageReorderError instead of an empty reorder id.
* Versión: 1.1 (C4)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiDelete, apiPost, apiPut } from "@shared/api-client/api-request";
import type { PageSavePlan } from "../../application/entities/page-draft.entity";
import type { CreatePageBlockDTO, UpdatePageBlockDTO } from "../dtos/content-editor.dto";
import { LESSON_PAGES_PATH } from "./content-editor.service";

export const PAGE_EDITOR_PATH = "/api/pages/{id}";
const MODULE_FULL_PATH = "/api/modules/{id}/full";

export const PAGE_EDITOR_INVALIDATES = [PAGE_EDITOR_PATH, MODULE_FULL_PATH, LESSON_PAGES_PATH] as const;

// A reorder entry whose block id is unknown (neither loaded nor created in this save).
export class PageReorderError extends Error {
  readonly key: string;

  constructor(key: string) {
    super(`No se pudo ordenar el bloque ${key}: no tiene id en el servidor.`);
    this.name = "PageReorderError";
    this.key = key;
  }
}

// Reports each operation the moment the backend confirms it.
export type SaveProgressListener = {
  onDeleted: (id: string) => void
  onUpdated: (id: string) => void
  onCreated: (key: string, id: string) => void
  onReordered: (ids: readonly string[]) => void
};

function reorderIds(plan: PageSavePlan, created: ReadonlyMap<string, string>): string[] | null {
  if (!plan.order) {
    return null;
  }

  return plan.order.map((ref) => {
    const id = ref.id ?? created.get(ref.key);

    if (id === undefined) {
      throw new PageReorderError(ref.key);
    }

    return id;
  });
}

export async function savePageBlocks(pageId: string, plan: PageSavePlan, progress: SaveProgressListener): Promise<void> {
  const params = { id: pageId };
  const created = new Map<string, string>();
  const creatable = new Set(plan.creates.map((create) => create.key));

  // Fail before any request when the final order can never be resolved.
  if (plan.order) {
    const unresolved = plan.order.find((ref) => ref.id === null && !creatable.has(ref.key));

    if (unresolved) {
      throw new PageReorderError(unresolved.key);
    }
  }

  for (const blockId of plan.deletes) {
    await apiDelete("/api/pages/{id}/blocks/{blockId}", { params: { id: pageId, blockId } });
    progress.onDeleted(blockId);
  }

  for (const { id, body } of plan.updates) {
    await apiPut("/api/pages/{id}/blocks/{blockId}", { params: { id: pageId, blockId: id }, body: body as UpdatePageBlockDTO });
    progress.onUpdated(id);
  }

  for (const { key, body } of plan.creates) {
    const { data } = await apiPost("/api/pages/{id}/blocks", { params, body: body as CreatePageBlockDTO });

    created.set(key, data.id);
    progress.onCreated(key, data.id);
  }

  const ids = reorderIds(plan, created);

  if (ids) {
    await apiPut("/api/pages/{id}/blocks/reorder", { params, body: { ids } });
    progress.onReordered(ids);
  }
}
