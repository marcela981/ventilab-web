/*
* Funcionalidad: useMediaUploads
* Descripción: Media uploads of the page editor, one per block. upload(block, file) validates the file on the client (type and size limits of the block kind), uploads it with progress (one AbortController per block; a new upload on the same block aborts the previous one), reads the signed preview URL (GET /api/media/{id}/url; a failed read only leaves the block without preview) and attaches the new media to the draft block; when it replaced a file uploaded in this session, that orphan is deleted. remove(block) is "Quitar archivo": media uploaded in this editing session and not used by another draft block is deleted (DELETE /api/media/{id}) and the block reference is cleared only on success, so a 409 media.media_in_use keeps the block as it was and shows its message; media that came with the page (or already saved, see markSaved) is only cleared locally, because the saved page still references it until the next save and the backend would answer 409. markSaved forgets the session uploads after a successful page save. cancel(key) aborts a block upload (the page calls it when the block is deleted) and every upload is aborted on unmount; a cancelled upload shows no error. Depends on React, the media service, the media upload entity, the page draft entity and the content editor error messages. v1.1 (C6): a 409 media.media_in_use on a session upload means another saved page already uses it: the media is treated as persisted (never deleted again), the block is cleared anyway and an informational note replaces the blocking error (MediaUploadState.info). releaseBlock(block), called when a block is deleted, aborts its upload, deletes its finished session upload (same not-used-elsewhere guard and 409 handling) and drops the block's state entry.
* Versión: 1.1 (C6)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteMedia, getMediaUrl, isUploadCancelled, uploadMedia } from "../../api/services/media.service";
import { getContentErrorMessage, isMediaInUse } from "../entities/content-editor-error-messages";
import { mediaKindOf, validateMediaFile } from "../entities/media-upload.entity";
import type { DraftBlock } from "../entities/page-draft.entity";

export type MediaUploadState = {
  // 0..1 while uploading; null otherwise.
  progress: number | null
  removing: boolean
  error: string | null
  // Non-blocking note (e.g. the removed file stays in the library because another page uses it).
  info: string | null
};

export type BlockMediaControls = {
  stateOf: (key: string) => MediaUploadState
  upload: (block: DraftBlock, file: File) => Promise<void>
  cancel: (key: string) => void
  remove: (block: DraftBlock) => Promise<void>
  releaseBlock: (block: DraftBlock) => Promise<void>
  markSaved: () => void
};

export type MediaDraftActions = {
  blocks: readonly DraftBlock[] | null
  attachMedia: (key: string, mediaId: string, mediaUrl: string | null) => void
  detachMedia: (key: string) => void
};

// TODO(i18n): move to a content-editor namespace in src/i18n.
export const MEDIA_KEPT_IN_LIBRARY = "Se quitó el archivo de este bloque. Otra página guardada ya lo usa, así que se conserva en la biblioteca de archivos.";

const IDLE: MediaUploadState = { progress: null, removing: false, error: null, info: null };

type DiscardResult = { status: "deleted" | "in-use" } | { status: "failed", message: string };

export function useMediaUploads({ blocks, attachMedia, detachMedia }: MediaDraftActions): BlockMediaControls {
  const [states, setStates] = useState<Readonly<Record<string, MediaUploadState>>>({});
  const controllers = useRef(new Map<string, AbortController>());
  const sessionMedia = useRef(new Set<string>());
  const latest = useRef({ blocks, attachMedia, detachMedia });

  useEffect(() => {
    latest.current = { blocks, attachMedia, detachMedia };
  }, [blocks, attachMedia, detachMedia]);

  useEffect(() => {
    const active = controllers.current;

    return () => {
      active.forEach((controller) => controller.abort());
      active.clear();
    };
  }, []);

  const setState = useCallback((key: string, state: MediaUploadState) => {
    setStates((previous) => ({ ...previous, [key]: state }));
  }, []);

  // Deletes a session upload. A 409 means a saved page uses it: from then on it is persisted, never deleted here.
  const discard = useCallback(async(mediaId: string): Promise<DiscardResult> => {
    try {
      await deleteMedia(mediaId);
      sessionMedia.current.delete(mediaId);

      return { status: "deleted" };
    } catch (caught) {
      if (isMediaInUse(caught)) {
        sessionMedia.current.delete(mediaId);

        return { status: "in-use" };
      }

      return { status: "failed", message: getContentErrorMessage(caught) };
    }
  }, []);

  const usedElsewhere = (key: string, mediaId: string) =>
    (latest.current.blocks ?? []).some((block) => block.key !== key && block.mediaId === mediaId);

  const deletable = (key: string, mediaId: string | null): mediaId is string =>
    mediaId !== null && sessionMedia.current.has(mediaId) && !usedElsewhere(key, mediaId);

  const abort = (key: string) => {
    controllers.current.get(key)?.abort();
    controllers.current.delete(key);
  };

  const cancel = useCallback((key: string) => {
    controllers.current.get(key)?.abort();
    controllers.current.delete(key);
    setState(key, IDLE);
  }, [setState]);

  const upload = async(block: DraftBlock, file: File) => {
    const kind = mediaKindOf(block.type);

    if (!kind) {
      return;
    }

    const invalid = validateMediaFile(file, kind);

    if (invalid) {
      setState(block.key, { ...IDLE, error: invalid });

      return;
    }

    abort(block.key);

    const controller = new AbortController();

    controllers.current.set(block.key, controller);
    setState(block.key, { ...IDLE, progress: 0 });

    try {
      const mediaId = await uploadMedia(file, {
        signal: controller.signal,
        onProgress: (progress) => setState(block.key, { ...IDLE, progress }),
      });

      sessionMedia.current.add(mediaId);

      const mediaUrl = await getMediaUrl(mediaId).catch(() => null);

      if (controller.signal.aborted) {
        // Cancelled (block deleted, editor closed) after the upload finished: do not leave an orphan.
        await discard(mediaId);

        return;
      }

      latest.current.attachMedia(block.key, mediaId, mediaUrl);

      const previous = block.mediaId;
      const replaced = previous !== mediaId && deletable(block.key, previous) ? await discard(previous) : null;

      setState(block.key, { ...IDLE, error: replaced?.status === "failed" ? replaced.message : null });
    } catch (caught) {
      if (!isUploadCancelled(caught)) {
        setState(block.key, { ...IDLE, error: getContentErrorMessage(caught) });
      }
    } finally {
      if (controllers.current.get(block.key) === controller) {
        controllers.current.delete(block.key);
      }
    }
  };

  const remove = async(block: DraftBlock) => {
    const mediaId = block.mediaId;

    if (mediaId === null) {
      return;
    }

    if (!deletable(block.key, mediaId)) {
      latest.current.detachMedia(block.key);
      setState(block.key, IDLE);

      return;
    }

    setState(block.key, { ...IDLE, removing: true });

    const result = await discard(mediaId);

    if (result.status === "failed") {
      setState(block.key, { ...IDLE, error: result.message });

      return;
    }

    latest.current.detachMedia(block.key);
    setState(block.key, { ...IDLE, info: result.status === "in-use" ? MEDIA_KEPT_IN_LIBRARY : null });
  };

  const releaseBlock = async(block: DraftBlock) => {
    abort(block.key);
    setStates((previous) => {
      const next = { ...previous };

      delete next[block.key];

      return next;
    });

    if (deletable(block.key, block.mediaId)) {
      // The block is gone: there is nowhere to show a failure, so it is ignored.
      await discard(block.mediaId);
    }
  };

  const markSaved = useCallback(() => {
    sessionMedia.current.clear();
  }, []);

  const stateOf = useMemo(() => (key: string) => states[key] ?? IDLE, [states]);

  return { stateOf, upload, cancel, remove, releaseBlock, markSaved };
}
