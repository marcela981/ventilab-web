/*
* Funcionalidad: useMediaUploader
* Descripción: Keyed media uploads with progress, shared by the editors that attach files (one key per slot: a page block, a question statement, an option). upload(key, kinds, file, handlers) validates the file on the client (type and size limits of the accepted kinds), uploads it with progress (one AbortController per key; a new upload on the same key aborts the previous one), reads the signed preview URL (GET /api/media/{id}/url; a failed read only leaves the media without preview) and hands the uploaded media to handlers.onUploaded, which attaches it and may return a message to show as the slot error. When the key was cancelled after the upload finished, handlers.onAbortedAfterUpload receives the orphan media id instead. cancel(key) aborts a slot upload and resets its state; release(key) aborts it and drops its state (the slot is gone); setState lets the caller show its own states (removing, errors, notes). A cancelled upload shows no error and every upload is aborted on unmount. Depends on React, the media service, the media upload entity and the media error messages.
* Versión: 1.0 (S1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMediaUrl, isUploadCancelled, uploadMedia } from "../api/media.service";
import { getMediaErrorMessage } from "./media-error-messages";
import { matchMediaKind, normalizeMimeType, validateMediaFile } from "./media-upload.entity";
import type { MediaKind, MediaKinds } from "./media-upload.entity";

export type MediaUploadState = {
  // 0..1 while uploading; null otherwise.
  progress: number | null
  removing: boolean
  error: string | null
  // Non-blocking note (e.g. the removed file stays in the library because other content uses it).
  info: string | null
};

export type UploadedMedia = {
  mediaId: string
  // Signed preview URL; null when it could not be read.
  mediaUrl: string | null
  kind: MediaKind
  mimeType: string
};

export type MediaUploadHandlers = {
  // Attaches the media; a returned message is shown as the slot error.
  onUploaded: (media: UploadedMedia) => Promise<string | null | void> | string | null | void
  // The slot was cancelled after the upload finished: the media is an orphan.
  onAbortedAfterUpload?: (mediaId: string) => Promise<unknown> | void
};

export type MediaUploader = {
  stateOf: (key: string) => MediaUploadState
  setState: (key: string, state: MediaUploadState) => void
  upload: (key: string, kinds: MediaKinds, file: File, handlers: MediaUploadHandlers) => Promise<void>
  cancel: (key: string) => void
  release: (key: string) => void
};

export type UseMediaUploaderOptions = {
  // Message of a failed upload; defaults to the media error messages.
  errorMessage?: (error: unknown) => string
};

export const IDLE_MEDIA_UPLOAD: MediaUploadState = { progress: null, removing: false, error: null, info: null };

export function useMediaUploader({ errorMessage = getMediaErrorMessage }: UseMediaUploaderOptions = {}): MediaUploader {
  const [states, setStates] = useState<Readonly<Record<string, MediaUploadState>>>({});
  const controllers = useRef(new Map<string, AbortController>());

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

  const abort = useCallback((key: string) => {
    controllers.current.get(key)?.abort();
    controllers.current.delete(key);
  }, []);

  const cancel = useCallback((key: string) => {
    abort(key);
    setState(key, IDLE_MEDIA_UPLOAD);
  }, [abort, setState]);

  const release = useCallback((key: string) => {
    abort(key);
    setStates((previous) => {
      const next = { ...previous };

      delete next[key];

      return next;
    });
  }, [abort]);

  const upload = useCallback(async(key: string, kinds: MediaKinds, file: File, handlers: MediaUploadHandlers) => {
    const invalid = validateMediaFile(file, kinds);
    const kind = matchMediaKind(file.type, kinds);

    if (invalid || kind === null) {
      setState(key, { ...IDLE_MEDIA_UPLOAD, error: invalid });

      return;
    }

    abort(key);

    const controller = new AbortController();

    controllers.current.set(key, controller);
    setState(key, { ...IDLE_MEDIA_UPLOAD, progress: 0 });

    try {
      const mediaId = await uploadMedia(file, {
        signal: controller.signal,
        onProgress: (progress) => setState(key, { ...IDLE_MEDIA_UPLOAD, progress }),
      });
      const mediaUrl = await getMediaUrl(mediaId).catch(() => null);

      if (controller.signal.aborted) {
        // Cancelled (slot removed, editor closed) after the upload finished: let the caller clean the orphan.
        await handlers.onAbortedAfterUpload?.(mediaId);

        return;
      }

      const error = await handlers.onUploaded({ mediaId, mediaUrl, kind, mimeType: normalizeMimeType(file.type) });

      setState(key, { ...IDLE_MEDIA_UPLOAD, error: error ?? null });
    } catch (caught) {
      if (!isUploadCancelled(caught)) {
        setState(key, { ...IDLE_MEDIA_UPLOAD, error: errorMessage(caught) });
      }
    } finally {
      if (controllers.current.get(key) === controller) {
        controllers.current.delete(key);
      }
    }
  }, [abort, errorMessage, setState]);

  const stateOf = useMemo(() => (key: string) => states[key] ?? IDLE_MEDIA_UPLOAD, [states]);

  return { stateOf, setState, upload, cancel, release };
}
