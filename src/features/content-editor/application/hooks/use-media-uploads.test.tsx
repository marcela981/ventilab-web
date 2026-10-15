/*
* Funcionalidad: useMediaUploads tests
* Descripción: Tests of the per-block media uploads with the media service mocked: progress is exposed while uploading, cancel(key) and unmounting the editor abort the upload signal without showing an error, and an invalid file is rejected before any upload. v1.1 (C6): orphan cleanup (an upload cancelled after it resolved but before it was attached is deleted; replacing a session upload deletes the previous one), a 409 media.media_in_use on "Quitar archivo" clears the block anyway with an informational note and never deletes that media again, and releasing a deleted block deletes its finished session upload (unless another draft block uses it) and drops its state. Depends on vitest, Testing Library, the api-client errors, the page draft entity and useMediaUploads.
* Versión: 1.1 (C6)
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
import { createDraftBlock } from "../entities/page-draft.entity";
import type { DraftBlock } from "../entities/page-draft.entity";
import { MEDIA_KEPT_IN_LIBRARY, useMediaUploads } from "./use-media-uploads";

type UploadOptions = { signal: AbortSignal, onProgress: (fraction: number) => void };

const service = vi.hoisted(() => ({
  signals: [] as AbortSignal[],
  calls: 0,
  deleted: [] as string[],
  // Default: an upload that only ends when aborted.
  upload: null as ((options: UploadOptions) => Promise<string>) | null,
  url: null as (() => Promise<string>) | null,
  deleteFails: null as ApiError | null,
}));

vi.mock("../../api/services/media.service", async(importActual) => ({
  ...await importActual<typeof import("../../api/services/media.service")>(),
  uploadMedia: (_file: File, options: UploadOptions) => {
    service.calls += 1;
    service.signals.push(options.signal);
    options.onProgress(0.4);

    return service.upload ? service.upload(options) : new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new CanceledError()));
    });
  },
  getMediaUrl: (id: string) => (service.url ? service.url() : Promise.resolve(`https://cdn.example.org/${id}.png`)),
  deleteMedia: (id: string) => {
    service.deleted.push(id);

    return service.deleteFails ? Promise.reject(service.deleteFails) : Promise.resolve();
  },
}));

const BLOCK = createDraftBlock("IMAGE", "new-1");
const PNG = new File(["png"], "curva.png", { type: "image/png" });
const IN_USE = new ApiError({ status: 409, code: "media.media_in_use", message: "in use" });

function renderUploads(blocks: readonly DraftBlock[] = [BLOCK]) {
  const attachMedia = vi.fn();
  const detachMedia = vi.fn();
  const rendered = renderHook(() => useMediaUploads({ blocks, attachMedia, detachMedia }));

  return { ...rendered, attachMedia, detachMedia };
}

// Uploads `id` to the block so it becomes a session upload of this editor.
async function uploadAs(result: { current: ReturnType<typeof useMediaUploads> }, block: DraftBlock, id: string) {
  service.upload = () => Promise.resolve(id);

  await act(async() => {
    await result.current.upload(block, PNG);
  });
}

beforeEach(() => {
  service.signals = [];
  service.calls = 0;
  service.deleted = [];
  service.upload = null;
  service.url = null;
  service.deleteFails = null;
});

describe("useMediaUploads", () => {
  it("shows the progress and aborts the upload when cancelled", async() => {
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
    expect(result.current.stateOf("new-1")).toEqual({ progress: null, removing: false, error: null, info: null });
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

  it("deletes an upload cancelled after it resolved but before it was attached", async() => {
    const gate: { open: (url: string) => void } = { open: () => undefined };

    service.upload = () => Promise.resolve("m1");
    service.url = () => new Promise((resolve) => {
      gate.open = resolve;
    });

    const { result, attachMedia } = renderUploads();
    let pending: Promise<void> = Promise.resolve();

    act(() => {
      pending = result.current.upload(BLOCK, PNG);
    });
    await act(async() => {
      await Promise.resolve();
      result.current.cancel("new-1");
      gate.open("https://cdn.example.org/m1.png");
      await pending;
    });

    expect(attachMedia).not.toHaveBeenCalled();
    expect(service.deleted).toEqual(["m1"]);
  });

  it("deletes the previous session upload when the file is replaced", async() => {
    const { result, attachMedia } = renderUploads();

    await uploadAs(result, BLOCK, "m1");
    await uploadAs(result, { ...BLOCK, mediaId: "m1" }, "m2");

    expect(attachMedia).toHaveBeenLastCalledWith("new-1", "m2", "https://cdn.example.org/m2.png");
    expect(service.deleted).toEqual(["m1"]);
  });

  it("clears the block with a note when the removed media is in use, and never deletes it again", async() => {
    const { result, detachMedia } = renderUploads();

    await uploadAs(result, BLOCK, "m1");
    service.deleteFails = IN_USE;

    await act(async() => {
      await result.current.remove({ ...BLOCK, mediaId: "m1" });
    });

    expect(detachMedia).toHaveBeenCalledWith("new-1");
    expect(result.current.stateOf("new-1")).toMatchObject({ error: null, info: MEDIA_KEPT_IN_LIBRARY });

    await act(async() => {
      await result.current.remove({ ...BLOCK, mediaId: "m1" });
    });

    expect(service.deleted).toEqual(["m1"]);
    expect(detachMedia).toHaveBeenCalledTimes(2);
  });

  it("keeps the file and shows the error when the removal fails otherwise", async() => {
    const { result, detachMedia } = renderUploads();

    await uploadAs(result, BLOCK, "m1");
    service.deleteFails = new ApiError({ status: 500, code: "common.internal_error", message: "boom" });

    await act(async() => {
      await result.current.remove({ ...BLOCK, mediaId: "m1" });
    });

    expect(detachMedia).not.toHaveBeenCalled();
    expect(result.current.stateOf("new-1").error).toMatch(/servidor/);
  });

  it("deletes the finished session upload of a deleted block and drops its state", async() => {
    const { result } = renderUploads();

    await uploadAs(result, BLOCK, "m1");
    await act(async() => {
      await result.current.upload(BLOCK, new File(["x"], "clip.mov", { type: "video/quicktime" }));
    });
    await act(async() => {
      await result.current.releaseBlock({ ...BLOCK, mediaId: "m1" });
    });

    expect(service.deleted).toEqual(["m1"]);
    expect(result.current.stateOf("new-1").error).toBeNull();
  });

  it("keeps the media of a deleted block that another draft block uses", async() => {
    const copy = { ...BLOCK, key: "new-2", mediaId: "m1" };
    const { result } = renderUploads([BLOCK, copy]);

    await uploadAs(result, BLOCK, "m1");
    await act(async() => {
      await result.current.releaseBlock({ ...BLOCK, mediaId: "m1" });
    });

    expect(service.deleted).toEqual([]);
  });
});
