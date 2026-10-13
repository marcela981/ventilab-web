/*
* Funcionalidad: Design-system palette
* Descripción: Raw brand colors of the official light identity, curriculum level colors with opacity variations, and the color helpers (getColorWithOpacity, getLevelColor, getStatusColor) consumed by the MUI theme and, through src/theme/theme.js, by legacy code. No dependencies.
* Versión: 1.0
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
  textSecondary: "#6c757d",
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
