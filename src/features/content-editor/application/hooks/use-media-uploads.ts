/*
* Funcionalidad: useMediaUploads
* Descripción: Media uploads of the page editor, one per block. upload(block, file) validates the file on the client (type and size limits of the block kind), uploads it with progress (one AbortController per block; a new upload on the same block aborts the previous one), reads the signed preview URL (GET /api/media/{id}/url; a failed read only leaves the block without preview) and attaches the new media to the draft block; when it replaced a file uploaded in this session, that orphan is deleted. remove(block) is "Quitar archivo": media uploaded in this editing session and not used by another draft block is deleted (DELETE /api/media/{id}) and the block reference is cleared only on success, so a 409 media.media_in_use keeps the block as it was and shows its message; media that came with the page (or already saved, see markSaved) is only cleared locally, because the saved page still references it until the next save and the backend would answer 409. markSaved forgets the session uploads after a successful page save. cancel(key) aborts a block upload (the page calls it when the block is deleted) and every upload is aborted on unmount; a cancelled upload shows no error. Depends on React, the media service, the media upload entity, the page draft entity and the content editor error messages.
* Versión: 1.0 (C5)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteMedia, getMediaUrl, isUploadCancelled, uploadMedia } from "../../api/services/media.service";
import { getContentErrorMessage } from "../entities/content-editor-error-messages";
import { mediaKindOf, validateMediaFile } from "../entities/media-upload.entity";
import type { DraftBlock } from "../entities/page-draft.entity";

export type MediaUploadState = {
  // 0..1 while uploading; null otherwise.
  progress: number | null
  removing: boolean
  error: string | null
};

export type BlockMediaControls = {
  stateOf: (key: string) => MediaUploadState
  upload: (block: DraftBlock, file: File) => Promise<void>
  cancel: (key: string) => void
  remove: (block: DraftBlock) => Promise<void>
  markSaved: () => void
};

export type MediaDraftActions = {
  blocks: readonly DraftBlock[] | null
  attachMedia: (key: string, mediaId: string, mediaUrl: string | null) => void
  detachMedia: (key: string) => void
};

const IDLE: MediaUploadState = { progress: null, removing: false, error: null };

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

  // Deletes a session upload no draft block uses; a media in use (409) keeps it and returns the message.
  const discard = useCallback(async(mediaId: string): Promise<string | null> => {
    try {
      await deleteMedia(mediaId);
      sessionMedia.current.delete(mediaId);

      return null;
    } catch (caught) {
      return getContentErrorMessage(caught);
    }
  }, []);

  const usedElsewhere = (key: string, mediaId: string) =>
    (latest.current.blocks ?? []).some((block) => block.key !== key && block.mediaId === mediaId);

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

    controllers.current.get(block.key)?.abort();

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
      const error = previous && previous !== mediaId && sessionMedia.current.has(previous) && !usedElsewhere(block.key, previous)
        ? await discard(previous)
        : null;

      setState(block.key, { ...IDLE, error });
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

    if (!sessionMedia.current.has(mediaId) || usedElsewhere(block.key, mediaId)) {
      latest.current.detachMedia(block.key);
      setState(block.key, IDLE);

      return;
    }

    setState(block.key, { ...IDLE, removing: true });

    const error = await discard(mediaId);

    if (error === null) {
      latest.current.detachMedia(block.key);
    }

    setState(block.key, { ...IDLE, error });
  };

  const markSaved = useCallback(() => {
    sessionMedia.current.clear();
  }, []);

  const stateOf = useMemo(() => (key: string) => states[key] ?? IDLE, [states]);

  return { stateOf, upload, cancel, remove, markSaved };
}
