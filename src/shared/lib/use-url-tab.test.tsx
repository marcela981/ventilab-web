/*
* Funcionalidad: useUrlTab + parseUrlTab tests
* Descripción: The shared URL-owned tab state: parseUrlTab keeps a known key and falls back to the default for a
*   missing, repeated or unknown value; useUrlTab is null until the router is ready, gives the default or the query
*   tab, selects with a shallow replace that keeps the rest of the query, and with ignoreUrl (staff) always gives the
*   default tab and never writes the URL. Depends on vitest, Testing Library and a mocked next/router.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseUrlTab, useUrlTab } from "./use-url-tab";

const router = vi.hoisted(() => ({
  isReady: true,
  pathname: "/learn",
  query: {} as Record<string, string | string[] | undefined>,
  replace: (() => Promise.resolve(true)) as (...args: unknown[]) => Promise<boolean>,
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

const TABS = ["inicio", "curriculo", "progreso"] as const;

beforeEach(() => {
  router.isReady = true;
  router.query = {};
  router.replace = vi.fn(() => Promise.resolve(true));
});

describe("parseUrlTab", () => {
  it.each(TABS)("keeps %s", (value) => {
    expect(parseUrlTab(TABS, "curriculo", value)).toBe(value);
  });

  it.each([undefined, "", "otra", ["inicio", "progreso"]])("falls back to the default for %j", (value) => {
    expect(parseUrlTab(TABS, "curriculo", value)).toBe("curriculo");
  });
});

describe("useUrlTab", () => {
  it("is null until the router is ready", () => {
    router.isReady = false;
    router.query = { tab: "inicio" };

    const { result } = renderHook(() => useUrlTab(TABS, "curriculo"));

    expect(result.current.tab).toBeNull();
  });

  it("gives the default tab without a query", () => {
    const { result } = renderHook(() => useUrlTab(TABS, "curriculo"));

    expect(result.current.tab).toBe("curriculo");
  });

  it("gives the tab of the query and the default for an invalid one", () => {
    router.query = { tab: "progreso" };
    const valid = renderHook(() => useUrlTab(TABS, "curriculo"));

    expect(valid.result.current.tab).toBe("progreso");

    router.query = { tab: "nope" };
    const invalid = renderHook(() => useUrlTab(TABS, "curriculo"));

    expect(invalid.result.current.tab).toBe("curriculo");
  });

  it("selects with a shallow replace that keeps the rest of the query", () => {
    router.query = { tab: "inicio", section: "s1" };
    const { result } = renderHook(() => useUrlTab(TABS, "curriculo"));

    act(() => result.current.selectTab("progreso"));

    expect(router.replace).toHaveBeenCalledWith(
      { pathname: "/learn", query: { tab: "progreso", section: "s1" } },
      undefined,
      { shallow: true },
    );
  });

  it("with ignoreUrl always gives the default tab and never writes the URL", () => {
    router.query = { tab: "progreso" };
    const { result } = renderHook(() => useUrlTab(TABS, "curriculo", { ignoreUrl: true }));

    expect(result.current.tab).toBe("curriculo");

    act(() => result.current.selectTab("inicio"));

    expect(router.replace).not.toHaveBeenCalled();
  });
});
