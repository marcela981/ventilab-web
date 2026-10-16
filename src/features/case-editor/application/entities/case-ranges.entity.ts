/*
* Funcionalidad: Case editor physiological ranges
* Descripción: Pure helpers over the vendored CLINICAL_CASE_PHYSIOLOGICAL_RANGES (copied from the backend by
*   scripts/sync-sim-engine.mjs, the only source of min/max; nothing is bounded in the UI): the range of a parameter,
*   its text in display units ("5–150 mL/cmH2O"; a scale converts the stored unit, e.g. the event time stored in ms
*   and edited in s), the Spanish unit name, the bibliographic reference, and the check the backend applies (value
*   outside [min, max] → 422), so the editor can warn before saving. Depends on the sim-engine public API and the
*   case editor config.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { CLINICAL_CASE_PHYSIOLOGICAL_RANGES } from "@shared/sim-engine";
import type { PhysiologicalParameter, PhysiologicalRange } from "@shared/sim-engine";
import { UNIT_LABELS } from "../config/case-editor.config";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const RANGE_COPY = {
  range: (text: string) => `Rango plausible: ${text}`,
  outOfRange: (text: string) => `Fuera del rango fisiológicamente plausible (${text}).`,
} as const;

const numberFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 });

export function rangeOf(parameter: PhysiologicalParameter): PhysiologicalRange {
  return CLINICAL_CASE_PHYSIOLOGICAL_RANGES[parameter];
}

export function unitLabel(unit: string): string {
  return UNIT_LABELS[unit] ?? unit;
}

export type RangeDisplay = {
  /** Display scale: display value = stored value × scale. */
  scale?: number | undefined
  /** Display unit instead of the backend one (e.g. "s" for a time stored in ms). */
  unit?: string | undefined
};

/** "5–150 mL/cmH2O" in display units. */
export function formatRange(parameter: PhysiologicalParameter, display: RangeDisplay = {}): string {
  const range = rangeOf(parameter);
  const scale = display.scale ?? 1;
  const unit = display.unit ?? unitLabel(range.unit);
  const text = `${numberFormat.format(range.min * scale)}–${numberFormat.format(range.max * scale)}`;

  return unit ? `${text} ${unit}` : text;
}

/** True when the stored value is outside the range the backend enforces (the same inclusive bounds). */
export function isOutOfRange(parameter: PhysiologicalParameter, storedValue: number): boolean {
  const range = rangeOf(parameter);

  return !Number.isFinite(storedValue) || storedValue < range.min || storedValue > range.max;
}
