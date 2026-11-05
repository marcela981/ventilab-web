/*
* Funcionalidad: Theme preference tests
* Descripción: public/theme-init.js (run as the browser runs it) sets data-mui-color-scheme and data-palette from localStorage ventylab.theme.v1 or the system mode, ignores corrupt or unknown values and agrees with readStoredTheme; themeStorageManager stores the MUI mode in the same JSON without touching the palette, answers "system" as no stored mode and leaves the scheme-name keys alone; setThemePalette stores the palette and sets data-palette. Depends on vitest, node:fs and ./theme-preference.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readStoredTheme, setThemePalette, THEME_STORAGE_KEY, themeStorageManager } from "./theme-preference";

const INIT_SCRIPT = readFileSync(join(process.cwd(), "public/theme-init.js"), "utf8");

function runInitScript(systemDark: boolean | null) {
  if (systemDark === null) {
    vi.stubGlobal("matchMedia", undefined);
  } else {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("dark") ? systemDark : !systemDark }));
  }
  new Function(INIT_SCRIPT)();
  const root = document.documentElement;
  return { mode: root.getAttribute("data-mui-color-scheme"), palette: root.getAttribute("data-palette") };
}

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-mui-color-scheme");
  document.documentElement.removeAttribute("data-palette");
});

describe("public/theme-init.js", () => {
  it("follows the system mode with the VentyLab palette when nothing is stored", () => {
    expect(runInitScript(true)).toEqual({ mode: "dark", palette: "ventylab" });
    expect(runInitScript(false)).toEqual({ mode: "light", palette: "ventylab" });
    expect(runInitScript(null)).toEqual({ mode: "dark", palette: "ventylab" });
  });

  it("applies the stored choice over the system mode", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode: "light", palette: "univalle" }));
    expect(runInitScript(true)).toEqual({ mode: "light", palette: "univalle" });
    expect(readStoredTheme()).toEqual({ mode: "light", palette: "univalle" });
  });

  it("ignores corrupt and unknown values, like readStoredTheme", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "{not json");
    expect(runInitScript(false)).toEqual({ mode: "light", palette: "ventylab" });
    expect(readStoredTheme()).toEqual({});

    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode: "sepia", palette: "neon" }));
    expect(runInitScript(true)).toEqual({ mode: "dark", palette: "ventylab" });
    expect(readStoredTheme()).toEqual({});
  });
});

describe("themeStorageManager and the palette store", () => {
  it("stores the MUI mode in the shared JSON, keeping the palette", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ palette: "univalle" }));
    const modeStorage = themeStorageManager({ key: "mui-mode" });

    expect(modeStorage.get("system")).toBe("system");
    modeStorage.set("dark");
    expect(readStoredTheme()).toEqual({ mode: "dark", palette: "univalle" });
    expect(modeStorage.get("system")).toBe("dark");
    modeStorage.set("system");
    expect(readStoredTheme()).toEqual({ palette: "univalle" });
  });

  it("leaves the MUI scheme-name keys out of storage", () => {
    const lightStorage = themeStorageManager({ key: "mui-color-scheme-light" });
    lightStorage.set("light");
    expect(lightStorage.get("light")).toBe("light");
    expect(window.localStorage.getItem("mui-color-scheme-light")).toBeNull();
  });

  it("notifies the mode stored by another tab", () => {
    const handler = vi.fn();
    const unsubscribe = themeStorageManager({ key: "mui-mode" }).subscribe(handler);
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode: "light" }));
    window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY }));
    unsubscribe();
    expect(handler).toHaveBeenCalledWith("light");
  });

  it("setThemePalette stores the palette and sets data-palette", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode: "light" }));
    setThemePalette("univalle");
    expect(document.documentElement.getAttribute("data-palette")).toBe("univalle");
    expect(readStoredTheme()).toEqual({ mode: "light", palette: "univalle" });
  });
});
