/*
* Funcionalidad: Page blocks service
* Descripción: Backend calls of the page editor through the typed api-client. PAGE_EDITOR_PATH (GET /api/pages/{id}, the page with its active blocks, every status for staff) is the useApiQuery key; PAGE_EDITOR_INVALIDATES are the reads refreshed after a save (the page itself, shared with the learning viewer; the module print view GET /api/modules/{id}/full; the lesson page summaries of the tree). savePageBlocks applies a save plan in a fixed order: DELETE /api/pages/{id}/blocks/{blockId}, PUT the changed fields of each updated block, POST each new block (the backend appends it; onCreated reports its new id at once so a later failure does not create it twice) and, only when the order changed, PUT /api/pages/{id}/blocks/reorder with every block id. Stops at the first failure (rejects with ApiError). The generated schema types block content as an empty object, so the bodies are cast. Default (fast) timeout. Depends on @shared/api-client, the content editor DTOs and the page draft entity.
* Versión: 1.0 (C4)
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

export async function savePageBlocks(pageId: string, plan: PageSavePlan, onCreated: (key: string, id: string) => void): Promise<void> {
  const params = { id: pageId };
  const created = new Map<string, string>();

  for (const blockId of plan.deletes) {
    await apiDelete("/api/pages/{id}/blocks/{blockId}", { params: { id: pageId, blockId } });
  }

  for (const { id, body } of plan.updates) {
    await apiPut("/api/pages/{id}/blocks/{blockId}", { params: { id: pageId, blockId: id }, body: body as UpdatePageBlockDTO });
  }

  for (const { key, body } of plan.creates) {
    const { data } = await apiPost("/api/pages/{id}/blocks", { params, body: body as CreatePageBlockDTO });

    created.set(key, data.id);
    onCreated(key, data.id);
  }

  if (plan.order) {
    const ids = plan.order.map((ref) => ref.id ?? created.get(ref.key) ?? "");

    await apiPut("/api/pages/{id}/blocks/reorder", { params, body: { ids } });
  }
}
