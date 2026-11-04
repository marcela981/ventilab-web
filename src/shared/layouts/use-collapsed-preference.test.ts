/*
* Funcionalidad: Collapsed side menu preference tests
* Descripción: Verifies the createCollapsedPreference factory: expanded by default, toggle writes "1" and removes the key when expanding again, a stored "1" is restored, two keys are independent stores (sidebar and panel, D13), another tab's change arrives through the `storage` event and a throwing storage keeps the in-memory state. v1.0 (Bloque 5): new.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCollapsedPreference,
  PANEL_COLLAPSED_STORAGE_KEY,
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  usePanelCollapsed,
  useSidebarCollapsed,
} from "./use-collapsed-preference";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createCollapsedPreference", () => {
  it("starts expanded and persists the toggle under its key", () => {
    const useTest = createCollapsedPreference("ventylab.test.collapsed");
    const { result } = renderHook(() => useTest());

    expect(result.current[0]).toBe(false);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem("ventylab.test.collapsed")).toBe("1");
    act(() => result.current[1]());
    expect(result.current[0]).toBe(false);
    expect(window.localStorage.getItem("ventylab.test.collapsed")).toBeNull();
  });

  it("restores a stored collapsed state", () => {
    window.localStorage.setItem("ventylab.restore.collapsed", "1");
    const useTest = createCollapsedPreference("ventylab.restore.collapsed");
    const { result } = renderHook(() => useTest());

    expect(result.current[0]).toBe(true);
  });

  it("keeps the sidebar and the panel keys independent (D13)", () => {
    const sidebar = renderHook(() => useSidebarCollapsed());
    const panel = renderHook(() => usePanelCollapsed());

    act(() => sidebar.result.current[1]());

    expect(sidebar.result.current[0]).toBe(true);
    expect(panel.result.current[0]).toBe(false);
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe("1");
    expect(window.localStorage.getItem(PANEL_COLLAPSED_STORAGE_KEY)).toBeNull();
    act(() => sidebar.result.current[1]());
  });

  it("follows another tab through the storage event", () => {
    const useTest = createCollapsedPreference("ventylab.tabs.collapsed");
    const { result } = renderHook(() => useTest());

    act(() => {
      window.localStorage.setItem("ventylab.tabs.collapsed", "1");
      window.dispatchEvent(new StorageEvent("storage", { key: "ventylab.tabs.collapsed" }));
    });

    expect(result.current[0]).toBe(true);
  });

  it("keeps the state in memory when the storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const useTest = createCollapsedPreference("ventylab.blocked.collapsed");
    const { result } = renderHook(() => useTest());

    expect(result.current[0]).toBe(false);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
  });
});
