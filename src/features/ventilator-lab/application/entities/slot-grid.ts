/*
* Funcionalidad: Reservation slot grid
* Descripción: Pure model of the reservations calendar in America/Bogota (UTC-5 all year, no daylight saving time, so every result is independent of the browser time zone): Bogota day and Monday-based week ranges, anchor navigation, the slots of each day by slotMinutes aligned to the same epoch boundaries the backend validates, the occupancy overlay (cancelled and preempted reservations free their slots), past slots (a slot that started before the slot in progress, mirroring the backend floor-to-slot rule) and slots outside the booking window (starting more than maxAdvanceDays after now), plus the durations that can be booked from a slot (multiples of slotMinutes up to the maximum, stopping at the next reservation) and the Bogota day, time and window labels (Intl). Settings always come from the caller (useLabSettings). v1.1 (T3): each slot carries `bookable` (in the bookable time range, free or occupied) so staff may select an occupied slot to preempt it. v1.2 (T2 review fix): every slot belongs to the Bogota day it starts in, so the slot that crosses midnight (slot lengths that do not divide 300 min) is no longer lost; `alignedRows` says whether every day has the same slot times (slotMinutes divides 1440; otherwise the calendar labels each cell with its own time); in the bookable range only SCHEDULED reservations occupy a slot (the backend conflicts only with SCHEDULED ones, and a completed reservation released early ends inside the slot in progress), past slots still show completed ones; availableDurations offers nothing when a scheduled reservation already covers the chosen start. Depends on the Bogota time helpers and the reservation entities.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { BOGOTA_OFFSET_MINUTES, utcToBogotaLocal } from "@shared/lib/bogota-time";
import type { LabReservation } from "./reservation.entity";

export type CalendarView = "day" | "week";

export type SlotState = "free" | "occupied" | "past" | "outside-window";

export type GridSlot = {
  startsAt: Date
  endsAt: Date
  state: SlotState
  /** Reservation occupying the slot (also for past occupied slots), or null. */
  reservation: LabReservation | null
  /** First slot of the day covered by its reservation: where the occupancy label is shown. */
  isFirstOfReservation: boolean
  /** Starts in the bookable time range (the slot in progress or later, within the window), free or occupied. */
  bookable: boolean
};

export type GridDay = {
  /** Bogota calendar date "YYYY-MM-DD". */
  key: string
  start: Date
  slots: GridSlot[]
};

export type SlotGrid = {
  from: Date
  to: Date
  days: GridDay[]
  /**
   * Every day has the same slot times (slotMinutes divides the 24 h day), so one time column fits all days. Otherwise
   * consecutive days start at different times and each cell must carry its own time.
   */
  alignedRows: boolean
};

export type CalendarRange = {
  from: Date
  to: Date
  /** Start instant of each Bogota day of the range. */
  days: Date[]
};

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const OFFSET_MS = BOGOTA_OFFSET_MINUTES * MINUTE_MS;
const DAYS_PER_VIEW: Readonly<Record<CalendarView, number>> = { day: 1, week: 7 };
const DAY_MINUTES = 24 * 60;
const FREEING_STATUSES: ReadonlySet<string> = new Set(["CANCELLED", "PREEMPTED"]);
/** The only status the backend checks for overlaps (ReservationLifecycleStatus SCHEDULED). */
const BLOCKING_STATUS = "SCHEDULED";

/** Whether the reservation used the ventilator during its window (shown on past slots: scheduled or completed). */
export function occupiesVentilator(reservation: LabReservation): boolean {
  return !FREEING_STATUSES.has(reservation.status);
}

/** Whether the reservation still blocks new bookings over its window, as the backend overlap check decides. */
export function blocksBooking(reservation: LabReservation): boolean {
  return reservation.status === BLOCKING_STATUS;
}

export function startOfBogotaDay(instant: Date): Date {
  const wallClockMs = instant.getTime() + OFFSET_MS;

  return new Date(Math.floor(wallClockMs / DAY_MS) * DAY_MS - OFFSET_MS);
}

export function bogotaDayKey(instant: Date): string {
  return (utcToBogotaLocal(instant) ?? "").slice(0, 10);
}

/** Monday 00:00 in Bogota of the week that contains the instant. */
export function startOfBogotaWeek(instant: Date): Date {
  const dayStart = startOfBogotaDay(instant);
  // getUTCDay of the shifted wall clock is the Bogota weekday (0 = Sunday).
  const weekday = new Date(dayStart.getTime() + OFFSET_MS).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;

  return new Date(dayStart.getTime() - daysSinceMonday * DAY_MS);
}

export function calendarRange(view: CalendarView, anchor: Date): CalendarRange {
  const from = view === "week" ? startOfBogotaWeek(anchor) : startOfBogotaDay(anchor);
  const count = DAYS_PER_VIEW[view];
  const days = Array.from({ length: count }, (_, index) => new Date(from.getTime() + index * DAY_MS));

  return { from, to: new Date(from.getTime() + count * DAY_MS), days };
}

export function shiftAnchor(view: CalendarView, anchor: Date, direction: number): Date {
  return new Date(anchor.getTime() + direction * DAYS_PER_VIEW[view] * DAY_MS);
}

const dayFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** Short Bogota date of a day ("vie, 16 oct"). */
export function bogotaDayLabel(instant: Date): string {
  return dayFormatter.format(instant);
}

/** "vie, 16 oct · 10:00 – 10:45" in Bogota. */
export function slotWindowLabel(startsAt: Date, endsAt: Date): string {
  return `${bogotaDayLabel(startsAt)} · ${slotTimeLabel(startsAt)} – ${slotTimeLabel(endsAt)}`;
}

/** "HH:mm" in Bogota. */
export function slotTimeLabel(instant: Date): string {
  return (utcToBogotaLocal(instant) ?? "").slice(11, 16);
}

function floorToSlot(instantMs: number, slotMs: number): number {
  return Math.floor(instantMs / slotMs) * slotMs;
}

function overlaps(reservation: LabReservation, startMs: number, endMs: number): boolean {
  return new Date(reservation.startsAt).getTime() < endMs && new Date(reservation.endsAt).getTime() > startMs;
}

export type SlotGridInput = {
  view: CalendarView
  anchor: Date
  now: Date
  slotMinutes: number
  maxAdvanceDays: number
  reservations: readonly LabReservation[]
};

function slotState(startMs: number, reservation: LabReservation | null, pastBeforeMs: number, windowEndMs: number): SlotState {
  if (reservation) {
    return "occupied";
  }

  if (startMs < pastBeforeMs) {
    return "past";
  }

  return startMs > windowEndMs ? "outside-window" : "free";
}

function buildDay(dayStart: Date, input: SlotGridInput, occupying: readonly LabReservation[], blocking: readonly LabReservation[]): GridDay {
  const slotMs = input.slotMinutes * MINUTE_MS;
  const dayEndMs = dayStart.getTime() + DAY_MS;
  const pastBeforeMs = floorToSlot(input.now.getTime(), slotMs);
  const windowEndMs = input.now.getTime() + input.maxAdvanceDays * DAY_MS;
  const slots: GridSlot[] = [];
  let startMs = Math.ceil(dayStart.getTime() / slotMs) * slotMs;

  // A slot belongs to the day it starts in, also when it crosses midnight.
  while (startMs < dayEndMs) {
    const endMs = startMs + slotMs;
    const candidates = startMs >= pastBeforeMs ? blocking : occupying;
    const reservation = candidates.find((candidate) => overlaps(candidate, startMs, endMs)) ?? null;
    const previous = slots[slots.length - 1];

    slots.push({
      startsAt: new Date(startMs),
      endsAt: new Date(endMs),
      state: slotState(startMs, reservation, pastBeforeMs, windowEndMs),
      reservation,
      isFirstOfReservation: reservation !== null && previous?.reservation?.id !== reservation.id,
      bookable: startMs >= pastBeforeMs && startMs <= windowEndMs,
    });
    startMs = endMs;
  }

  return { key: bogotaDayKey(dayStart), start: dayStart, slots };
}

export function buildSlotGrid(input: SlotGridInput): SlotGrid {
  const range = calendarRange(input.view, input.anchor);
  const occupying = input.reservations.filter(occupiesVentilator);
  const blocking = input.reservations.filter(blocksBooking);

  if (!(input.slotMinutes > 0)) {
    return {
      from: range.from,
      to: range.to,
      days: range.days.map((day) => ({ key: bogotaDayKey(day), start: day, slots: [] })),
      alignedRows: true,
    };
  }

  return {
    from: range.from,
    to: range.to,
    days: range.days.map((day) => buildDay(day, input, occupying, blocking)),
    alignedRows: Number.isInteger(input.slotMinutes) && DAY_MINUTES % input.slotMinutes === 0,
  };
}

export type DurationLimits = {
  slotMinutes: number
  maxDurationMinutes: number
  reservations: readonly LabReservation[]
};

/**
 * Durations (minutes) bookable from `start`: slot multiples up to the maximum, without reaching the next scheduled
 * reservation. None when a scheduled reservation already covers `start` (taken while the dialog was open).
 */
export function availableDurations(start: Date, { slotMinutes, maxDurationMinutes, reservations }: DurationLimits): number[] {
  if (!(slotMinutes > 0)) {
    return [];
  }

  const startMs = start.getTime();
  // Earliest start among the scheduled reservations that have not ended at `start` (≤ start when one covers it).
  const nextStartMs = reservations
    .filter((reservation) => blocksBooking(reservation) && new Date(reservation.endsAt).getTime() > startMs)
    .map((reservation) => new Date(reservation.startsAt).getTime())
    .reduce((earliest, candidate) => Math.min(earliest, candidate), Number.POSITIVE_INFINITY);
  const durations: number[] = [];

  for (let minutes = slotMinutes; minutes <= maxDurationMinutes; minutes += slotMinutes) {
    if (startMs + minutes * MINUTE_MS > nextStartMs) {
      break;
    }

    durations.push(minutes);
  }

  return durations;
}
