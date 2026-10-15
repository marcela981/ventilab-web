/*
* Funcionalidad: Bar chart model
* Descripción: Typed input of the shared BarChart (categories, datasets with one value per category and a palette tone) and the pure helpers it uses: the palette chrome read from the MUI CSS variables at runtime (bar colors, grid and text) and the text of a value in the accessible fallback table. No runtime dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const BAR_TONES = ["primary", "secondary", "success", "error", "warning", "info"] as const;

export type BarTone = (typeof BAR_TONES)[number];

export type BarDataset = {
  label: string
  // One value per label; null is a missing value (no bar, "—" in the table).
  values: readonly (number | null)[]
  tone?: BarTone
};

export type BarChartChrome = {
  colors: Record<BarTone, string>
  grid: string
  text: string
};

export const MISSING_VALUE = "—";

function readVariable(styles: CSSStyleDeclaration, name: string): string {
  return styles.getPropertyValue(name).trim();
}

export function readBarChartChrome(element: Element = document.documentElement): BarChartChrome {
  const styles = getComputedStyle(element);
  const colors = Object.fromEntries(
    BAR_TONES.map((tone) => [tone, readVariable(styles, `--mui-palette-${tone}-main`)]),
  ) as Record<BarTone, string>;

  return {
    colors,
    grid: readVariable(styles, "--mui-palette-divider"),
    text: readVariable(styles, "--mui-palette-text-secondary"),
  };
}

export function resolveBarTone(dataset: BarDataset, index: number): BarTone {
  return dataset.tone ?? BAR_TONES[index % BAR_TONES.length] ?? "primary";
}

export function formatBarValue(value: number | null, format: (value: number) => string): string {
  return value === null ? MISSING_VALUE : format(value);
}
