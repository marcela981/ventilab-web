/*
* Funcionalidad: July timing math
* Descripción: Pure timing math of the July right column, from the two real parameters only (inspiratory time Ti in s and respiratory rate FR in rpm; the engine has no I:E parameter): the cycle (60/FR), the expiratory time Te = cycle − Ti, the I:E ratio Te/Ti shown as "1 : 2,0", the inspiratory fraction behind the "Insp ── Esp" slider and the Ti a slider position asks for (the controls reducer then clamps and snaps it to the Ti limit), plus the slider range the Ti limit allows at the current rate. Values that cannot be computed (missing, non-positive, Ti ≥ cycle) give null. Spanish decimal comma. v0.1 (Bloque 5, C2): first version.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ParameterLimit } from "./ventilator-console.entity";

/** Slider bounds of the inspiratory fraction, in % of the cycle (1:9 … 4:1 would be unusual teaching values). */
export const IE_SLIDER_MIN_PERCENT = 10;
export const IE_SLIDER_MAX_PERCENT = 80;

function positive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function cycleSeconds(rate: number | null | undefined): number | null {
  return positive(rate) ? 60 / rate : null;
}

export function expiratoryTime(inspiratoryTime: number | null | undefined, rate: number | null | undefined): number | null {
  const cycle = cycleSeconds(rate);

  if (cycle === null || !positive(inspiratoryTime) || inspiratoryTime >= cycle) {
    return null;
  }

  return cycle - inspiratoryTime;
}

/** Te/Ti (the "2,0" of "1 : 2,0"). */
export function ieRatio(inspiratoryTime: number | null | undefined, rate: number | null | undefined): number | null {
  const te = expiratoryTime(inspiratoryTime, rate);

  return te === null || !positive(inspiratoryTime) ? null : te / inspiratoryTime;
}

export function formatDecimal(value: number, decimals: number): string {
  return value.toFixed(decimals).replace(".", ",");
}

export function formatIeRatio(ratio: number | null): string {
  return ratio === null ? "—" : `1 : ${formatDecimal(ratio, 1)}`;
}

/** Ti as a whole % of the cycle, or null. */
export function inspiratoryPercent(inspiratoryTime: number | null | undefined, rate: number | null | undefined): number | null {
  const cycle = cycleSeconds(rate);

  return cycle === null || !positive(inspiratoryTime) ? null : Math.round((inspiratoryTime / cycle) * 100);
}

/** The Ti a slider position (% of the cycle) asks for, before the limit clamps and snaps it. */
export function inspiratoryTimeFromPercent(percent: number, rate: number | null | undefined): number | null {
  const cycle = cycleSeconds(rate);

  return cycle === null ? null : (percent / 100) * cycle;
}

/** The slider range the Ti limit allows at this rate (inside the teaching bounds), or null when empty. */
export function inspiratoryPercentRange(limit: ParameterLimit, rate: number | null | undefined): { min: number, max: number } | null {
  const cycle = cycleSeconds(rate);

  if (cycle === null) {
    return null;
  }

  const min = Math.max(IE_SLIDER_MIN_PERCENT, Math.ceil((limit.min / cycle) * 100));
  const max = Math.min(IE_SLIDER_MAX_PERCENT, Math.floor((limit.max / cycle) * 100));

  return min <= max ? { min, max } : null;
}
