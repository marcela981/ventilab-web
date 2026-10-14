/*
* Funcionalidad: retryImport tests
* Descripción: Verifies the new-code retryImport (3 attempts, exponential backoff starting at 500 ms) and isChunkLoadError detection (webpack ChunkLoadError, CSS chunks, ESM dynamic imports). Depends on vitest fake timers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isChunkLoadError, retryImport } from "./retry-import";

describe("retryImport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves when a later attempt succeeds", async () => {
    const importFn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("net"))
      .mockRejectedValueOnce(new Error("net"))
      .mockResolvedValueOnce("module");
    const result = retryImport(importFn);

    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1000);

    await expect(result).resolves.toBe("module");
    expect(importFn).toHaveBeenCalledTimes(3);
  });

  it("rejects with the last error after three attempts", async () => {
    const error = new Error("still failing");
    const importFn = vi.fn<() => Promise<string>>().mockRejectedValue(error);
    const result = retryImport(importFn);
    const assertion = expect(result).rejects.toBe(error);

    await vi.advanceTimersByTimeAsync(1500);
    await assertion;
    expect(importFn).toHaveBeenCalledTimes(3);
  });
});

describe("isChunkLoadError", () => {
  it.each([
    [{ name: "ChunkLoadError", message: "x" }, true],
    [new Error("Loading chunk 42 failed."), true],
    [new Error("Loading CSS chunk app failed"), true],
    [new Error("Failed to fetch dynamically imported module: /a.js"), true],
    [new Error("Cannot read properties of undefined"), false],
    [null, false],
    ["text", false],
  ])("detects %o as %s", (error, expected) => {
    expect(isChunkLoadError(error)).toBe(expected);
  });
});
