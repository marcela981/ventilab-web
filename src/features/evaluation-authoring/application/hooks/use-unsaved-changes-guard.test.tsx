/*
* Funcionalidad: useUnsavedChangesGuard tests
* Descripción: Hook tests of the unsaved-changes guard with a mocked next/router (route events and beforePopState): the browser Back button asks for confirmation through beforePopState, a cancel keeps the current URL and stops Next.js, an accepted one is not asked again on routeChangeStart; allowNextNavigation lets exactly one navigation through and its bypass ends when that navigation completes or, when no navigation starts, after the timeout. Depends on vitest, Testing Library and the guard hook. v1.1 (A3 review W1/S3): a cancelled Back pushes a history state for the current page (as = router.asPath, url = route pathname with query), and the bypass of an accepted Back ends on hashChangeComplete or after the timeout. v1.2 (A4 review S6): the pushed state does not reuse the destination key or options.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALLOW_NAVIGATION_TIMEOUT_MS, currentPageHistoryState, routeHref, useUnsavedChangesGuard } from "./use-unsaved-changes-guard";

type PopStateHandler = (state: unknown) => boolean;

const router = vi.hoisted(() => {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();

  return {
    handlers,
    asPath: "/evaluations/manage/e1/edit",
    pathname: "/evaluations/manage/[evaluationId]/edit",
    query: { evaluationId: "e1" } as Record<string, string>,
    popState: null as PopStateHandler | null,
    beforePopState: (handler: PopStateHandler) => {
      router.popState = handler;
    },
    events: {
      on: (event: string, handler: (...args: unknown[]) => void) => {
        handlers.set(event, (handlers.get(event) ?? new Set()).add(handler));
      },
      off: (event: string, handler: (...args: unknown[]) => void) => {
        handlers.get(event)?.delete(handler);
      },
      emit: vi.fn(),
    },
  };
});

vi.mock("next/router", () => ({ useRouter: () => router }));

function fire(event: string, url = "/evaluations/manage") {
  for (const handler of router.handlers.get(event) ?? []) {
    handler(url);
  }
}

function renderGuard(dirty = true) {
  return renderHook(({ isDirty }) => useUnsavedChangesGuard(isDirty, "¿Salir?"), { initialProps: { isDirty: dirty } });
}

beforeEach(() => {
  router.handlers.clear();
  router.popState = null;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("useUnsavedChangesGuard", () => {
  it("guards the browser Back button through beforePopState", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);

    renderGuard();

    // During popstate history.state already belongs to the destination page.
    window.history.replaceState(
      { __N: true, url: "/evaluations/manage", as: "/evaluations/manage", key: "k1", options: { shallow: true, scroll: false } },
      "",
    );

    expect(router.popState?.({})).toBe(false);
    expect(pushState).toHaveBeenCalledTimes(1);
    const [pushed, , pushedUrl] = pushState.mock.calls[0] ?? [];

    expect(pushedUrl).toBe(router.asPath);
    expect(pushed).toMatchObject({
      __N: true,
      as: router.asPath,
      url: "/evaluations/manage/[evaluationId]/edit?evaluationId=e1",
      options: {},
    });
    // The destination key and options are not reused.
    expect((pushed as Record<string, unknown>).key).not.toBe("k1");

    expect(router.popState?.({})).toBe(true);
    // The accepted Back navigation is not asked again when Next.js starts it.
    expect(() => fire("routeChangeStart")).not.toThrow();
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("restores a permissive beforePopState when nothing is dirty", () => {
    const { rerender } = renderGuard();

    rerender({ isDirty: false });

    expect(router.popState?.({})).toBe(true);
  });

  it("lets exactly one navigation through and ends the bypass when it completes", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { result } = renderGuard();

    act(() => {
      result.current.allowNextNavigation();
    });
    expect(() => fire("routeChangeStart")).not.toThrow();
    fire("routeChangeComplete");

    expect(() => fire("routeChangeStart")).toThrow();
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it("ends the bypass after the timeout when no navigation starts", () => {
    vi.useFakeTimers();
    vi.spyOn(window, "confirm").mockReturnValue(false);

    const { result } = renderGuard();

    act(() => {
      result.current.allowNextNavigation();
    });
    act(() => {
      vi.advanceTimersByTime(ALLOW_NAVIGATION_TIMEOUT_MS);
    });

    expect(() => fire("routeChangeStart")).toThrow();
  });

  it("ends the bypass of an accepted Back on hashChangeComplete", () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(true).mockReturnValue(false);
    renderGuard();

    expect(router.popState?.({})).toBe(true);
    fire("hashChangeComplete");

    expect(() => fire("routeChangeStart")).toThrow();
  });

  it("ends the bypass of an accepted Back after the timeout when no navigation follows", () => {
    vi.useFakeTimers();
    vi.spyOn(window, "confirm").mockReturnValueOnce(true).mockReturnValue(false);
    renderGuard();

    expect(router.popState?.({})).toBe(true);
    act(() => {
      vi.advanceTimersByTime(ALLOW_NAVIGATION_TIMEOUT_MS);
    });

    expect(() => fire("routeChangeStart")).toThrow();
  });
});

describe("currentPageHistoryState", () => {
  it("builds a fresh Next-compatible state for the current page", () => {
    expect(currentPageHistoryState("/x/[id]", { id: "1" }, "/x/1", "abc")).toEqual({
      __N: true,
      url: "/x/[id]?id=1",
      as: "/x/1",
      options: {},
      key: "abc",
    });
    expect(currentPageHistoryState("/x", {}, "/x").key).toMatch(/^[a-z0-9]+$/);
  });
});

describe("routeHref", () => {
  it("joins the route pathname and its query, including repeated values", () => {
    expect(routeHref("/evaluations/manage/[evaluationId]/edit", { evaluationId: "e 1" })).toBe("/evaluations/manage/[evaluationId]/edit?evaluationId=e+1");
    expect(routeHref("/x", { tag: ["a", "b"], empty: undefined })).toBe("/x?tag=a&tag=b");
    expect(routeHref("/x", {})).toBe("/x");
  });
});
