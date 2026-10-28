/*
* Funcionalidad: usePageViewTracker tests
* Descripción: Fake-timer tests of the page-view rule: one registration after 5 s on the page; "Siguiente" (markViewedNow) before 5 s registers once and the timer does not fire again; unmounting before 5 s registers nothing; a new pageId starts a new visit; preview mode (teacher) never registers; after success the module progress cache takes the response values for that lesson and the affected progress queries and the curriculum tree are invalidated. The service is mocked. v1.1 (W2, Bloque 2): a view that fails with a network error goes to the user's offline progress outbox; a 403 is dropped with a console warning. Depends on vitest, Testing Library, SWR, the session context and the progress outbox key.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { SWRConfig, unstable_serialize } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { apiQueryKey } from "@shared/api-client/use-api-query";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import type { Role } from "@shared/session/session.entity";
import { MODULE_PROGRESS_PATH } from "../../api/services/progress.service";
import { lessonProgressDto, moduleProgressDto } from "../pages/learning-test-helpers";
import { progressOutboxKey } from "../session/progress-outbox";
import { PAGE_VIEW_DELAY_MS, usePageViewTracker } from "./use-page-view-tracker";

const service = vi.hoisted(() => ({ recordPageView: vi.fn() }));

vi.mock("../../api/services/progress.service", async(importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/services/progress.service")>()),
  recordPageView: service.recordPageView,
}));

const viewResult = {
  pageId: "p1",
  lessonId: "l1",
  viewedPages: 1,
  totalPages: 1,
  lessonCompleted: true,
  lessonJustCompleted: true,
  firstViewedAt: "2026-10-14T00:00:00.000Z",
  lastVisitedAt: "2026-10-14T00:00:00.000Z",
};

function makeWrapper(role: Role, cache: Map<string, unknown>, userId?: string) {
  const user = userId ? { id: userId } : null;
  const session = { role, status: "authenticated", user } as unknown as SessionContextValue;

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => cache as never, dedupingInterval: 0 }}>
        <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
      </SWRConfig>
    );
  };
}

function renderTracker(role: Role = "STUDENT", cache = new Map<string, unknown>(), pageId = "p1") {
  return renderHook(
    ({ id }: { id: string | null }) => usePageViewTracker({ pageId: id, moduleId: "m1" }),
    { initialProps: { id: pageId }, wrapper: makeWrapper(role, cache) },
  );
}

async function advance(ms: number) {
  await act(async() => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
  service.recordPageView.mockReset();
  service.recordPageView.mockResolvedValue(viewResult);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("usePageViewTracker", () => {
  it("registers the view once after 5 s on the page", async() => {
    renderTracker();

    await advance(PAGE_VIEW_DELAY_MS - 1);
    expect(service.recordPageView).not.toHaveBeenCalled();

    await advance(1);
    expect(service.recordPageView).toHaveBeenCalledTimes(1);
    expect(service.recordPageView).toHaveBeenCalledWith("p1");

    await advance(PAGE_VIEW_DELAY_MS * 3);
    expect(service.recordPageView).toHaveBeenCalledTimes(1);
  });

  it("registers once when Siguiente comes before 5 s and the timer does not fire again", async() => {
    const { result } = renderTracker();

    await advance(1_000);
    await act(async() => {
      await result.current.markViewedNow();
      await result.current.markViewedNow();
    });
    expect(service.recordPageView).toHaveBeenCalledTimes(1);

    await advance(PAGE_VIEW_DELAY_MS * 2);
    expect(service.recordPageView).toHaveBeenCalledTimes(1);
  });

  it("registers nothing when the user leaves before 5 s", async() => {
    const { unmount } = renderTracker();

    await advance(PAGE_VIEW_DELAY_MS - 1);
    unmount();
    await advance(PAGE_VIEW_DELAY_MS * 2);

    expect(service.recordPageView).not.toHaveBeenCalled();
  });

  it("starts a new visit when the pageId changes", async() => {
    const { rerender } = renderTracker();

    await advance(PAGE_VIEW_DELAY_MS);
    rerender({ id: "p2" });
    await advance(PAGE_VIEW_DELAY_MS - 1);
    expect(service.recordPageView).toHaveBeenCalledTimes(1);

    await advance(1);
    expect(service.recordPageView).toHaveBeenCalledTimes(2);
    expect(service.recordPageView).toHaveBeenLastCalledWith("p2");
  });

  it("never registers in preview mode", async() => {
    const { result } = renderTracker("TEACHER");

    await advance(PAGE_VIEW_DELAY_MS * 2);
    await act(async() => {
      await result.current.markViewedNow();
    });

    expect(service.recordPageView).not.toHaveBeenCalled();
  });

  it("never rejects when the registration fails", async() => {
    service.recordPageView.mockRejectedValue(new Error("offline"));
    const { result } = renderTracker();

    await act(async() => {
      await expect(result.current.markViewedNow()).resolves.toBeUndefined();
    });
  });

  it("updates the cached module progress of that lesson with the response values", async() => {
    const cache = new Map<string, unknown>();
    const key = unstable_serialize(apiQueryKey(MODULE_PROGRESS_PATH, { params: { moduleId: "m1" } }));
    const cached = moduleProgressDto("m1", 0, [lessonProgressDto("l1", 0, 1), lessonProgressDto("l2", 0, 1)]);

    cache.set(key, { data: { data: cached, pagination: null, message: null, traceId: null } });
    const { result } = renderTracker("STUDENT", cache);

    await act(async() => {
      await result.current.markViewedNow();
    });

    const updated = (cache.get(key) as { data: { data: typeof cached } }).data.data;

    expect(updated.lessons[0]).toEqual({ lessonId: "l1", viewedPages: 1, totalPages: 1, completedByPages: true, completed: true });
    expect(updated.lessons[1]).toEqual(cached.lessons[1]);
    // Percentages are not recalculated in the frontend: the invalidation refetches them.
    expect(updated.percentage).toBe(0);
  });

  it("puts a view that fails with a network error in the user's offline outbox", async() => {
    service.recordPageView.mockRejectedValue(new ApiError({ code: "network.unavailable", message: "offline", status: 0 }));
    const { result } = renderHook(() => usePageViewTracker({ pageId: "p1", moduleId: "m1" }), {
      wrapper: makeWrapper("STUDENT", new Map(), "u1"),
    });

    await act(async() => {
      await result.current.markViewedNow();
    });

    expect(window.localStorage.getItem(progressOutboxKey("u1"))).toBe(JSON.stringify(["p1"]));
  });

  it("drops a view rejected with 403 with a console warning", async() => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    service.recordPageView.mockRejectedValue(new ApiError({ code: "progress.lesson_locked", message: "locked", status: 403 }));
    const { result } = renderHook(() => usePageViewTracker({ pageId: "p1", moduleId: "m1" }), {
      wrapper: makeWrapper("STUDENT", new Map(), "u1"),
    });

    await act(async() => {
      await result.current.markViewedNow();
    });

    expect(window.localStorage.getItem(progressOutboxKey("u1"))).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("p1"), expect.any(ApiError));
    warn.mockRestore();
  });
});
