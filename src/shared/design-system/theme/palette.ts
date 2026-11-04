/*
* Funcionalidad: Design-system palette
* Descripción: Raw brand colors of the official light identity, curriculum level colors with opacity variations, and the color helpers (getColorWithOpacity, getLevelColor, getStatusColor) consumed by the MUI theme and, through src/theme/theme.js, by legacy code. No dependencies. v1.1 (Bloque 5): adds darkColors, the raw values of the July dark scheme (navy background, opaque glass surfaces, #e8f4fd text and its alpha variants, white-alpha borders and actions) that becomes the default color scheme (D1); the light identity gets its AA fix (secondary text #6b747c, 4.56:1 on paper) and onPrimary navy #0a112b, the text drawn on the cyan primary in both schemes (D2, 7.21:1).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

/** Brand colors. Values are the official light identity and must not change without the author. */
export const colors = {
  primary: "#10aede",
  secondary: "#3d98cc",
  accent: "#00a1db",

  beginner: "#4CAF50",
  intermediate: "#FF9800",
  advanced: "#F44336",

  success: "#4CAF50",
  warning: "#FF9800",
  error: "#F44336",
  info: "#10aede",

  textPrimary: "#0a112b",
  // #6c757d reached only 4.49:1 on paper; #6b747c is the minimum AA adjustment (4.56:1).
  textSecondary: "#6b747c",
  textDisabled: "#9e9e9e",
  textHint: "#bdbdbd",

  backgroundDefault: "#ffffff",
  backgroundPaper: "#fafafa",
  backgroundContrast: "#0a112b",

  borderLight: "#e9ecef",
  borderMedium: "#dee2e6",
  borderDark: "#ced4da",

  overlay: "rgba(10, 17, 43, 0.5)",
  shadow: "rgba(0, 0, 0, 0.08)",
  hover: "rgba(16, 174, 222, 0.08)",

  /** Text on the cyan primary in both schemes (D2): white was 2.58:1, navy is 7.21:1. */
  onPrimary: "#0a112b",
} as const;

/**
 * Raw values of the July dark scheme (Bloque 5, D1: the default color scheme). July's glass
 * surfaces become opaque equivalents over navy (white 5% = #161d36, white 8% = #1e243c), so text
 * contrast never depends on what lies underneath. WCAG on navy: text 16.66:1, secondary 8.47:1,
 * disabled 5.62:1 (July's 40% alpha failed with 3.52:1).
 */
export const darkColors = {
  backgroundDefault: "#0a112b",
  backgroundPaper: "#161d36",
  // Inverted surface (derived, July had none): the light counterpart of the navy background.
  backgroundContrast: "#e8f4fd",

  textPrimary: "#e8f4fd",
  textSecondary: "rgba(232, 244, 253, 0.7)",
  textDisabled: "rgba(232, 244, 253, 0.55)",
  textHint: "rgba(232, 244, 253, 0.5)",

  border: "rgba(255, 255, 255, 0.12)",
  hover: "rgba(255, 255, 255, 0.08)",
  selected: "rgba(255, 255, 255, 0.15)",
  disabledBackground: "rgba(255, 255, 255, 0.12)",
} as const;

export type CurriculumLevel = "beginner" | "intermediate" | "advanced";

export interface ColorVariations {
  main: string;
  light: string;
  dark: string;
  opacity05: string;
  opacity10: string;
  opacity20: string;
  opacity40: string;
  opacity60: string;
  opacity80: string;
}

const toRgbChannels = (hexColor: string): string => {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
};

/** Returns `rgba(r, g, b, opacity)` for a 6-digit hex color, e.g. ('#10aede', 0.5). */
export const getColorWithOpacity = (hexColor: string, opacity: number): string =>
  `rgba(${toRgbChannels(hexColor)}, ${opacity})`;

const createColorVariations = (color: string): ColorVariations => {
  const rgb = toRgbChannels(color);
  return {
    main: color,
    light: `rgba(${rgb}, 0.7)`,
    dark: `rgba(${rgb}, 0.9)`,
    opacity05: `rgba(${rgb}, 0.05)`,
    opacity10: `rgba(${rgb}, 0.1)`,
    opacity20: `rgba(${rgb}, 0.2)`,
    opacity40: `rgba(${rgb}, 0.4)`,
    opacity60: `rgba(${rgb}, 0.6)`,
    opacity80: `rgba(${rgb}, 0.8)`,
  };
};

/** Curriculum level colors with opacity variations (visual hierarchy). */
export const levelColors: Record<CurriculumLevel, ColorVariations> = {
  beginner: createColorVariations(colors.beginner),
  intermediate: createColorVariations(colors.intermediate),
  advanced: createColorVariations(colors.advanced),
};

/** Color of a curriculum level in the requested variation; falls back to the raw color. */
export const getLevelColor = (level: string, variant: string = "main"): string | undefined => {
  const variations = (levelColors as Record<string, ColorVariations | undefined>)[level];
  const value = variations?.[variant as keyof ColorVariations];
  return value || (colors as Record<string, string>)[level];
};

/** Color of a feedback status ('success' | 'warning' | 'error' | 'info'); defaults to info. */
export const getStatusColor = (status: string): string =>
  (colors as Record<string, string>)[status] || colors.info;
