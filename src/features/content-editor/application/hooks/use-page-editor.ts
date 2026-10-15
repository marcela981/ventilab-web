/*
* Funcionalidad: usePageEditor
* Descripción: State of the page editor for one Page. Loads GET /api/pages/{id} through useApiQuery (content editor cache config) and keeps a local draft of its blocks only once the user edits (until then the draft is the server blocks). Exposes the block operations (add, duplicate, remove, move, change), the save plan against the server blocks (pending changes flag) and the first invalid block, and save(): applies the plan with savePageBlocks (one save at a time), then refreshes the page, the module print view and the lesson pages. On success the draft is dropped (the fresh server blocks become the draft) unless the user kept editing during the save. On failure the draft is kept with the ids of the blocks already created, so a retry only sends what is still pending, and the server blocks are refreshed so the next plan diffs against what was really saved. Depends on React, SWR, @shared/api-client, the page blocks service and mapper, the page draft entity and the content editor error messages. v1.1 (C4 review): every operation confirmed by the backend (deleted, updated, created ids, reorder) is recorded over the loaded snapshot and applied with applySavedOperations, so a retry after a partial failure never re-POSTs or re-DELETEs even when the refresh also fails; after a successful save the draft is only dropped when the refresh succeeded, otherwise the saved blocks stay visible with their new ids. v1.2 (C5): attachMedia and detachMedia operations on the current draft block (applied to its latest state, not a snapshot from when the upload started). v1.3 (C5): attachMedia and detachMedia operations on the current draft block (applied to its latest state, not a snapshot from when the upload started).
* Versión: 1.3 (C5)
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
import type { SaveProgressListener } from "../../api/services/page-blocks.service";
import { getContentErrorMessage } from "../entities/content-editor-error-messages";
import {
  applySavedOperations,
  attachMedia,
  blockError,
  createDraftBlock,
  detachMedia,
  duplicateBlock,
  hasPendingChanges,
  moveBlock,
  NO_SAVED_OPERATIONS,
  planPageSave,
  removeBlock,
  replaceBlock,
} from "../entities/page-draft.entity";
import type { AddableBlockType, DraftBlock, SavedOperations } from "../entities/page-draft.entity";
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
  attachMedia: (key: string, mediaId: string, mediaUrl: string | null) => void
  detachMedia: (key: string) => void
  save: () => Promise<PageSaveOutcome>
};

type DraftState = { pageId: string, blocks: readonly DraftBlock[] };

// Confirmed operations over one loaded snapshot (`basis` is the query data object they were applied to).
type SavedState = { basis: unknown, operations: SavedOperations };

type SaveRecorder = { listener: SaveProgressListener, created: ReadonlyMap<string, string>, snapshot: () => SavedOperations };

// Collects every operation the backend confirms during one save, on top of the ones of earlier saves of the same snapshot.
function createSaveRecorder(blocks: readonly DraftBlock[], prior: SavedOperations): SaveRecorder {
  const byKey = new Map(blocks.map((block) => [block.key, block]));
  const deleted = new Set(prior.deleted);
  const updated = new Map(prior.updated);
  const createdBlocks = [...prior.created];
  const created = new Map<string, string>();
  let order = prior.order;

  return {
    created,
    listener: {
      onDeleted: (id) => deleted.add(id),
      onUpdated: (id) => {
        const block = blocks.find((candidate) => candidate.id === id);

        if (block) {
          updated.set(id, { ...block, key: id });
        }
      },
      onCreated: (key, id) => {
        const block = byKey.get(key);

        created.set(key, id);

        if (block) {
          createdBlocks.push({ ...block, key: id, id });
        }
      },
      onReordered: (ids) => {
        order = [...ids];
      },
    },
    snapshot: () => ({ deleted: new Set(deleted), updated: new Map(updated), created: [...createdBlocks], order }),
  };
}

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
  const [saved, setSaved] = useState<SavedState | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const nextKey = useRef(0);
  const edits = useRef(0);
  const loadedBlocks = page?.blocks ?? null;
  // A newer snapshot (successful refresh) already contains the saved operations.
  const savedOperations = saved && saved.basis === query.data ? saved.operations : NO_SAVED_OPERATIONS;
  const serverBlocks = useMemo(
    () => (loadedBlocks ? applySavedOperations(loadedBlocks, savedOperations) : null),
    [loadedBlocks, savedOperations],
  );
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

    const basis = query.data;
    const recorder = createSaveRecorder(blocks, savedOperations);
    const record = () => setSaved({ basis, operations: recorder.snapshot() });
    const editsAtStart = edits.current;

    savingRef.current = true;
    setSaving(true);

    try {
      await savePageBlocks(page.id, plan, recorder.listener);
      record();

      // The blocks are saved; a failed refresh only leaves the loaded snapshot stale.
      const refreshed = await invalidateApiQueries(mutate, PAGE_EDITOR_INVALIDATES).then(() => true, () => false);

      if (refreshed && edits.current === editsAtStart) {
        setDraft(null);
      } else {
        setDraft((previous) => ({ pageId, blocks: withIds(previous && previous.pageId === pageId ? previous.blocks : blocks, recorder.created) }));
      }

      return { status: "success" };
    } catch (caught) {
      // Keep what was confirmed so a retry never re-sends it, even if the refresh below fails too.
      record();
      setDraft((previous) => ({ pageId, blocks: withIds(previous && previous.pageId === pageId ? previous.blocks : blocks, recorder.created) }));
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
    attachMedia: (key, mediaId, mediaUrl) => update((current) => attachMedia(current, key, mediaId, mediaUrl)),
    detachMedia: (key) => update((current) => detachMedia(current, key)),
    save,
  };
}
