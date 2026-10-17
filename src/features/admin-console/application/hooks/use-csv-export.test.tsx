/*
* Funcionalidad: useCsvExport tests
* Descripción: The CSV export hook keeps the X-Export-Truncated flag of the last run, clears it at the start of every new run (so a stale notice never survives while the next export is running or after it comes back complete) and clears it on reset() (called by the pages when their filters change). The toast and the browser download are mocked. Depends on Testing Library, vitest and the admin console hook.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ExportedFile } from "../../api/services/admin-operations.service";
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
});
