/*
* Funcionalidad: Navigation indicators tests
* Descripción: Verifies the generic nav-indicators registry: nothing is shown until a feeder sets an indicator (no
*   default state is ever invented), a feeder sets and clears its key (an identical indicator keeps the same object),
*   the visibility of a key follows the hosts that display it (and only those keys), and without a provider the
*   registry is empty, setters are no-ops and nothing is visible. Depends on Vitest and Testing Library.
*   v1.1 (T12 review fix W1): replaces the v1.0 tests of the device hook that lived here (now in ventilator-lab).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  NavIndicatorProvider,
  useNavIndicatorHost,
  useNavIndicators,
  useNavIndicatorVisible,
  useSetNavIndicator,
} from "./nav-indicators";
import type { NavIndicatorKey } from "./nav-indicators";

function useRegistry() {
  return {
    indicators: useNavIndicators(),
    set: useSetNavIndicator("ventilatorDevice"),
    visible: useNavIndicatorVisible("ventilatorDevice"),
  };
}

function Host({ keys }: { keys: readonly NavIndicatorKey[] }) {
  useNavIndicatorHost(keys);

  return null;
}

function renderRegistry() {
  return renderHook(() => useRegistry(), {
    wrapper: ({ children }) => <NavIndicatorProvider>{children}</NavIndicatorProvider>,
  });
}

describe("nav-indicators registry", () => {
  it("shows nothing until a feeder sets an indicator, then clears it with null", () => {
    const { result } = renderRegistry();

    expect(result.current.indicators).toEqual({});
    act(() => result.current.set({ tone: "positive", text: "En línea" }));
    expect(result.current.indicators).toEqual({ ventilatorDevice: { tone: "positive", text: "En línea" } });

    const before = result.current.indicators;
    act(() => result.current.set({ tone: "positive", text: "En línea" }));
    expect(result.current.indicators).toBe(before);

    act(() => result.current.set(null));
    expect(result.current.indicators).toEqual({});
  });

  it("reports a key visible only while a host displays it", () => {
    function useWithHost(keys: readonly NavIndicatorKey[] | null) {
      // A host component cannot be rendered by renderHook itself: register through the hook directly.
      useNavIndicatorHost(keys ?? []);

      return useNavIndicatorVisible("ventilatorDevice");
    }

    const { result, rerender, unmount } = renderHook(({ keys }: { keys: readonly NavIndicatorKey[] | null }) => useWithHost(keys), {
      initialProps: { keys: null as readonly NavIndicatorKey[] | null },
      wrapper: ({ children }) => <NavIndicatorProvider>{children}</NavIndicatorProvider>,
    });

    expect(result.current).toBe(false);
    rerender({ keys: ["ventilatorDevice"] });
    expect(result.current).toBe(true);
    rerender({ keys: [] });
    expect(result.current).toBe(false);
    rerender({ keys: ["ventilatorDevice", "ventilatorDevice"] });
    expect(result.current).toBe(true);
    unmount();
  });

  it("counts several hosts of the same key", () => {
    const { result } = renderHook(() => useNavIndicatorVisible("ventilatorDevice"), {
      wrapper: ({ children }) => (
        <NavIndicatorProvider>
          <Host keys={["ventilatorDevice"]} />
          <Host keys={["ventilatorDevice"]} />
          {children}
        </NavIndicatorProvider>
      ),
    });

    expect(result.current).toBe(true);
  });

  it("is empty, invisible and inert without a provider", () => {
    const { result } = renderHook(() => useRegistry());

    expect(result.current.indicators).toEqual({});
    expect(result.current.visible).toBe(false);
    expect(() => result.current.set({ tone: "negative", text: "x" })).not.toThrow();
  });
});
