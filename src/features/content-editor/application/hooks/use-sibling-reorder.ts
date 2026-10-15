/*
* Funcionalidad: useSiblingReorder
* Descripción: Optimistic reorder of one sibling group of the editor tree. reorder(group, ids, from, to) shows the new order at once (an id-order override per group key, applied with applyOrder through orderOf), sends the per-parent batch PUT /api/<kind>/reorder with the whole sibling list, then revalidates the content reads and only drops the override once the fresh data (already in the new order) is cached, so nothing flashes. On failure the override is dropped (the UI reverts to the server order) and the Spanish error message is returned for a toast. A move to the same index is a no-op. Depends on SWR, @shared/api-client, the content editor service, reorder logic and error messages.
* Versión: 1.0 (C2)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";
import { invalidateApiQueries } from "@shared/api-client/use-api-query";
import { CONTENT_QUERY_PATHS, reorderGroup } from "../../api/services/content-editor.service";
import { groupKey } from "../entities/content-node.entity";
import type { SiblingGroup } from "../entities/content-node.entity";
import { getContentErrorMessage } from "../entities/content-editor-error-messages";
import { moveId } from "../entities/content-reorder";

export type ReorderOutcome =
  | { status: "unchanged" }
  | { status: "success" }
  | { status: "error", message: string };

export type UseSiblingReorderResult = {
  orderOf: (group: SiblingGroup) => readonly string[] | undefined
  reorder: (group: SiblingGroup, ids: readonly string[], from: number, to: number) => Promise<ReorderOutcome>
};

function withoutKey(overrides: Readonly<Record<string, readonly string[]>>, key: string): Record<string, readonly string[]> {
  const next = { ...overrides };

  delete next[key];

  return next;
}

export function useSiblingReorder(): UseSiblingReorderResult {
  const { mutate } = useSWRConfig();
  const [overrides, setOverrides] = useState<Readonly<Record<string, readonly string[]>>>({});

  const orderOf = useCallback((group: SiblingGroup) => overrides[groupKey(group)], [overrides]);

  const reorder = useCallback(async(group: SiblingGroup, ids: readonly string[], from: number, to: number): Promise<ReorderOutcome> => {
    if (from === to) {
      return { status: "unchanged" };
    }

    const key = groupKey(group);
    const next = moveId(ids, from, to);

    setOverrides((current) => ({ ...current, [key]: next }));

    try {
      await reorderGroup(group, next);
    } catch (caught) {
      setOverrides((current) => withoutKey(current, key));

      return { status: "error", message: getContentErrorMessage(caught) };
    }

    await invalidateApiQueries(mutate, CONTENT_QUERY_PATHS).catch(() => undefined);
    setOverrides((current) => withoutKey(current, key));

    return { status: "success" };
  }, [mutate]);

  return { orderOf, reorder };
}
