/*
* Funcionalidad: Student timeline windows
* Descripción: Date windows of the student activity timeline (`GET /api/analytics/students/{userId}/timeline?from&to`): the default window is the last 30 days (the backend default), "Cargar anteriores" appends the window of the same length that ends where the oldest loaded one starts, and the from/to date controls (Bogota calendar days, "YYYY-MM-DD") become a window from the start of the first day to the end of the last one, rejected when it does not start before it ends or spans more than the 366 days the API accepts. Also the timeline entry view model. Depends on @shared/lib/bogota-time. v1.1 (closure B2): simulationSessions (SIMULATION_SESSION entries of a window) is gone: the sessions list reads the staff sessions history endpoint.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { bogotaLocalToUtcIso, utcToBogotaLocal } from "@shared/lib/bogota-time";

export type TimelineWindow = {
  from: string
  to: string
};

export type TimelineKind = "LESSON_COMPLETED" | "EVALUATION_STARTED" | "EVALUATION_SUBMITTED" | "SIMULATION_SESSION" | "RESERVATION";

export type TimelineEntry = {
  kind: TimelineKind
  occurredAt: string
  endedAt: string | null
  referenceId: string
  status: string | null
  title: string | null
  value: number | null
};

export type StudentTimeline = {
  from: string
  to: string
  truncated: boolean
  entries: TimelineEntry[]
};

export type WindowInputError = "invalid" | "order" | "tooLong";

export const DEFAULT_WINDOW_DAYS = 30;
export const MAX_WINDOW_DAYS = 366;

const DAY_MS = 24 * 60 * 60 * 1000;

export function defaultWindow(now: Date = new Date()): TimelineWindow {
  return { from: new Date(now.getTime() - DEFAULT_WINDOW_DAYS * DAY_MS).toISOString(), to: now.toISOString() };
}

/** The window of the same length that ends where the given one starts (moves the range back for "Cargar anteriores"). */
export function previousWindow(window: TimelineWindow): TimelineWindow {
  const from = new Date(window.from).getTime();
  const length = Math.min(new Date(window.to).getTime() - from, MAX_WINDOW_DAYS * DAY_MS);

  return { from: new Date(from - length).toISOString(), to: window.from };
}

/** "YYYY-MM-DD" of an instant in Bogota, for the date inputs. */
export function toDateInput(iso: string): string {
  return utcToBogotaLocal(iso)?.slice(0, 10) ?? "";
}

/** Window from the start of the `from` day to the end of the `to` day (Bogota), or the reason it is not accepted. */
export function windowFromDateInputs(fromDate: string, toDate: string): TimelineWindow | WindowInputError {
  const from = bogotaLocalToUtcIso(`${fromDate}T00:00`);
  const lastDay = bogotaLocalToUtcIso(`${toDate}T00:00`);

  if (!from || !lastDay) {
    return "invalid";
  }

  const to = new Date(new Date(lastDay).getTime() + DAY_MS).toISOString();
  const span = new Date(to).getTime() - new Date(from).getTime();

  if (span <= 0) {
    return "order";
  }

  return span > MAX_WINDOW_DAYS * DAY_MS ? "tooLong" : { from, to };
}

export function isWindow(value: TimelineWindow | WindowInputError): value is TimelineWindow {
  return typeof value === "object";
}
