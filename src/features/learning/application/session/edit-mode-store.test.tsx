/*
* Funcionalidad: Learning edit mode store tests
* Descripción: The staff edit mode store (W4, Bloque 2): off by default, toggled through useEditMode, persisted in localStorage and restored, picked up from another tab (storage event), and still usable when the storage throws. Depends on vitest and Testing Library.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EDIT_MODE_STORAGE_KEY, resetEditModeStore, useEditMode } from "./edit-mode-store";

beforeEach(() => {
  window.localStorage.clear();
  resetEditModeStore();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useEditMode", () => {
  it("starts off, toggles and persists the mode", () => {
    const { result } = renderHook(() => useEditMode());

    expect(result.current.enabled).toBe(false);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.enabled).toBe(true);
    expect(window.localStorage.getItem(EDIT_MODE_STORAGE_KEY)).toBe("1");

    act(() => {
      result.current.toggle();
    });

    expect(result.current.enabled).toBe(false);
    expect(window.localStorage.getItem(EDIT_MODE_STORAGE_KEY)).toBeNull();
  });

  it("restores the persisted mode and follows another tab", () => {
    window.localStorage.setItem(EDIT_MODE_STORAGE_KEY, "1");
    resetEditModeStore();
    const { result } = renderHook(() => useEditMode());

    expect(result.current.enabled).toBe(true);

    act(() => {
      window.localStorage.removeItem(EDIT_MODE_STORAGE_KEY);
      window.dispatchEvent(new StorageEvent("storage", { key: EDIT_MODE_STORAGE_KEY }));
    });

    expect(result.current.enabled).toBe(false);
  });

  it("keeps working when the storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    resetEditModeStore();
    const { result } = renderHook(() => useEditMode());

    expect(result.current.enabled).toBe(false);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.enabled).toBe(true);
  });
});
