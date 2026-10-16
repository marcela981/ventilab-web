/*
* Funcionalidad: Console format
* Descripción: Pure helpers of the generic ventilator console: formats a metric or vital value with its configured decimals (I:E shown as 1:x), returns "—" when the source does not provide a value, detects out-of-range values against partial normal ranges, resolves a range from the config default and a consumer override (null disables it), and builds the SVG path of a patient trend sparkline (gaps start a new subpath). No React or DOM access.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { NormalRange, ValueDefinition } from "./config/console.config";

export const MISSING_VALUE = "—";

export type RangeStatus = "normal" | "low" | "high" | "unknown";

/** Spanish text shown next to the icon of an out-of-range value (never color alone). */
export const RANGE_STATUS_COPY: Readonly<Record<"low" | "high", string>> = { low: "Bajo", high: "Alto" };

export type RangeOverrides<K extends string> = Readonly<Partial<Record<K, NormalRange | null>>>;

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function formatConsoleValue(value: number | null | undefined, definition: ValueDefinition): string {
  if (!isNumber(value)) {
    return MISSING_VALUE;
  }

  if (definition.format === "ratio") {
    return value > 0 ? `1:${(1 / value).toFixed(definition.decimals)}` : MISSING_VALUE;
  }

  return value.toFixed(definition.decimals);
}

export function evaluateRange(value: number | null | undefined, range: NormalRange | null): RangeStatus {
  if (!isNumber(value)) {
    return "unknown";
  }

  if (range?.min !== undefined && value < range.min) {
    return "low";
  }

  if (range?.max !== undefined && value > range.max) {
    return "high";
  }

  return "normal";
}

export function resolveNormalRange<K extends string>(
  id: K,
  definitions: Readonly<Record<K, ValueDefinition>>,
  overrides: RangeOverrides<K> | undefined,
): NormalRange | null {
  const override = overrides?.[id];

  return override === undefined ? definitions[id].normalRange : override;
}

/** SVG path for `values` (oldest first) in a `width` × `height` box; the maximum is at the top. */
export function sparklinePath(values: readonly number[], width: number, height: number): string {
  const finite = values.filter((value) => Number.isFinite(value));

  if (finite.length < 2) {
    return "";
  }

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const parts: string[] = [];
  let penDown = false;

  values.forEach((value, index) => {
    if (!Number.isFinite(value)) {
      penDown = false;

      return;
    }

    const x = index * step;
    const y = span > 0 ? height - ((value - min) / span) * height : height / 2;
    parts.push(`${penDown ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`);
    penDown = true;
  });

  return parts.join(" ");
}
