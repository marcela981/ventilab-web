/*
* Funcionalidad: Theme preference store (mode × palette)
* Descripción: The appearance preference of this browser in localStorage `ventylab.theme.v1` ({ mode?: "light"|"dark", palette?: "ventylab"|"univalle" }; no mode = follow the system, no palette = VentyLab), the same key public/theme-init.js reads before the first paint (DISENO_AJUSTES_D §6.3). themeStorageManager is the MUI StorageManager over that key (the mode; MUI applies data-mui-color-scheme), the palette store sets data-palette on <html> and follows other tabs, and useThemeAppearance() joins both for the controls (resolved mode, palette, setters, whether the mode was chosen). Storage is wrapped in try/catch: without it the choice lives in memory. Depends on React, @mui/material/styles and ./theme-palettes.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useColorScheme } from "@mui/material/styles";
import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_THEME_PALETTE,
  isThemeMode,
  isThemePaletteId,
  PALETTE_ATTRIBUTE,
} from "./theme-palettes";
import type { ThemeMode, ThemePaletteId } from "./theme-palettes";

export const THEME_STORAGE_KEY = "ventylab.theme.v1";

export type StoredTheme = { mode?: ThemeMode, palette?: ThemePaletteId };

/** The stored preference; invalid or unreadable values are dropped. */
export function readStoredTheme(): StoredTheme {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(THEME_STORAGE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    const { mode, palette } = parsed as Record<string, unknown>;
    return { ...(isThemeMode(mode) ? { mode } : {}), ...(isThemePaletteId(palette) ? { palette } : {}) };
  } catch {
    return {};
  }
}

function writeStoredTheme(patch: Partial<Record<keyof StoredTheme, string | undefined>>): void {
  const next: Record<string, string | undefined> = { ...readStoredTheme(), ...patch };
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: the choice only lives in memory for this page.
  }
}

// --- MUI storage manager (mode) ---

type StorageManagerArgs = { key: string, storageWindow?: Window | null };
type StorageManagerApi = { get: (defaultValue: unknown) => unknown, set: (value: unknown) => void, subscribe: (handler: (value: unknown) => void) => () => void };

const MUI_MODE_STORAGE_KEY = "mui-mode";

function noop() {}

/**
 * MUI StorageManager: the mode lives in the JSON of THEME_STORAGE_KEY ("system" = no stored mode); MUI's
 * light/dark color scheme names are fixed (light, dark), so those keys are not stored.
 */
export function themeStorageManager({ key }: StorageManagerArgs): StorageManagerApi {
  if (key !== MUI_MODE_STORAGE_KEY) {
    return { get: (defaultValue) => defaultValue, set: noop, subscribe: () => noop };
  }

  return {
    get: (defaultValue) => (typeof window === "undefined" ? undefined : readStoredTheme().mode ?? defaultValue),
    set: (value) => writeStoredTheme({ mode: isThemeMode(value) ? value : undefined }),
    subscribe: (handler) => {
      const listener = (event: StorageEvent) => {
        if (event.key === THEME_STORAGE_KEY) handler(readStoredTheme().mode ?? null);
      };
      window.addEventListener("storage", listener);
      return () => window.removeEventListener("storage", listener);
    },
  };
}

// --- Palette store ---

const paletteListeners = new Set<() => void>();
let currentPalette: ThemePaletteId | null = null;

function readPalette(): ThemePaletteId {
  return readStoredTheme().palette ?? DEFAULT_THEME_PALETTE;
}

function applyPaletteAttribute(palette: ThemePaletteId): void {
  document.documentElement.setAttribute(PALETTE_ATTRIBUTE, palette);
}

function getPalette(): ThemePaletteId {
  // Without subscribers nothing follows storage: read it again (a render before the subscription).
  if (paletteListeners.size === 0) currentPalette = null;
  currentPalette ??= readPalette();
  return currentPalette;
}

function getServerPalette(): ThemePaletteId {
  return DEFAULT_THEME_PALETTE;
}

function onPaletteStorage(event: StorageEvent): void {
  if (event.key !== THEME_STORAGE_KEY) return;
  currentPalette = readPalette();
  applyPaletteAttribute(currentPalette);
  paletteListeners.forEach((listener) => listener());
}

function subscribePalette(listener: () => void): () => void {
  if (paletteListeners.size === 0) {
    currentPalette = null;
    window.addEventListener("storage", onPaletteStorage);
  }
  paletteListeners.add(listener);
  return () => {
    paletteListeners.delete(listener);
    if (paletteListeners.size === 0) window.removeEventListener("storage", onPaletteStorage);
  };
}

export function setThemePalette(palette: ThemePaletteId): void {
  currentPalette = palette;
  writeStoredTheme({ palette });
  applyPaletteAttribute(palette);
  paletteListeners.forEach((listener) => listener());
}

export type ThemeAppearance = {
  /** The mode on screen (the system one while none was chosen). */
  mode: ThemeMode
  /** Whether the user chose a mode (false = following the system). */
  modeChosen: boolean
  palette: ThemePaletteId
  setMode: (mode: ThemeMode) => void
  setPalette: (palette: ThemePaletteId) => void
};

/** Mode (MUI color scheme) and palette of the interface; must be used under the MUI ThemeProvider. */
export function useThemeAppearance(): ThemeAppearance {
  const { mode, systemMode, setMode: setMuiMode } = useColorScheme();
  const palette = useSyncExternalStore(subscribePalette, getPalette, getServerPalette);
  const resolved: ThemeMode = mode === "light" || mode === "dark" ? mode : systemMode === "light" ? "light" : "dark";
  const setMode = useCallback((next: ThemeMode) => setMuiMode(next), [setMuiMode]);

  return { mode: resolved, modeChosen: mode === "light" || mode === "dark", palette, setMode, setPalette: setThemePalette };
}
