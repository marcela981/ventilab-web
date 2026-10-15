/*
* Funcionalidad: usePageEditor
* Descripción: State of the page editor for one Page. Loads GET /api/pages/{id} through useApiQuery (content editor cache config) and keeps a local draft of its blocks only once the user edits (until then the draft is the server blocks). Exposes the block operations (add, duplicate, remove, move, change), the save plan against the server blocks (pending changes flag) and the first invalid block, and save(): applies the plan with savePageBlocks (one save at a time), then refreshes the page, the module print view and the lesson pages. On success the draft is dropped (the fresh server blocks become the draft) unless the user kept editing during the save. On failure the draft is kept with the ids of the blocks already created, so a retry only sends what is still pending, and the server blocks are refreshed so the next plan diffs against what was really saved. Depends on React, SWR, @shared/api-client, the page blocks service and mapper, the page draft entity and the content editor error messages.
* Versión: 1.0 (C4)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import type { ApiError } from "@shared/api-client/api-error";
import { toApiError } from "@shared/api-client/api-error";
import { invalidateApiQueries, useApiQuery } from "@shared/api-client/use-api-query";
import { toEditablePage } from "../../api/mappers/page-blocks.mapper";
import type { EditablePage } from "../../api/mappers/page-blocks.mapper";
import { PAGE_EDITOR_INVALIDATES, PAGE_EDITOR_PATH, savePageBlocks } from "../../api/services/page-blocks.service";
import { getContentErrorMessage } from "../entities/content-editor-error-messages";
import {
  blockError,
  createDraftBlock,
  duplicateBlock,
  hasPendingChanges,
  moveBlock,
  planPageSave,
  removeBlock,
  replaceBlock,
} from "../entities/page-draft.entity";
import type { AddableBlockType, DraftBlock } from "../entities/page-draft.entity";
import { CONTENT_QUERY_CONFIG } from "./use-content-tree";

export type BlockChange = Partial<Pick<DraftBlock, "title" | "content" | "mediaId">>;

export type PageSaveOutcome =
  | { status: "success" }
  | { status: "error", message: string }
  | { status: "busy" };

export type UsePageEditorResult = {
  page: EditablePage | null
  blocks: readonly DraftBlock[] | null
  isLoading: boolean
  error: ApiError | null
  reload: () => Promise<void>
  dirty: boolean
  invalidKey: string | null
  saving: boolean
  add: (type: AddableBlockType) => void
  duplicate: (key: string) => void
  remove: (key: string) => void
  move: (from: number, to: number) => void
  change: (key: string, change: BlockChange) => void
  save: () => Promise<PageSaveOutcome>
};

type DraftState = { pageId: string, blocks: readonly DraftBlock[] };

function withIds(blocks: readonly DraftBlock[], created: ReadonlyMap<string, string>): DraftBlock[] {
  return blocks.map((block) => {
    const id = created.get(block.key);

    return id === undefined ? block : { ...block, id };
  });
}

export function usePageEditor(pageId: string): UsePageEditorResult {
  const { mutate } = useSWRConfig();
  const query = useApiQuery(PAGE_EDITOR_PATH, { params: { id: pageId } }, CONTENT_QUERY_CONFIG);
  const page = useMemo(() => (query.data ? toEditablePage(query.data.data) : null), [query.data]);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const nextKey = useRef(0);
  const edits = useRef(0);
  const serverBlocks = page?.blocks ?? null;
  const blocks = draft && draft.pageId === pageId ? draft.blocks : serverBlocks;
  const plan = useMemo(() => (serverBlocks && blocks ? planPageSave(serverBlocks, blocks) : null), [serverBlocks, blocks]);
  const invalidKey = blocks?.find((block) => blockError(block) !== null)?.key ?? null;

  const update = useCallback((apply: (current: readonly DraftBlock[]) => readonly DraftBlock[]) => {
    edits.current += 1;
    setDraft((previous) => {
      const current = previous && previous.pageId === pageId ? previous.blocks : serverBlocks;

      return current ? { pageId, blocks: apply(current) } : previous;
    });
  }, [pageId, serverBlocks]);

  const newKey = () => {
    nextKey.current += 1;

    return `new-${nextKey.current}`;
  };

  const save = async(): Promise<PageSaveOutcome> => {
    if (savingRef.current) {
      return { status: "busy" };
    }

    if (!page || !blocks || !plan || !hasPendingChanges(plan)) {
      return { status: "success" };
    }

    const created = new Map<string, string>();
    const editsAtStart = edits.current;

    savingRef.current = true;
    setSaving(true);

    try {
      await savePageBlocks(page.id, plan, (key, id) => created.set(key, id));
      // The blocks are saved; a failed refresh only leaves stale data on screen.
      await invalidateApiQueries(mutate, PAGE_EDITOR_INVALIDATES).catch(() => undefined);

      if (edits.current === editsAtStart) {
        setDraft(null);
      } else {
        setDraft((previous) => (previous ? { pageId, blocks: withIds(previous.blocks, created) } : previous));
      }

      return { status: "success" };
    } catch (caught) {
      setDraft((previous) => ({ pageId, blocks: withIds(previous && previous.pageId === pageId ? previous.blocks : blocks, created) }));
      await query.mutate().catch(() => undefined);

      return { status: "error", message: getContentErrorMessage(toApiError(caught)) };
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const reload = useCallback(async() => {
    await query.mutate();
  }, [query]);

  return {
    page,
    blocks,
    isLoading: query.isLoading,
    error: query.error ?? null,
    reload,
    dirty: plan ? hasPendingChanges(plan) : false,
    invalidKey,
    saving,
    add: (type) => {
      const key = newKey();

      update((current) => [...current, createDraftBlock(type, key)]);
    },
    duplicate: (key) => {
      const copyKey = newKey();

      update((current) => duplicateBlock(current, key, copyKey));
    },
    remove: (key) => update((current) => removeBlock(current, key)),
    move: (from, to) => update((current) => moveBlock(current, from, to)),
    change: (key, blockChange) => update((current) => replaceBlock(current, key, blockChange)),
    save,
  };
}
