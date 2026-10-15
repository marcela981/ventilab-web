/*
* Funcionalidad: Media service
* Descripción: Media library calls shared by the editors that upload files (content page editor, evaluation builder). uploadMedia sends the file as the multipart field `file` to POST /api/media through the shared axios client (httpClient) instead of the typed apiPost, because only axios exposes onUploadProgress; the client still attaches the Bearer token and runs the single-flight 401 refresh, and failures are normalized to ApiError. Progress is reported as a 0..1 fraction, the signal aborts the upload (isUploadCancelled recognizes the cancellation) and the timeout is explicit and long (the client default is 8 s). getMediaUrl reads the signed preview URL (GET /api/media/{id}/url) and deleteMedia removes a media item (DELETE /api/media/{id}; 409 media.media_in_use while saved content references it). Depends on axios and @shared/api-client. v1.1 (S1): moved from the content-editor feature to the shared media-upload module, unchanged.
* Versión: 1.1 (S1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import axios from "axios";
import { toApiError } from "@shared/api-client/api-error";
import { apiDelete, apiGet, unwrapResponse } from "@shared/api-client/api-request";
import { httpClient } from "@shared/api-client/http-client";

const MEDIA_UPLOAD_PATH = "/api/media";

// A 100 MB video on a slow connection; the client default (8 s) would cut it.
export const MEDIA_UPLOAD_TIMEOUT_MS = 15 * 60_000;

export type UploadMediaOptions = {
  signal?: AbortSignal
  onProgress?: (fraction: number) => void
};

export function isUploadCancelled(error: unknown): boolean {
  return axios.isCancel(error);
}

export async function uploadMedia(file: File, { signal, onProgress }: UploadMediaOptions = {}): Promise<string> {
  const form = new FormData();

  form.append("file", file);

  try {
    const response = await httpClient.post(MEDIA_UPLOAD_PATH, form, {
      ...(signal ? { signal } : {}),
      timeout: MEDIA_UPLOAD_TIMEOUT_MS,
      onUploadProgress: (event) => {
        if (event.total) {
          onProgress?.(Math.min(1, event.loaded / event.total));
        }
      },
    });

    return unwrapResponse<{ id: string }>(response.data).data.id;
  } catch (error) {
    if (axios.isCancel(error)) {
      throw error;
    }

    throw toApiError(error);
  }
}

export async function getMediaUrl(id: string): Promise<string> {
  const { data } = await apiGet("/api/media/{id}/url", { params: { id } });

  return data.url;
}

export async function deleteMedia(id: string): Promise<void> {
  await apiDelete("/api/media/{id}", { params: { id } });
}
