/*
* Funcionalidad: Activity calendar selectors
* Descripción: Pure selectors of the activity calendar of Mi Progreso (W9, Bloque 2): today in America/Bogota (fixed UTC−05:00, no daylight saving time, the same rule as the server), the range of the last 12 weeks starting on a Monday (the `from`/`to` of `GET /api/progress/activity`), the week columns of day cells (days the API omits have no activity; days after today are marked future), the intensity level of a day from its event count and the totals of the range. Kept apart from the milestone and skill tree selectors so the /learn warm-up does not load curriculum code. Depends on the gamification entity.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ActivityDay } from "./gamification.entity";

// Colombia: UTC−05:00 all year (no daylight saving time).
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const CALENDAR_WEEKS = 12;

/** America/Bogota calendar day (YYYY-MM-DD) of an instant. */
export function bogotaDate(now: Date): string {
  return new Date(now.getTime() - BOGOTA_OFFSET_MS).toISOString().slice(0, 10);
}

// Midnight UTC of a YYYY-MM-DD day: calendar arithmetic without the local time zone.
function dayStart(date: string): number {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);

  return Date.UTC(year, month - 1, day);
}

function dayString(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

export type CalendarRange = {
  from: string
  to: string
};

/** The last `weeks` weeks ending today, starting on a Monday. */
export function calendarRange(today: string, weeks = CALENDAR_WEEKS): CalendarRange {
  const todayStart = dayStart(today);
  const weekday = (new Date(todayStart).getUTCDay() + 6) % 7;
  const monday = todayStart - weekday * DAY_MS;

  return { from: dayString(monday - (weeks - 1) * 7 * DAY_MS), to: today };
}

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

/** Display intensity of a day from its event count (0 = no activity). */
export function activityLevel(count: number): ActivityLevel {
  if (count <= 0) {
    return 0;
  }

  if (count <= 2) {
    return 1;
  }

  if (count <= 5) {
    return 2;
  }

  return count <= 9 ? 3 : 4;
}

export type CalendarCell = {
  date: string
  count: number
  xp: number
  level: ActivityLevel
  // After today: drawn empty, not announced.
  future: boolean
};

/** Week columns (Monday first) from `range.from`; days the API omits have no activity. */
export function buildCalendarWeeks(range: CalendarRange, days: readonly ActivityDay[]): CalendarCell[][] {
  const byDate = new Map(days.map((day) => [day.date, day]));
  const start = dayStart(range.from);
  const end = dayStart(range.to);
  const weekCount = Math.max(0, Math.ceil((end - start + DAY_MS) / (7 * DAY_MS)));

  return Array.from({ length: weekCount }, (_, week) => Array.from({ length: 7 }, (__, weekday) => {
    const time = start + (week * 7 + weekday) * DAY_MS;
    const date = dayString(time);
    const day = byDate.get(date);
    const future = time > end;
    const count = future ? 0 : day?.count ?? 0;

    return { date, count, xp: future ? 0 : day?.xp ?? 0, level: activityLevel(count), future };
  }));
}

export type CalendarTotals = {
  activeDays: number
  events: number
};

export function calendarTotals(weeks: readonly CalendarCell[][]): CalendarTotals {
  const cells = weeks.flat().filter((cell) => !cell.future);

  return { activeDays: cells.filter((cell) => cell.count > 0).length, events: cells.reduce((sum, cell) => sum + cell.count, 0) };
}
