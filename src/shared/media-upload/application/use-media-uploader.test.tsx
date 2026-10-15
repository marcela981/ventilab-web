/*
* Funcionalidad: useMediaUploader tests
* Descripción: Tests of the keyed media uploads with the media service mocked: the uploaded media (id, preview URL, kind picked by MIME type) reaches onUploaded and its returned message becomes the slot error, an invalid file is rejected before any upload, a failed upload shows the media error message, cancel(key) aborts without an error, an upload cancelled after it finished goes to onAbortedAfterUpload instead of onUploaded, and release(key) drops the slot state. Depends on vitest, Testing Library, the api-client errors and useMediaUploader.
* Versión: 1.0 (S1)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { CanceledError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { IDLE_MEDIA_UPLOAD, useMediaUploader } from "./use-media-uploader";

type UploadOptions = { signal: AbortSignal, onProgress: (fraction: number) => void };

const service = vi.hoisted(() => ({
  signals: [] as AbortSignal[],
  calls: 0,
  upload: null as ((options: UploadOptions) => Promise<string>) | null,
  url: null as (() => Promise<string>) | null,
}));

vi.mock("../api/media.service", async(importActual) => ({
  ...await importActual<typeof import("../api/media.service")>(),
  uploadMedia: (_file: File, options: UploadOptions) => {
    service.calls += 1;
    service.signals.push(options.signal);
    options.onProgress(0.4);

    return service.upload ? service.upload(options) : new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new CanceledError()));
    });
  },
  getMediaUrl: (id: string) => (service.url ? service.url() : Promise.resolve(`https://cdn.example.org/${id}`)),
}));

const MP4 = new File(["mp4"], "clip.mp4", { type: "video/mp4" });

beforeEach(() => {
  service.signals = [];
  service.calls = 0;
  service.upload = null;
  service.url = null;
});

describe("useMediaUploader", () => {
  it("hands the uploaded media to onUploaded and shows its returned message", async() => {
    service.upload = () => Promise.resolve("m1");

    const onUploaded = vi.fn(() => "No se pudo borrar el anterior.");
    const { result } = renderHook(() => useMediaUploader());

    await act(async() => {
      await result.current.upload("statement", ["IMAGE", "VIDEO"], MP4, { onUploaded });
    });

    expect(onUploaded).toHaveBeenCalledWith({ mediaId: "m1", mediaUrl: "https://cdn.example.org/m1", kind: "VIDEO", mimeType: "video/mp4" });
    expect(result.current.stateOf("statement")).toEqual({ ...IDLE_MEDIA_UPLOAD, error: "No se pudo borrar el anterior." });
  });

  it("rejects a file of a kind the slot does not accept before uploading", async() => {
    const onUploaded = vi.fn();
    const { result } = renderHook(() => useMediaUploader());

    await act(async() => {
      await result.current.upload("option-1", "IMAGE", MP4, { onUploaded });
    });

    expect(service.calls).toBe(0);
    expect(onUploaded).not.toHaveBeenCalled();
    expect(result.current.stateOf("option-1").error).toBe("Formato no permitido. Usa PNG, JPEG, WebP o GIF.");
  });

  it("shows the media error message of a failed upload", async() => {
    service.upload = () => Promise.reject(new ApiError({ status: 503, code: "media.storage_unavailable", message: "down" }));

    const { result } = renderHook(() => useMediaUploader());

    await act(async() => {
      await result.current.upload("statement", "VIDEO", MP4, { onUploaded: vi.fn() });
    });

    expect(result.current.stateOf("statement").error).toMatch(/almacenamiento/);
  });

  it("aborts without an error when cancelled", async() => {
    const { result } = renderHook(() => useMediaUploader());

    act(() => {
      void result.current.upload("statement", "VIDEO", MP4, { onUploaded: vi.fn() });
    });

    expect(result.current.stateOf("statement").progress).toBe(0.4);

    await act(async() => {
      result.current.cancel("statement");
      await Promise.resolve();
    });

    expect(service.signals[0]?.aborted).toBe(true);
    expect(result.current.stateOf("statement")).toEqual(IDLE_MEDIA_UPLOAD);
  });

  it("reports an upload cancelled after it finished as an orphan instead of attaching it", async() => {
    const gate: { open: (url: string) => void } = { open: () => undefined };

    service.upload = () => Promise.resolve("m1");
    service.url = () => new Promise((resolve) => {
      gate.open = resolve;
    });

    const onUploaded = vi.fn();
    const onAbortedAfterUpload = vi.fn();
    const { result } = renderHook(() => useMediaUploader());
    let pending: Promise<void> = Promise.resolve();

    act(() => {
      pending = result.current.upload("statement", "VIDEO", MP4, { onUploaded, onAbortedAfterUpload });
    });
    await act(async() => {
      await Promise.resolve();
      result.current.release("statement");
      gate.open("https://cdn.example.org/m1");
      await pending;
    });

    expect(onUploaded).not.toHaveBeenCalled();
    expect(onAbortedAfterUpload).toHaveBeenCalledWith("m1");
    expect(result.current.stateOf("statement")).toEqual(IDLE_MEDIA_UPLOAD);
  });
});
