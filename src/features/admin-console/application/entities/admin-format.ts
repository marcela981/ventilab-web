/*
* Funcionalidad: Admin console number formatting
* Descripción: es-CO display formatters of the operation pages (audit, AI analytics, system status): counts, API rates shown as percentages (the 0–1 rate of the API times 100, display only), milliseconds, USD costs, byte sizes in MiB, uptimes and UTC calendar days of the API as short labels. Every formatter receives a value already computed by the API and returns "—" when it is missing (null or undefined); nothing is summed, averaged or derived here. Depends on nothing at runtime.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

const LOCALE = "es-CO";

export const MISSING_VALUE = "—";

const countFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const percentFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const usdFormatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });
const BYTES_PER_MIB = 1024 * 1024;

type Maybe = number | null | undefined;

function present(value: Maybe): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function formatCount(value: Maybe): string {
  return present(value) ? countFormatter.format(value) : MISSING_VALUE;
}

export function formatDecimal(value: Maybe): string {
  return present(value) ? decimalFormatter.format(value) : MISSING_VALUE;
}

/** A 0–1 rate of the API shown as a percentage. */
export function formatRate(value: Maybe): string {
  return present(value) ? `${percentFormatter.format(value * 100)} %` : MISSING_VALUE;
}

export function formatMs(value: Maybe): string {
  return present(value) ? `${decimalFormatter.format(value)} ms` : MISSING_VALUE;
}

export function formatUsd(value: Maybe): string {
  return present(value) ? usdFormatter.format(value) : MISSING_VALUE;
}

export function formatPerSecond(value: Maybe): string {
  return present(value) ? `${decimalFormatter.format(value)}/s` : MISSING_VALUE;
}

/** A byte count of the API in MiB (unit conversion for display). */
export function formatMib(value: Maybe): string {
  return present(value) ? `${decimalFormatter.format(value / BYTES_PER_MIB)} MiB` : MISSING_VALUE;
}

const utcDayFormatter = new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", day: "numeric", month: "short" });

/** A UTC calendar day of the API ("YYYY-MM-DD") as a short es-CO label; the day is not shifted to Bogota. */
export function formatUtcDay(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? day : utcDayFormatter.format(date);
}

/** An uptime in seconds of the API as days, hours and minutes (unit conversion for display). */
export function formatUptime(value: Maybe): string {
  if (!present(value)) {
    return MISSING_VALUE;
  }

  const minutes = Math.floor(value / 60);
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const rest = minutes % 60;

  return days > 0 ? `${days} d ${hours} h ${rest} min` : `${hours} h ${rest} min`;
}
