/*
* Funcionalidad: useMediaUploads
* Descripción: Media uploads of the page editor, one per block. upload(block, file) validates the file on the client (type and size limits of the block kind), uploads it with progress (one AbortController per block; a new upload on the same block aborts the previous one), reads the signed preview URL (GET /api/media/{id}/url; a failed read only leaves the block without preview) and attaches the new media to the draft block; when it replaced a file uploaded in this session, that orphan is deleted. remove(block) is "Quitar archivo": media uploaded in this editing session and not used by another draft block is deleted (DELETE /api/media/{id}) and the block reference is cleared only on success, so a 409 media.media_in_use keeps the block as it was and shows its message; media that came with the page (or already saved, see markSaved) is only cleared locally, because the saved page still references it until the next save and the backend would answer 409. markSaved forgets the session uploads after a successful page save. cancel(key) aborts a block upload (the page calls it when the block is deleted) and every upload is aborted on unmount; a cancelled upload shows no error. Depends on React, the shared media-upload module (uploader hook, media service), the page draft entity and the content editor error messages. v1.1 (C6): a 409 media.media_in_use on a session upload means another saved page already uses it: the media is treated as persisted (never deleted again), the block is cleared anyway and an informational note replaces the blocking error (MediaUploadState.info). releaseBlock(block), called when a block is deleted, aborts its upload, deletes its finished session upload (same not-used-elsewhere guard and 409 handling) and drops the block's state entry. v1.2 (S1): the keyed upload flow (validation, progress, abort, preview URL) comes from the shared useMediaUploader; this hook keeps the page block coupling (session uploads, orphan deletion, media in use). Behavior unchanged.
* Versión: 1.2 (S1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useRef } from "react";
import { deleteMedia, IDLE_MEDIA_UPLOAD, mediaKindOf, useMediaUploader } from "@shared/media-upload";
import type { MediaUploadState } from "@shared/media-upload";
import { getContentErrorMessage, isMediaInUse } from "../entities/content-editor-error-messages";
import type { DraftBlock } from "../entities/page-draft.entity";

export type { MediaUploadState } from "@shared/media-upload";

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

const IDLE = IDLE_MEDIA_UPLOAD;

type DiscardResult = { status: "deleted" | "in-use" } | { status: "failed", message: string };

export function useMediaUploads({ blocks, attachMedia, detachMedia }: MediaDraftActions): BlockMediaControls {
  const uploader = useMediaUploader({ errorMessage: getContentErrorMessage });
  const { setState, release } = uploader;
  const sessionMedia = useRef(new Set<string>());
  const latest = useRef({ blocks, attachMedia, detachMedia });

  useEffect(() => {
    latest.current = { blocks, attachMedia, detachMedia };
  }, [blocks, attachMedia, detachMedia]);

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

  const upload = async(block: DraftBlock, file: File) => {
    const kind = mediaKindOf(block.type);

    if (!kind) {
      return;
    }

    await uploader.upload(block.key, kind, file, {
      onAbortedAfterUpload: (mediaId) => discard(mediaId),
      onUploaded: async({ mediaId, mediaUrl }) => {
        sessionMedia.current.add(mediaId);
        latest.current.attachMedia(block.key, mediaId, mediaUrl);

        const previous = block.mediaId;
        const replaced = previous !== mediaId && deletable(block.key, previous) ? await discard(previous) : null;

        return replaced?.status === "failed" ? replaced.message : null;
      },
    });
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
    release(block.key);

    if (deletable(block.key, block.mediaId)) {
      // The block is gone: there is nowhere to show a failure, so it is ignored.
      await discard(block.mediaId);
    }
  };

  const markSaved = useCallback(() => {
    sessionMedia.current.clear();
  }, []);

  return { stateOf: uploader.stateOf, upload, cancel: uploader.cancel, remove, releaseBlock, markSaved };
}
