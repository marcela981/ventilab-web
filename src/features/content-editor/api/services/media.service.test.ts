/*
* Funcionalidad: Media service tests
* Descripción: Unit tests of the media upload with the shared axios client mocked: the file goes as multipart field `file` to POST /api/media with a long explicit timeout, upload progress is reported as a 0..1 fraction (events without a total are ignored), the new media id is unwrapped from the envelope, aborting the signal rejects with a cancellation that isUploadCancelled recognizes, and a failure is normalized to ApiError. Depends on vitest, axios and the media service.
* Versión: 1.0 (C5)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { AxiosError, CanceledError } from "axios";
import type { AxiosProgressEvent, AxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { isUploadCancelled, MEDIA_UPLOAD_TIMEOUT_MS, uploadMedia } from "./media.service";

type Post = (url: string, data: unknown, config: AxiosRequestConfig) => Promise<{ data: unknown }>;

const client = vi.hoisted(() => ({ post: null as Post | null }));

vi.mock("@shared/api-client/http-client", () => ({
  httpClient: { post: (url: string, data: unknown, config: AxiosRequestConfig) => (client.post as Post)(url, data, config) },
}));

const FILE = new File(["png"], "curva.png", { type: "image/png" });

const progressEvent = (loaded: number, total?: number) => ({ loaded, total, bytes: loaded, lengthComputable: total !== undefined }) as AxiosProgressEvent;

beforeEach(() => {
  client.post = null;
});

describe("uploadMedia", () => {
  it("sends the file as multipart, reports progress and returns the new id", async() => {
    const progress: number[] = [];
    let sent: { url: string, data: unknown, config: AxiosRequestConfig } | null = null;

    client.post = (url, data, config) => {
      sent = { url, data, config };
      config.onUploadProgress?.(progressEvent(25, 100));
      config.onUploadProgress?.(progressEvent(60));
      config.onUploadProgress?.(progressEvent(100, 100));

      return Promise.resolve({ data: { success: true, data: { id: "m1" } } });
    };

    await expect(uploadMedia(FILE, { onProgress: (value) => progress.push(value) })).resolves.toBe("m1");

    const request = sent as unknown as { url: string, data: FormData, config: AxiosRequestConfig };

    expect(request.url).toBe("/api/media");
    expect(request.data.get("file")).toBe(FILE);
    expect(request.config.timeout).toBe(MEDIA_UPLOAD_TIMEOUT_MS);
    expect(progress).toEqual([0.25, 1]);
  });

  it("rejects with a cancellation when the signal is aborted", async() => {
    const controller = new AbortController();

    client.post = (_url, _data, config) => new Promise((_resolve, reject) => {
      config.signal?.addEventListener?.("abort", () => reject(new CanceledError()));
    });

    const upload = uploadMedia(FILE, { signal: controller.signal });

    controller.abort();

    const error: unknown = await upload.catch((caught: unknown) => caught);

    expect(isUploadCancelled(error)).toBe(true);
  });

  it("normalizes a failure to ApiError", async() => {
    client.post = () => Promise.reject(new AxiosError("too large", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 413,
      statusText: "Payload Too Large",
      headers: {},
      config: { headers: {} } as never,
      data: { success: false, code: "media.media_too_large", message: "too large" },
    }));

    const error: unknown = await uploadMedia(FILE).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 413, code: "media.media_too_large" });
    expect(isUploadCancelled(error)).toBe(false);
  });
});
