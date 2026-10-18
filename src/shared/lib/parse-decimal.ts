/*
* Funcionalidad: es-CO decimal parsing
* Descripción: The one parser of every user-typed numeric field (decision D7). "," and "." are both the DECIMAL separator, so "1.125" and "1,125" are 1.125 and "1,5" is 1.5; thousands separators are never accepted: several separators ("1.000.000", "1.000,5") or spaces / apostrophes between digits ("1 000", "1'000") give the typed error `thousandsSeparator`. The text is trimmed; an empty text is null (the caller decides whether it is required); anything that is not a plain decimal ("1e3", ".5", "5.", "+5", "abc") is `invalid`. Options: no negatives, a maximum of decimals, whole numbers only (any separator is then `notInteger`, so "1.000" is never read as 1). Also the NaN variant for the form models, the es-CO display formatter (comma decimal, no grouping, no float noise), the Spanish error messages and the helper texts shown under the numeric fields. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type DecimalParseError = "invalid" | "thousandsSeparator" | "negative" | "tooManyDecimals" | "notInteger";

export type DecimalParseResult = { ok: true, value: number | null } | { ok: false, error: DecimalParseError };

export type DecimalParseOptions = {
  /** Default true. */
  allowNegative?: boolean
  /** Most digits after the separator; no limit when absent. */
  maxFractionDigits?: number
  /** Whole numbers only: any separator is `notInteger`. */
  integer?: boolean
};

// TODO(i18n): move to a shared namespace in src/i18n.
export const DECIMAL_HELPER_TEXT = "Usa coma o punto para decimales; sin separador de miles.";
export const INTEGER_HELPER_TEXT = "Solo números enteros; sin separador de miles.";

export const DECIMAL_ERROR_MESSAGES: Record<DecimalParseError, string> = {
  invalid: "Escribe un número.",
  thousandsSeparator: "No uses separador de miles; usa coma o punto solo para los decimales.",
  negative: "El número no puede ser negativo.",
  tooManyDecimals: "El número tiene demasiados decimales.",
  notInteger: "Escribe un número entero.",
};

const PLAIN_DECIMAL = /^-?(\d+)(?:[.,](\d+))?$/;
// Digits with separators or spaces / apostrophes between them: a grouped number ("1.000.000", "1 000", "1'000").
const GROUPED_NUMBER = /^-?\d[\d.,\s'’]*\d$/;
const GROUPING_SPACE = /[\s'’]/;

const displayFormatters = new Map<number, Intl.NumberFormat>();

function isGrouped(text: string): boolean {
  if (!GROUPED_NUMBER.test(text)) {
    return false;
  }

  return (text.match(/[.,]/g) ?? []).length > 1 || GROUPING_SPACE.test(text);
}

export function parseDecimal(text: string, options: DecimalParseOptions = {}): DecimalParseResult {
  const trimmed = text.trim();

  if (trimmed === "") {
    return { ok: true, value: null };
  }

  if (isGrouped(trimmed)) {
    return { ok: false, error: "thousandsSeparator" };
  }

  const match = PLAIN_DECIMAL.exec(trimmed);

  if (!match) {
    return { ok: false, error: "invalid" };
  }

  const fraction = match[2] ?? "";
  const value = Number(trimmed.replace(",", "."));

  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    return { ok: false, error: "invalid" };
  }

  if (options.allowNegative === false && trimmed.startsWith("-")) {
    return { ok: false, error: "negative" };
  }

  if (options.integer && match[2] !== undefined) {
    return { ok: false, error: "notInteger" };
  }

  if (options.maxFractionDigits !== undefined && fraction.length > options.maxFractionDigits) {
    return { ok: false, error: "tooManyDecimals" };
  }

  return { ok: true, value };
}

/** The number of a typed text, NaN when it is empty or invalid (for the form models that validate NaN themselves). */
export function parseDecimalOrNaN(text: string, options?: DecimalParseOptions): number {
  const result = parseDecimal(text, options);

  return result.ok && result.value !== null ? result.value : Number.NaN;
}

/** es-CO display of a number (comma decimal, no grouping, at most `maxFractionDigits`); "" when missing. */
export function formatDecimal(value: number | null | undefined, maxFractionDigits: number = 10): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "";
  }

  let formatter = displayFormatters.get(maxFractionDigits);

  if (!formatter) {
    formatter = new Intl.NumberFormat("es-CO", { useGrouping: false, maximumFractionDigits: maxFractionDigits });
    displayFormatters.set(maxFractionDigits, formatter);
  }

  return formatter.format(value);
}
