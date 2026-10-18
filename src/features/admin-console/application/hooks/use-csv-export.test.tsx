/*
* Funcionalidad: useCsvExport tests
* Descripción: The CSV export hook keeps the X-Export-Truncated flag of the last run, clears it at the start of every new run (so a stale notice never survives while the next export is running or after it comes back complete) and clears it on reset() (called by the pages when their filters change). v1.1 (B4): an export still in flight when reset() is called is invalidated, so its truncated flag or error never reappears after the reset (its file is still saved and its failure still toasted, as the user asked for it). The toast and the browser download are mocked. Depends on Testing Library, vitest and the admin console hook.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ExportedFile } from "../../api/services/admin-operations.service";
import { saveTextFile } from "@shared/api-client/api-download";
import { useCsvExport } from "./use-csv-export";

const toast = { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() };

vi.mock("@shared/design-system/components/use-toast", () => ({ useToast: () => toast }));
vi.mock("@shared/api-client/api-download", () => ({ saveTextFile: vi.fn() }));

const exported = (truncated: boolean): ExportedFile => ({ truncated } as unknown as ExportedFile);

describe("useCsvExport", () => {
  it("keeps the truncated flag of the last run and clears it when a new run starts", async() => {
    const { result } = renderHook(() => useCsvExport());

    await act(() => result.current.run(() => Promise.resolve(exported(true)), "a.csv"));
    expect(result.current.truncated).toBe(true);

    let finish: (file: ExportedFile) => void = () => undefined;
    let pending: Promise<void> = Promise.resolve();

    act(() => {
      pending = result.current.run(() => new Promise<ExportedFile>((resolve) => { finish = resolve; }), "a.csv");
    });
    expect(result.current.truncated).toBe(false);

    await act(async() => {
      finish(exported(false));
      await pending;
    });
    expect(result.current.truncated).toBe(false);
  });

  it("clears the truncated flag on reset", async() => {
    const { result } = renderHook(() => useCsvExport());

    await act(() => result.current.run(() => Promise.resolve(exported(true)), "a.csv"));
    expect(result.current.truncated).toBe(true);

    act(() => result.current.reset());
    expect(result.current.truncated).toBe(false);
  });

  it("clears the truncated flag when the next run fails", async() => {
    const { result } = renderHook(() => useCsvExport(() => "falló"));

    await act(() => result.current.run(() => Promise.resolve(exported(true)), "a.csv"));
    await act(() => result.current.run(() => Promise.reject(new Error("x")), "a.csv"));

    expect(result.current.truncated).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("falló");
  });

  it("ignores the truncated flag of an export that was in flight when reset was called", async() => {
    const { result } = renderHook(() => useCsvExport());
    let finish: (file: ExportedFile) => void = () => undefined;
    let pending: Promise<void> = Promise.resolve();

    act(() => {
      pending = result.current.run(() => new Promise<ExportedFile>((resolve) => { finish = resolve; }), "a.csv");
    });
    expect(result.current.exporting).toBe(true);

    act(() => result.current.reset());

    await act(async() => {
      finish(exported(true));
      await pending;
    });
    expect(result.current.truncated).toBe(false);
    expect(result.current.exporting).toBe(false);
    expect(saveTextFile).toHaveBeenCalled();
  });

  it("ignores the error of an export that was in flight when reset was called", async() => {
    const { result } = renderHook(() => useCsvExport(() => "falló"));
    let fail: (error: Error) => void = () => undefined;
    let pending: Promise<void> = Promise.resolve();

    act(() => {
      pending = result.current.run(() => new Promise<ExportedFile>((_resolve, reject) => { fail = reject; }), "a.csv");
    });
    act(() => result.current.reset());

    await act(async() => {
      fail(new Error("x"));
      await pending;
    });
    expect(result.current.error).toBeNull();
    expect(result.current.exporting).toBe(false);
  });

  it("keeps exporting while a newer run started after reset is still in flight", async() => {
    const { result } = renderHook(() => useCsvExport());
    let finishOld: (file: ExportedFile) => void = () => undefined;
    let finishNew: (file: ExportedFile) => void = () => undefined;
    let oldRun: Promise<void> = Promise.resolve();
    let newRun: Promise<void> = Promise.resolve();

    act(() => {
      oldRun = result.current.run(() => new Promise<ExportedFile>((resolve) => { finishOld = resolve; }), "a.csv");
    });
    act(() => result.current.reset());
    act(() => {
      newRun = result.current.run(() => new Promise<ExportedFile>((resolve) => { finishNew = resolve; }), "b.csv");
    });

    await act(async() => {
      finishOld(exported(false));
      await oldRun;
    });
    expect(result.current.exporting).toBe(true);

    await act(async() => {
      finishNew(exported(true));
      await newRun;
    });
    expect(result.current.exporting).toBe(false);
    expect(result.current.truncated).toBe(true);
  });
});
