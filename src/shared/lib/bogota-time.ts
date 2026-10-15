/*
* Funcionalidad: Bogota local time helpers
* Descripción: Pure conversions between the value of a native datetime-local input ("YYYY-MM-DDTHH:mm"), read as wall-clock time in America/Bogota, and the UTC ISO instant the API expects. Bogota is UTC-5 all year (no daylight saving time), so the offset is fixed and the result does not depend on the time zone of the browser. Invalid or impossible values (31 de febrero, 24:00) return null. Also builds the datetime-local value of an instant (the default window of the activation dialog). No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

// America/Bogota has had no daylight saving time since 1993.
export const BOGOTA_OFFSET_MINUTES = -5 * 60;

const MINUTE_MS = 60_000;
const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const pad = (value: number, length = 2): string => String(value).padStart(length, "0");

// "2026-10-15T19:00" in Bogota -> "2026-10-16T00:00:00.000Z".
export function bogotaLocalToUtcIso(local: string): string | null {
  const match = LOCAL_PATTERN.exec(local.trim());

  if (!match) {
    return null;
  }

  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [number, number, number, number, number];
  const wallClockMs = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(wallClockMs);

  // Date.UTC rolls 2026-02-31 over to March: reject anything that does not round-trip.
  if (
    check.getUTCFullYear() !== year
    || check.getUTCMonth() !== month - 1
    || check.getUTCDate() !== day
    || check.getUTCHours() !== hour
    || check.getUTCMinutes() !== minute
  ) {
    return null;
  }

  return new Date(wallClockMs - BOGOTA_OFFSET_MINUTES * MINUTE_MS).toISOString();
}

// An instant as the "YYYY-MM-DDTHH:mm" wall-clock value of Bogota (seconds are dropped).
export function utcToBogotaLocal(instant: Date | string): string | null {
  const date = typeof instant === "string" ? new Date(instant) : instant;

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const local = new Date(date.getTime() + BOGOTA_OFFSET_MINUTES * MINUTE_MS);

  return `${pad(local.getUTCFullYear(), 4)}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`
    + `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}
