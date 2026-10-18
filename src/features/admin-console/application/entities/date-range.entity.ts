/*
* Funcionalidad: Admin console date ranges
* Descripción: Pure conversion of the "desde"/"hasta" calendar days of the operation filters (native date inputs, "YYYY-MM-DD", read as days in America/Bogota) into the ISO range the API expects: `from` is 00:00 of the first day in Bogota and `to` is 00:00 of the day after the last one (the audit and AI endpoints treat `to` as exclusive), so a single day covers that whole day. Either bound may be empty (open range). Returns an error key when a day is invalid, the range is reversed or, with a maximum, longer than the API allows (366 days for the AI stats). v1.1 (review): with a maximum and only "desde" set, the open range is checked against now (an injectable `now`): a first day in the future returns "future" and one more than the maximum ago returns "tooLong", so the page shows the inline message instead of sending a range the API rejects. v1.2 (B4): dateRangeErrorMessage states the maximum the range was checked against (singular/plural) instead of a hardcoded 366; AI_ANALYTICS_MAX_RANGE_DAYS is the 366-day backend limit of the AI telemetry and ratings ranges. Depends on @shared/lib/bogota-time.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { bogotaLocalToUtcIso } from "@shared/lib/bogota-time";

export type IsoRange = {
  from?: string
  to?: string
};

export type DateRangeError = "invalid" | "order" | "tooLong" | "future";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const DATE_RANGE_ERRORS: Record<Exclude<DateRangeError, "tooLong">, string> = {
  invalid: "Escribe fechas válidas.",
  order: "La fecha inicial debe ser anterior o igual a la final.",
  future: "La fecha inicial no puede ser posterior a hoy.",
};

/** Maximum span of the AI telemetry and ratings ranges (the backend rejects longer ones with `invalid_range`). */
export const AI_ANALYTICS_MAX_RANGE_DAYS = 366;

export function formatDays(days: number): string {
  return `${days} ${days === 1 ? "día" : "días"}`;
}

/** Spanish message of a range error; `maxDays` is the maximum passed to toIsoRange. */
export function dateRangeErrorMessage(error: DateRangeError, maxDays?: number): string {
  if (error === "tooLong") {
    return maxDays === undefined ? "El rango es demasiado largo." : `El rango puede cubrir como máximo ${formatDays(maxDays)}.`;
  }

  return DATE_RANGE_ERRORS[error];
}

function dayStart(day: string): string | null {
  return DAY_PATTERN.test(day) ? bogotaLocalToUtcIso(`${day}T00:00`) : null;
}

/** A URL value kept only when it looks like a calendar day. */
export function readDay(value: unknown): string {
  return typeof value === "string" && DAY_PATTERN.test(value) ? value : "";
}

export function toIsoRange(fromDay: string, toDay: string, maxDays?: number, now: Date = new Date()): IsoRange | DateRangeError {
  const range: IsoRange = {};

  if (fromDay) {
    const from = dayStart(fromDay);

    if (!from) {
      return "invalid";
    }

    range.from = from;
  }

  if (toDay) {
    const lastDay = dayStart(toDay);

    if (!lastDay) {
      return "invalid";
    }

    range.to = new Date(new Date(lastDay).getTime() + DAY_MS).toISOString();
  }

  if (range.from && range.to) {
    const span = new Date(range.to).getTime() - new Date(range.from).getTime();

    if (span <= 0) {
      return "order";
    }

    if (maxDays !== undefined && span > maxDays * DAY_MS) {
      return "tooLong";
    }
  }

  if (range.from && !range.to && maxDays !== undefined) {
    // Open range: the API ends it now, so the maximum applies up to now.
    const span = now.getTime() - new Date(range.from).getTime();

    if (span < 0) {
      return "future";
    }

    if (span > maxDays * DAY_MS) {
      return "tooLong";
    }
  }

  return range;
}

export function isIsoRange(value: IsoRange | DateRangeError): value is IsoRange {
  return typeof value === "object";
}
