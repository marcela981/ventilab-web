/*
* Funcionalidad: Theme palettes (mode × palette)
* Descripción: Single source of the four color combinations of VentyLab (palettes VentyLab and Univalle × modes light and dark, DISENO_AJUSTES_D §6): the MUI palette of each scheme (brand, status, background, text, divider, actions) and the palette-dependent --vl-* tokens (accent, raised surface, links, shadows, sidebar, user card, auth background, staff panel, glass, console base and pending highlight, learning and evaluation brand edges). VentyLab light/dark feed the colorSchemes of the MUI theme; the generated stylesheet UI/theme-palettes.generated.css emits the --vl-* tokens of the four combinations and the --mui-palette-* overrides of Univalle under [data-palette="univalle"][data-mui-color-scheme="…"]. VentyLab dark keeps the July values of Bloque 5; Univalle uses the official colors of the Manual de Identidad Visual Corporativa (docs/cierre/paleta.md). WCAG AA is verified by theme-palettes.contrast.test.ts. Depends on ./palette.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { colors, darkColors } from "./palette";

export const THEME_MODES = ["light", "dark"] as const;
export const THEME_PALETTE_IDS = ["ventylab", "univalle"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];
export type ThemePaletteId = (typeof THEME_PALETTE_IDS)[number];

export const DEFAULT_THEME_PALETTE: ThemePaletteId = "ventylab";

/** The <html> attribute that selects the palette (the mode is MUI's data-mui-color-scheme). */
export const PALETTE_ATTRIBUTE = "data-palette";
export const MODE_ATTRIBUTE = "data-mui-color-scheme";

type ColorRole = { main: string, light: string, dark: string, contrastText: string };

export type SchemeMuiPalette = {
  primary: ColorRole
  secondary: ColorRole
  info: ColorRole
  success: ColorRole
  warning: ColorRole
  error: ColorRole
  background: { default: string, paper: string, contrast: string }
  text: { primary: string, secondary: string, disabled: string, hint: string }
  divider: string
  action: { active: string, hover: string, selected: string, disabled: string, disabledBackground: string, focus: string }
};

/** Palette-dependent --vl-* tokens; every combination defines all of them (the generated CSS emits them). */
export const PALETTE_TOKEN_NAMES = [
  "--vl-color-accent",
  "--vl-color-on-accent",
  "--vl-color-bg-gradient",
  "--vl-color-surface-raised",
  "--vl-color-link",
  "--vl-color-link-hover",
  "--vl-shadow-1",
  "--vl-shadow-2",
  "--vl-shadow-3",
  "--vl-scrollbar-thumb",
  "--vl-scrollbar-thumb-hover",
  "--vl-sidebar-bg",
  "--vl-sidebar-item-active-bg",
  "--vl-sidebar-version",
  "--vl-user-card-bg",
  "--vl-user-card-bg-hover",
  "--vl-auth-bg",
  "--vl-auth-on-bg",
  "--vl-panel-sidebar-bg",
  "--vl-panel-sidebar-text",
  "--vl-panel-sidebar-muted",
  "--vl-panel-sidebar-faint",
  "--vl-panel-accent",
  "--vl-panel-item-active-bg",
  "--vl-panel-item-active-hover-bg",
  "--vl-panel-item-active-icon",
  "--vl-panel-content-bg",
  "--vl-panel-bg",
  "--vl-panel-paper",
  "--vl-panel-divider",
  "--vl-panel-raised",
  "--vl-glass-bg",
  "--vl-glass-bg-hover",
  "--vl-glass-border",
  "--vl-glass-accent-cyan-text",
  "--vl-glass-accent-green-text",
  "--vl-glass-accent-violet-text",
  "--vl-glass-accent-orange-text",
  "--vl-console-bg",
  "--vl-console-pending",
  "--vl-learn-tab-indicator",
  "--vl-learn-module-open-border",
  "--vl-eval-explanation-border",
  "--vl-level-prereq",
  "--vl-level-advanced-text",
] as const;

export type PaletteTokenName = (typeof PALETTE_TOKEN_NAMES)[number];
export type PaletteTokens = Record<PaletteTokenName, string>;

export type SchemeDefinition = { mui: SchemeMuiPalette, tokens: PaletteTokens };

// --- Status colors: semantic, shared by both palettes, AA-adjusted per mode. ---
// Dark mode keeps the July mains; their text is the dark ink of the palette (white was 2.16-3.68:1).
const statusDark = (ink: string) => ({
  success: { main: colors.success, light: "#81c784", dark: "#388e3c", contrastText: ink },
  warning: { main: colors.warning, light: "#ffb74d", dark: "#f57c00", contrastText: ink },
  error: { main: colors.error, light: "#e57373", dark: "#d32f2f", contrastText: ink },
});

// Light mode: the July mains fail as text on white (#F44336 3.68:1, #FF9800 2.15:1); these reach AA.
const STATUS_LIGHT = {
  success: { main: "#2e7d32", light: "#4caf50", dark: "#1b5e20", contrastText: "#ffffff" },
  warning: { main: "#b45309", light: "#ff9800", dark: "#8a3f06", contrastText: "#ffffff" },
  error: { main: "#d32f2f", light: "#e57373", dark: "#b71c1c", contrastText: "#ffffff" },
} as const;

// --- Mode-only tokens (identical in both palettes). ---
const DARK_SHADOWS = {
  "--vl-shadow-1": "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)",
  "--vl-shadow-2": "0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)",
  "--vl-shadow-3": "0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)",
  "--vl-scrollbar-thumb": "rgba(255, 255, 255, 0.2)",
  "--vl-scrollbar-thumb-hover": "rgba(255, 255, 255, 0.3)",
} as const;

const LIGHT_SHADOWS = {
  "--vl-shadow-1": "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)",
  "--vl-shadow-2": "0 2px 6px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)",
  "--vl-shadow-3": "0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.06)",
  // Black 25%: the white 20% thumb inherited from July was invisible on white.
  "--vl-scrollbar-thumb": "rgba(0, 0, 0, 0.25)",
  "--vl-scrollbar-thumb-hover": "rgba(0, 0, 0, 0.35)",
} as const;

const DARK_GLASS = {
  "--vl-glass-bg": "rgba(255, 255, 255, 0.05)",
  "--vl-glass-bg-hover": "rgba(255, 255, 255, 0.09)",
  "--vl-glass-border": "rgba(255, 255, 255, 0.1)",
  "--vl-glass-accent-cyan-text": "#7dd3fc",
  "--vl-glass-accent-green-text": "#86efac",
  "--vl-glass-accent-violet-text": "#d1c4e9",
  "--vl-glass-accent-orange-text": "#fcd34d",
  "--vl-level-prereq": "#9e9e9e",
  "--vl-level-advanced-text": "#ff6659",
} as const;

// Light glass tints with the navy text color; accent texts darkened to AA on white.
const LIGHT_GLASS = {
  "--vl-glass-bg": "rgba(10, 17, 43, 0.03)",
  "--vl-glass-bg-hover": "rgba(10, 17, 43, 0.06)",
  "--vl-glass-border": "rgba(10, 17, 43, 0.1)",
  "--vl-glass-accent-cyan-text": "#0b6e99",
  "--vl-glass-accent-green-text": "#2e7d32",
  "--vl-glass-accent-violet-text": "#5e35b1",
  "--vl-glass-accent-orange-text": "#b45309",
  "--vl-level-prereq": "#616161",
  "--vl-level-advanced-text": "#c62828",
} as const;

const VENTYLAB_CONSOLE = { "--vl-console-bg": "#0a112b", "--vl-console-pending": "#10aede" } as const;
// Univalle: near-black grey console with the July curves (§7b-11); pending in the manual's expressive cyan.
const UNIVALLE_CONSOLE = { "--vl-console-bg": "#161616", "--vl-console-pending": "#42a8bf" } as const;

/** VentyLab dark: the July skin of Bloque 5 (navy, opaque glass surfaces, cyan primary). */
const VENTYLAB_DARK: SchemeDefinition = {
  mui: {
    primary: { main: colors.primary, light: colors.accent, dark: colors.secondary, contrastText: colors.onPrimary },
    // Navy text on the blues too (white was 3.20:1 on secondary and 2.58:1 on info).
    secondary: { main: colors.secondary, light: colors.accent, dark: "#0a112b", contrastText: colors.onPrimary },
    info: { main: colors.info, light: colors.accent, dark: colors.secondary, contrastText: colors.onPrimary },
    ...statusDark(colors.onPrimary),
    background: {
      default: darkColors.backgroundDefault,
      paper: darkColors.backgroundPaper,
      contrast: darkColors.backgroundContrast,
    },
    text: {
      primary: darkColors.textPrimary,
      secondary: darkColors.textSecondary,
      disabled: darkColors.textDisabled,
      hint: darkColors.textHint,
    },
    divider: darkColors.border,
    action: {
      active: colors.primary,
      hover: darkColors.hover,
      selected: darkColors.selected,
      disabled: darkColors.textDisabled,
      disabledBackground: darkColors.disabledBackground,
      focus: "rgba(16, 174, 222, 0.12)",
    },
  },
  tokens: {
    // Logo green (public/images/logo.png, about #8cd94a) with navy text: 10.76:1.
    "--vl-color-accent": "#8cd94a",
    "--vl-color-on-accent": "#0a112b",
    "--vl-color-bg-gradient": "linear-gradient(180deg, #0a112b 0%, #0a0f26 100%)",
    "--vl-color-surface-raised": "#1e243c",
    "--vl-color-link": colors.primary,
    "--vl-color-link-hover": colors.accent,
    ...DARK_SHADOWS,
    "--vl-sidebar-bg": darkColors.backgroundPaper,
    "--vl-sidebar-item-active-bg": darkColors.selected,
    "--vl-sidebar-version": "rgba(255, 255, 255, 0.5)",
    "--vl-user-card-bg": "rgba(255, 255, 255, 0.08)",
    "--vl-user-card-bg-hover": "rgba(255, 255, 255, 0.12)",
    "--vl-auth-bg": "linear-gradient(135deg, #0a112b 0%, #11284f 55%, #0b4566 100%)",
    "--vl-auth-on-bg": darkColors.textPrimary,
    "--vl-panel-sidebar-bg": "#1a237e",
    "--vl-panel-sidebar-text": "#e8eaf6",
    "--vl-panel-sidebar-muted": "rgba(255, 255, 255, 0.7)",
    "--vl-panel-sidebar-faint": "rgba(255, 255, 255, 0.55)",
    "--vl-panel-accent": "#8457ff",
    "--vl-panel-item-active-bg": "rgba(124, 77, 255, 0.3)",
    "--vl-panel-item-active-hover-bg": "rgba(124, 77, 255, 0.4)",
    "--vl-panel-item-active-icon": "#b388ff",
    "--vl-panel-content-bg": "linear-gradient(160deg, #080d1a 0%, #0f1c35 55%, #0a1220 100%)",
    "--vl-panel-bg": "#0a1220",
    "--vl-panel-paper": "#19253d",
    "--vl-panel-divider": "rgba(255, 255, 255, 0.09)",
    "--vl-panel-raised": "#222e47",
    ...DARK_GLASS,
    ...VENTYLAB_CONSOLE,
    "--vl-learn-tab-indicator": "#2196f3",
    "--vl-learn-module-open-border": "#0bbaf4",
    "--vl-eval-explanation-border": colors.accent,
  },
};

/** VentyLab light: blues and greens of the logo; the brand cyan darkened to AA for text and fills. */
const VENTYLAB_LIGHT: SchemeDefinition = {
  mui: {
    primary: { main: "#0b6e99", light: colors.primary, dark: "#08506f", contrastText: "#ffffff" },
    secondary: { main: "#3b7a1e", light: "#8cd94a", dark: "#2a5a14", contrastText: "#ffffff" },
    info: { main: "#0b6e99", light: colors.primary, dark: "#08506f", contrastText: "#ffffff" },
    ...STATUS_LIGHT,
    background: { default: "#f5f9fc", paper: "#ffffff", contrast: "#0a112b" },
    text: { primary: "#0a112b", secondary: "#5b6472", disabled: "rgba(10, 17, 43, 0.45)", hint: "rgba(10, 17, 43, 0.45)" },
    divider: "rgba(10, 17, 43, 0.12)",
    action: {
      active: "#0b6e99",
      hover: "rgba(11, 110, 153, 0.08)",
      selected: "rgba(11, 110, 153, 0.12)",
      disabled: "rgba(10, 17, 43, 0.45)",
      disabledBackground: "rgba(10, 17, 43, 0.12)",
      focus: "rgba(11, 110, 153, 0.12)",
    },
  },
  tokens: {
    "--vl-color-accent": "#3b7a1e",
    "--vl-color-on-accent": "#ffffff",
    "--vl-color-bg-gradient": "linear-gradient(180deg, #f5f9fc 0%, #eef5f0 100%)",
    "--vl-color-surface-raised": "#eef4f9",
    "--vl-color-link": "#0b6e99",
    "--vl-color-link-hover": "#08506f",
    ...LIGHT_SHADOWS,
    "--vl-sidebar-bg": "#ffffff",
    "--vl-sidebar-item-active-bg": "rgba(11, 110, 153, 0.12)",
    "--vl-sidebar-version": "#5b6472",
    "--vl-user-card-bg": "#f5f9fc",
    "--vl-user-card-bg-hover": "rgba(11, 110, 153, 0.08)",
    "--vl-auth-bg": "linear-gradient(135deg, #e3f2fd 0%, #eef7f1 55%, #e6f4ea 100%)",
    "--vl-auth-on-bg": "#0a112b",
    "--vl-panel-sidebar-bg": "#ffffff",
    "--vl-panel-sidebar-text": "#0a112b",
    "--vl-panel-sidebar-muted": "#5b6472",
    "--vl-panel-sidebar-faint": "#5b6472",
    "--vl-panel-accent": "#3949ab",
    "--vl-panel-item-active-bg": "rgba(57, 73, 171, 0.12)",
    "--vl-panel-item-active-hover-bg": "rgba(57, 73, 171, 0.18)",
    "--vl-panel-item-active-icon": "#3949ab",
    "--vl-panel-content-bg": "linear-gradient(160deg, #f5f9fc 0%, #edf3f9 100%)",
    "--vl-panel-bg": "#f5f9fc",
    "--vl-panel-paper": "#ffffff",
    "--vl-panel-divider": "rgba(10, 17, 43, 0.12)",
    "--vl-panel-raised": "#eef4f9",
    ...LIGHT_GLASS,
    ...VENTYLAB_CONSOLE,
    "--vl-learn-tab-indicator": "#0b6e99",
    "--vl-learn-module-open-border": "#0b6e99",
    "--vl-eval-explanation-border": "#0b6e99",
  },
};

// Univalle official colors (Manual de Identidad Visual Corporativa, p. 30 and 44; docs/cierre/paleta.md).
const UNIVALLE_RED = "#c20e1a";
const UNIVALLE_WINE = "#841f1c";
const UNIVALLE_WINE_FUNCTIONAL = "#9b1d1c";
const UNIVALLE_RED_FUNCTIONAL = "#c73735";
const UNIVALLE_WINE_DARK = "#3f1517";
const UNIVALLE_GREY = "#636363";
const UNIVALLE_GREY_LIGHT = "#cfcfcf";
// Red lightened for AA on the dark greys (the official red is 3.3:1 on #121212).
const UNIVALLE_RED_ON_DARK = "#f26b73";

/** Univalle light: red, wine and white. */
const UNIVALLE_LIGHT: SchemeDefinition = {
  mui: {
    primary: { main: UNIVALLE_RED, light: UNIVALLE_RED_FUNCTIONAL, dark: UNIVALLE_WINE_FUNCTIONAL, contrastText: "#ffffff" },
    secondary: { main: UNIVALLE_WINE, light: UNIVALLE_WINE_FUNCTIONAL, dark: UNIVALLE_WINE_DARK, contrastText: "#ffffff" },
    // Expressive blue of the manual (#3D5AA2, printed "#RD5AA2"), kept for information.
    info: { main: "#3d5aa2", light: "#42a8bf", dark: "#2c4277", contrastText: "#ffffff" },
    ...STATUS_LIGHT,
    background: { default: "#f8f5f5", paper: "#ffffff", contrast: UNIVALLE_WINE_DARK },
    text: { primary: UNIVALLE_WINE_DARK, secondary: UNIVALLE_GREY, disabled: "rgba(63, 21, 23, 0.45)", hint: "rgba(63, 21, 23, 0.45)" },
    divider: "rgba(63, 21, 23, 0.14)",
    action: {
      active: UNIVALLE_RED,
      hover: "rgba(194, 14, 26, 0.06)",
      selected: "rgba(194, 14, 26, 0.1)",
      disabled: "rgba(63, 21, 23, 0.45)",
      disabledBackground: "rgba(63, 21, 23, 0.12)",
      focus: "rgba(194, 14, 26, 0.12)",
    },
  },
  tokens: {
    "--vl-color-accent": UNIVALLE_WINE,
    "--vl-color-on-accent": "#ffffff",
    "--vl-color-bg-gradient": "linear-gradient(180deg, #f8f5f5 0%, #f3eded 100%)",
    "--vl-color-surface-raised": "#f6eeee",
    "--vl-color-link": UNIVALLE_RED,
    "--vl-color-link-hover": UNIVALLE_WINE,
    ...LIGHT_SHADOWS,
    "--vl-sidebar-bg": "#ffffff",
    "--vl-sidebar-item-active-bg": "rgba(194, 14, 26, 0.1)",
    "--vl-sidebar-version": UNIVALLE_GREY,
    "--vl-user-card-bg": "#f8f5f5",
    "--vl-user-card-bg-hover": "rgba(194, 14, 26, 0.06)",
    "--vl-auth-bg": `linear-gradient(135deg, ${UNIVALLE_RED} 0%, ${UNIVALLE_WINE} 100%)`,
    "--vl-auth-on-bg": "#ffffff",
    "--vl-panel-sidebar-bg": "#ffffff",
    "--vl-panel-sidebar-text": UNIVALLE_WINE_DARK,
    "--vl-panel-sidebar-muted": UNIVALLE_GREY,
    "--vl-panel-sidebar-faint": UNIVALLE_GREY,
    "--vl-panel-accent": UNIVALLE_RED,
    "--vl-panel-item-active-bg": "rgba(194, 14, 26, 0.1)",
    "--vl-panel-item-active-hover-bg": "rgba(194, 14, 26, 0.16)",
    "--vl-panel-item-active-icon": UNIVALLE_RED,
    "--vl-panel-content-bg": "linear-gradient(160deg, #f8f5f5 0%, #f3eded 100%)",
    "--vl-panel-bg": "#f8f5f5",
    "--vl-panel-paper": "#ffffff",
    "--vl-panel-divider": "rgba(63, 21, 23, 0.14)",
    "--vl-panel-raised": "#f6eeee",
    ...LIGHT_GLASS,
    "--vl-glass-accent-cyan-text": UNIVALLE_WINE,
    ...UNIVALLE_CONSOLE,
    "--vl-learn-tab-indicator": UNIVALLE_RED,
    "--vl-learn-module-open-border": UNIVALLE_RED,
    "--vl-eval-explanation-border": UNIVALLE_RED,
  },
};

/** Univalle dark: greys, black and white with a red accent (lightened for AA). */
const UNIVALLE_DARK: SchemeDefinition = {
  mui: {
    primary: { main: UNIVALLE_RED_ON_DARK, light: "#f58c92", dark: UNIVALLE_RED_FUNCTIONAL, contrastText: "#121212" },
    secondary: { main: UNIVALLE_GREY_LIGHT, light: "#e6e6e6", dark: UNIVALLE_GREY, contrastText: "#121212" },
    info: { main: "#42a8bf", light: "#7cc4d4", dark: "#2f7f91", contrastText: "#121212" },
    ...statusDark("#121212"),
    background: { default: "#121212", paper: "#1e1e1e", contrast: "#f2f2f2" },
    text: { primary: "#f5f5f5", secondary: UNIVALLE_GREY_LIGHT, disabled: "rgba(255, 255, 255, 0.55)", hint: "rgba(255, 255, 255, 0.5)" },
    divider: "rgba(255, 255, 255, 0.12)",
    action: {
      active: UNIVALLE_RED_ON_DARK,
      hover: "rgba(255, 255, 255, 0.08)",
      selected: "rgba(255, 255, 255, 0.14)",
      disabled: "rgba(255, 255, 255, 0.55)",
      disabledBackground: "rgba(255, 255, 255, 0.12)",
      focus: "rgba(242, 107, 115, 0.16)",
    },
  },
  tokens: {
    "--vl-color-accent": UNIVALLE_GREY_LIGHT,
    "--vl-color-on-accent": "#121212",
    "--vl-color-bg-gradient": "linear-gradient(180deg, #121212 0%, #0d0d0d 100%)",
    "--vl-color-surface-raised": "#2a2a2a",
    "--vl-color-link": UNIVALLE_RED_ON_DARK,
    "--vl-color-link-hover": "#f58c92",
    ...DARK_SHADOWS,
    "--vl-sidebar-bg": "#1e1e1e",
    "--vl-sidebar-item-active-bg": "rgba(242, 107, 115, 0.16)",
    "--vl-sidebar-version": "rgba(255, 255, 255, 0.6)",
    "--vl-user-card-bg": "rgba(255, 255, 255, 0.08)",
    "--vl-user-card-bg-hover": "rgba(255, 255, 255, 0.12)",
    "--vl-auth-bg": `linear-gradient(135deg, #121212 0%, #1f1415 55%, ${UNIVALLE_WINE_DARK} 100%)`,
    "--vl-auth-on-bg": "#f5f5f5",
    "--vl-panel-sidebar-bg": "#1a1a1a",
    "--vl-panel-sidebar-text": "#f5f5f5",
    "--vl-panel-sidebar-muted": "rgba(255, 255, 255, 0.7)",
    "--vl-panel-sidebar-faint": "rgba(255, 255, 255, 0.6)",
    "--vl-panel-accent": UNIVALLE_RED_ON_DARK,
    "--vl-panel-item-active-bg": "rgba(242, 107, 115, 0.2)",
    "--vl-panel-item-active-hover-bg": "rgba(242, 107, 115, 0.28)",
    "--vl-panel-item-active-icon": "#f58c92",
    "--vl-panel-content-bg": "linear-gradient(160deg, #0d0d0d 0%, #161616 55%, #121212 100%)",
    "--vl-panel-bg": "#121212",
    "--vl-panel-paper": "#1e1e1e",
    "--vl-panel-divider": "rgba(255, 255, 255, 0.1)",
    "--vl-panel-raised": "#2a2a2a",
    ...DARK_GLASS,
    "--vl-glass-accent-cyan-text": "#f58c92",
    ...UNIVALLE_CONSOLE,
    "--vl-learn-tab-indicator": UNIVALLE_RED_ON_DARK,
    "--vl-learn-module-open-border": UNIVALLE_RED_ON_DARK,
    "--vl-eval-explanation-border": UNIVALLE_RED_ON_DARK,
  },
};

export const THEME_SCHEMES: Record<ThemePaletteId, Record<ThemeMode, SchemeDefinition>> = {
  ventylab: { light: VENTYLAB_LIGHT, dark: VENTYLAB_DARK },
  univalle: { light: UNIVALLE_LIGHT, dark: UNIVALLE_DARK },
};

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && (THEME_MODES as readonly string[]).includes(value);
}

export function isThemePaletteId(value: unknown): value is ThemePaletteId {
  return typeof value === "string" && (THEME_PALETTE_IDS as readonly string[]).includes(value);
}
