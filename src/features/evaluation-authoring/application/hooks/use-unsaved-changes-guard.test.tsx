/*
* Funcionalidad: useUnsavedChangesGuard tests
* Descripción: Hook tests of the unsaved-changes guard with a mocked next/router (route events and beforePopState): the browser Back button asks for confirmation through beforePopState, a cancel keeps the current URL and stops Next.js, an accepted one is not asked again on routeChangeStart; allowNextNavigation lets exactly one navigation through and its bypass ends when that navigation completes or, when no navigation starts, after the timeout. Depends on vitest, Testing Library and the guard hook.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALLOW_NAVIGATION_TIMEOUT_MS, useUnsavedChangesGuard } from "./use-unsaved-changes-guard";

type PopStateHandler = (state: unknown) => boolean;

const router = vi.hoisted(() => {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();

  return {
    handlers,
    asPath: "/evaluations/manage/e1/edit",
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

    expect(router.popState?.({})).toBe(false);
    expect(pushState).toHaveBeenCalledWith(window.history.state, "", "/evaluations/manage/e1/edit");

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
});
