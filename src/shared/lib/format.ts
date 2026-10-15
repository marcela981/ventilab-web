/*
* Funcionalidad: Display formatters
* Descripción: Pure es-CO formatters shared by the evaluation features: grade on the 0.0–5.0 scale with one decimal ("3,5"), date, date-time and date window in the America/Bogota time zone (the backend sends ISO instants), duration in minutes ("1 h 30 min") and the relative age of an instant ("hace 3 días") for the grading queue. Invalid dates render as an em dash. Depends only on Intl.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

const LOCALE = "es-CO";
const TIME_ZONE = "America/Bogota";
const MISSING = "—";

const gradeFormatter = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const relativeFormatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: "always" });

const MINUTE_MS = 60_000;
const RELATIVE_UNITS: ReadonlyArray<{ unit: Intl.RelativeTimeFormatUnit, ms: number }> = [
  { unit: "year", ms: 365 * 24 * 60 * MINUTE_MS },
  { unit: "month", ms: 30 * 24 * 60 * MINUTE_MS },
  { unit: "week", ms: 7 * 24 * 60 * MINUTE_MS },
  { unit: "day", ms: 24 * 60 * MINUTE_MS },
  { unit: "hour", ms: 60 * MINUTE_MS },
  { unit: "minute", ms: MINUTE_MS },
];

function toDate(iso: string): Date | null {
  const date = new Date(iso);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatGrade(grade: number): string {
  return gradeFormatter.format(grade);
}

export function formatDate(iso: string): string {
  const date = toDate(iso);

  return date ? dateFormatter.format(date) : MISSING;
}

export function formatDateTime(iso: string): string {
  const date = toDate(iso);

  return date ? dateTimeFormatter.format(date) : MISSING;
}

// An open window (no end) reads "Desde ...".
export function formatDateRange(startIso: string, endIso: string | null): string {
  if (endIso === null) {
    return `Desde ${formatDateTime(startIso)}`;
  }

  return `${formatDateTime(startIso)} – ${formatDateTime(endIso)}`;
}

export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;

  if (hours === 0) {
    return `${rest} min`;
  }

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

// Age of a past instant relative to `now` ("hace 3 días"); under a minute (or in the future) is "hace un momento".
export function formatRelativeAge(iso: string, now: Date = new Date()): string {
  const date = toDate(iso);

  if (!date) {
    return MISSING;
  }

  const elapsed = now.getTime() - date.getTime();

  for (const { unit, ms } of RELATIVE_UNITS) {
    if (elapsed >= ms) {
      return relativeFormatter.format(-Math.floor(elapsed / ms), unit);
    }
  }

  return "hace un momento";
}
