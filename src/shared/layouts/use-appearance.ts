/*
* Funcionalidad: Appearance preference of the session user
* Descripción: Joins the browser preference (useThemeAppearance of the design system: localStorage ventylab.theme.v1, mode through MUI, data-palette) with the per-user preference of the server (AuthUserDTO.themeMode/themePalette of GET /api/auth/me, saved with PATCH /api/users/me; DISENO_AJUSTES_D §6.3). useAppearance() is what the controls use: every change applies at once and, with a session, is saved on the server too (best effort: a failed save keeps the local choice). useThemePreferenceSync() reconciles once per signed-in user: the server value wins when it exists; otherwise a mode or palette chosen in this browser is saved for the user. The request layer is imported lazily (the app shell does not ship axios). Depends on React, @shared/session and the design-system theme preference.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useRef } from "react";
import { readStoredTheme, useThemeAppearance } from "@shared/design-system/theme/theme-preference";
import type { ThemeAppearance } from "@shared/design-system/theme/theme-preference";
import { isThemeMode, isThemePaletteId } from "@shared/design-system/theme/theme-palettes";
import type { ThemeMode, ThemePaletteId } from "@shared/design-system/theme/theme-palettes";
import { useSession } from "@shared/session/use-session";

type ThemePatch = { themeMode?: ThemeMode, themePalette?: ThemePaletteId };

// One shared lazy import for concurrent saves (the mode and the palette may change in the same tick).
let requestLayer: Promise<typeof import("@shared/api-client/api-request")> | null = null;

async function saveOnServer(patch: ThemePatch): Promise<void> {
  try {
    requestLayer ??= import("@shared/api-client/api-request");
    const { apiPatch } = await requestLayer;
    await apiPatch("/api/users/me", { body: patch });
  } catch {
    // Best effort: the local choice stays and the next change (or sign-in) saves it again.
  }
}

export function useAppearance(): ThemeAppearance {
  const appearance = useThemeAppearance();
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const { setMode: applyMode, setPalette: applyPalette } = appearance;

  const setMode = useCallback((mode: ThemeMode) => {
    applyMode(mode);
    if (signedIn) void saveOnServer({ themeMode: mode });
  }, [applyMode, signedIn]);

  const setPalette = useCallback((palette: ThemePaletteId) => {
    applyPalette(palette);
    if (signedIn) void saveOnServer({ themePalette: palette });
  }, [applyPalette, signedIn]);

  return { ...appearance, setMode, setPalette };
}

/** Applies the signed-in user's server preference (or uploads the local one) once per user. */
export function useThemePreferenceSync(): void {
  const { user } = useSession();
  const { setMode, setPalette } = useThemeAppearance();
  const reconciledFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      reconciledFor.current = null;
      return;
    }
    if (reconciledFor.current === user.id) return;
    reconciledFor.current = user.id;

    const local = readStoredTheme();
    const upload: ThemePatch = {};

    if (isThemeMode(user.themeMode)) setMode(user.themeMode);
    else if (local.mode) upload.themeMode = local.mode;

    if (isThemePaletteId(user.themePalette)) setPalette(user.themePalette);
    else if (local.palette) upload.themePalette = local.palette;

    if (upload.themeMode || upload.themePalette) void saveOnServer(upload);
  }, [user, setMode, setPalette]);
}

/** Mounted once in pages/_app.js, inside the AuthProvider and the MUI ThemeProvider. */
export function ThemePreferenceSync(): null {
  useThemePreferenceSync();
  return null;
}
