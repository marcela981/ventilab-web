/*
* Funcionalidad: useMediaUploads tests
* Descripción: Tests of the per-block media uploads with the media service mocked: progress is exposed while uploading, cancel(key) (block deleted) and unmounting the editor abort the upload signal without showing an error, and an invalid file is rejected before any upload. Depends on vitest, Testing Library, the page draft entity and useMediaUploads.
* Versión: 1.0 (C5)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { CanceledError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDraftBlock } from "../entities/page-draft.entity";
import { useMediaUploads } from "./use-media-uploads";

const service = vi.hoisted(() => ({ signals: [] as AbortSignal[], calls: 0 }));

vi.mock("../../api/services/media.service", async(importActual) => ({
  ...await importActual<typeof import("../../api/services/media.service")>(),
  uploadMedia: (_file: File, options: { signal: AbortSignal, onProgress: (fraction: number) => void }) => {
    service.calls += 1;
    service.signals.push(options.signal);
    options.onProgress(0.4);

    return new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new CanceledError()));
    });
  },
}));

const BLOCK = createDraftBlock("IMAGE", "new-1");
const PNG = new File(["png"], "curva.png", { type: "image/png" });

function renderUploads() {
  return renderHook(() => useMediaUploads({ blocks: [BLOCK], attachMedia: vi.fn(), detachMedia: vi.fn() }));
}

beforeEach(() => {
  service.signals = [];
  service.calls = 0;
});

describe("useMediaUploads", () => {
  it("shows the progress and aborts the upload when the block is deleted", async() => {
    const { result } = renderUploads();

    act(() => {
      void result.current.upload(BLOCK, PNG);
    });

    expect(result.current.stateOf("new-1").progress).toBe(0.4);

    await act(async() => {
      result.current.cancel("new-1");
      await Promise.resolve();
    });

    expect(service.signals[0]?.aborted).toBe(true);
    expect(result.current.stateOf("new-1")).toEqual({ progress: null, removing: false, error: null });
  });

  it("aborts every upload when the editor unmounts", () => {
    const { result, unmount } = renderUploads();

    act(() => {
      void result.current.upload(BLOCK, PNG);
    });
    unmount();

    expect(service.signals[0]?.aborted).toBe(true);
  });

  it("rejects an invalid file before uploading", async() => {
    const { result } = renderUploads();

    await act(async() => {
      await result.current.upload(BLOCK, new File(["x"], "clip.mov", { type: "video/quicktime" }));
    });

    expect(service.calls).toBe(0);
    expect(result.current.stateOf("new-1").error).toBe("Formato no permitido. Usa PNG, JPEG, WebP o GIF.");
  });
});
