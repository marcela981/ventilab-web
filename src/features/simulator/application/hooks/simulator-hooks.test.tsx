/*
* Funcionalidad: Simulator hooks tests
* Descripción: Behaviour of the simulator hooks against msw: useCaseCatalog sends the pathology/difficulty filters as server query params and goes back to page 1 on a filter change, exposing the server pagination; useSessionHistory pages the history and resolves the case titles with one ids request (a missing case keeps a null title); useStartPractice creates a FREE session with the default ×1 multiplier, navigates to the session console, ignores a second start while pending and reports a start error per case in Spanish. v1.1: the catalog always asks for PUBLISHED cases and clamps its page when the pages shrink; the history reports titles loading/failed separately from a missing case; a failed navigation after a successful start is not a start error. Depends on Vitest, Testing Library, msw, a mocked next/router and the simulator test helpers.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { apiUrl, caseItemDto, envelope, errorResponse, sessionDto, startedSessionDto, SwrWrapper } from "../pages/simulator-test-helpers";
import { useCaseCatalog } from "./use-case-catalog";
import { useSessionHistory } from "./use-session-history";
import { useStartPractice } from "./use-start-practice";

const router = vi.hoisted(() => ({ push: vi.fn(() => Promise.resolve(true)) }));

vi.mock("next/router", () => ({ useRouter: () => router }));

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  router.push.mockClear();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const params = (url: string): Record<string, string> => Object.fromEntries(new URL(url).searchParams);

describe("useCaseCatalog", () => {
  it("sends the filters as server query params and resets the page on a filter change", async() => {
    const queries: Array<Record<string, string>> = [];

    server.use(http.get(apiUrl("/api/clinical-cases"), ({ request }) => {
      queries.push(params(request.url));

      return HttpResponse.json(envelope([caseItemDto("c1")], { page: 1, pages: 3, limit: 24, total: 50 }));
    }));

    const { result } = renderHook(() => useCaseCatalog(), { wrapper: SwrWrapper });

    await waitFor(() => {
      expect(result.current.cases).toHaveLength(1);
    });
    expect(result.current.pagination).toEqual({ page: 1, pages: 3, limit: 24, total: 50 });
    expect(queries[0]).toEqual({ page: "1", limit: "24", status: "PUBLISHED" });

    act(() => {
      result.current.setPage(2);
    });
    await waitFor(() => {
      expect(queries.at(-1)).toEqual({ page: "2", limit: "24", status: "PUBLISHED" });
    });

    act(() => {
      result.current.setFilters({ pathology: "SDRA", difficulty: "BEGINNER" });
    });
    await waitFor(() => {
      expect(queries.at(-1)).toEqual({ page: "1", limit: "24", pathology: "SDRA", difficulty: "BEGINNER", status: "PUBLISHED" });
    });
    expect(result.current.page).toBe(1);
  });

  it("clamps the page when the number of pages shrinks", async() => {
    let pages = 3;

    server.use(http.get(apiUrl("/api/clinical-cases"), ({ request }) => {
      const page = Number(params(request.url).page);

      return HttpResponse.json(envelope(page > pages ? [] : [caseItemDto(`c${page}`)], { page, pages, limit: 24, total: pages * 24 }));
    }));

    const { result } = renderHook(() => useCaseCatalog(), { wrapper: SwrWrapper });

    await waitFor(() => expect(result.current.pagination?.pages).toBe(3));
    pages = 2;
    act(() => {
      result.current.setPage(3);
    });

    await waitFor(() => expect(result.current.page).toBe(2));
  });
});

describe("useSessionHistory", () => {
  it("pages the history and resolves the case titles with one ids request", async() => {
    const historyQueries: Array<Record<string, string>> = [];
    const caseQueries: Array<Record<string, string>> = [];

    server.use(
      http.get(apiUrl("/api/simulation/sessions/history"), ({ request }) => {
        historyQueries.push(params(request.url));

        return HttpResponse.json(envelope(
          [sessionDto("s1", { caseId: "c2" }), sessionDto("s2", { caseId: "c1" }), sessionDto("s3", { caseId: "gone" })],
          { page: 1, pages: 2, limit: 10, total: 13 },
        ));
      }),
      http.get(apiUrl("/api/clinical-cases"), ({ request }) => {
        caseQueries.push(params(request.url));

        return HttpResponse.json(envelope([caseItemDto("c1", { title: "EPOC" }), caseItemDto("c2", { title: "SDRA" })]));
      }),
    );

    const { result } = renderHook(() => useSessionHistory(), { wrapper: SwrWrapper });

    await waitFor(() => {
      expect(result.current.sessions?.map((session) => session.caseTitle)).toEqual(["SDRA", "EPOC", null]);
    });
    expect(historyQueries).toEqual([{ page: "1", limit: "10" }]);
    expect(caseQueries).toEqual([{ ids: "c1,c2,gone", page: "1", limit: "3" }]);
    expect(result.current.pagination).toEqual({ page: 1, pages: 2, limit: 10, total: 13 });

    expect(result.current.titlesLoading).toBe(false);
    expect(result.current.titlesError).toBeNull();

    act(() => {
      result.current.setPage(2);
    });
    await waitFor(() => {
      expect(historyQueries.at(-1)).toEqual({ page: "2", limit: "10" });
    });
  });

  it("reports the titles as loading, then as failed, never as missing cases", async() => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    server.use(
      http.get(apiUrl("/api/simulation/sessions/history"), () => HttpResponse.json(envelope([sessionDto("s1", { caseId: "c1" })]))),
      http.get(apiUrl("/api/clinical-cases"), async() => {
        await gate;

        return errorResponse("common.internal_error", 500);
      }),
    );

    const { result } = renderHook(() => useSessionHistory(), { wrapper: SwrWrapper });

    await waitFor(() => expect(result.current.sessions).toHaveLength(1));
    expect(result.current.titlesLoading).toBe(true);
    expect(result.current.titlesError).toBeNull();

    release();

    await waitFor(() => expect(result.current.titlesError).not.toBeNull());
    expect(result.current.titlesLoading).toBe(false);
    expect(result.current.sessions?.[0]?.caseTitle).toBeNull();
  });
});

describe("useStartPractice", () => {
  it("creates a FREE session with the default multiplier and navigates to its console", async() => {
    const bodies: unknown[] = [];

    server.use(http.post(apiUrl("/api/simulation/sessions"), async({ request }) => {
      bodies.push(await request.json());

      return HttpResponse.json(envelope(startedSessionDto("s/9")), { status: 201 });
    }));

    const { result } = renderHook(() => useStartPractice(), { wrapper: SwrWrapper });
    let first: Promise<unknown> = Promise.resolve();
    let second: unknown = null;

    await act(async() => {
      first = result.current.start("c1");
      second = await result.current.start("c2");
      await first;
    });

    expect(second).toEqual({ status: "busy" });
    await expect(first).resolves.toMatchObject({ status: "success", session: { id: "s/9" } });
    expect(bodies).toEqual([{ mode: "FREE", caseId: "c1", timeMultiplier: 1 }]);
    expect(router.push).toHaveBeenCalledWith("/simulator/sessions/s%2F9");
    expect(result.current.pendingCaseId).toBeNull();
  });

  it("treats a failed navigation as a started session, not as a start error", async() => {
    server.use(http.post(apiUrl("/api/simulation/sessions"), () => HttpResponse.json(envelope(startedSessionDto("s1")), { status: 201 })));
    router.push.mockRejectedValueOnce(new Error("Route cancelled"));

    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = renderHook(() => useStartPractice(), { wrapper: SwrWrapper });
    let outcome: unknown = null;

    await act(async() => {
      outcome = await result.current.start("c1", 2);
    });

    expect(outcome).toMatchObject({ status: "success", session: { id: "s1" } });
    expect(result.current.error).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("reports a start error for its case and does not navigate", async() => {
    server.use(http.post(apiUrl("/api/simulation/sessions"), () => errorResponse("simulation.case_not_ready", 409)));

    const { result } = renderHook(() => useStartPractice(), { wrapper: SwrWrapper });

    await act(async() => {
      await result.current.start("c1", 4);
    });

    expect(result.current.error).toEqual({ caseId: "c1", message: "Este caso todavía no se puede simular. Elige otro caso." });
    expect(router.push).not.toHaveBeenCalled();
  });
});
