/*
* Funcionalidad: Slot grid tests
* Descripción: Pure tests of the reservation slot grid: Bogota day and Monday-based week ranges independent of the browser time zone (UTC-5 all year, no daylight saving time), navigation, slots by slotMinutes aligned like the backend (epoch boundaries), occupancy overlay (cancelled and preempted reservations do not occupy), past slots (the slot in progress is still bookable, as on the server), slots outside the booking window and the available durations capped by the maximum and by the next reservation. v1.1 (T3): the bookable flag of occupied slots (staff preemption). v1.2 (T2 review fix): the slot that crosses Bogota midnight belongs to the day it starts in, rows are aligned only when slotMinutes divides the day, a completed (released) reservation does not block the bookable range, and no duration is offered from a start that a scheduled reservation already covers. Depends on vitest and the slot grid entity.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { LabReservation } from "./reservation.entity";
import {
  availableDurations,
  bogotaDayKey,
  buildSlotGrid,
  calendarRange,
  shiftAnchor,
  slotTimeLabel,
  startOfBogotaDay,
  startOfBogotaWeek,
} from "./slot-grid";

const limited = (id: string, startsAt: string, endsAt: string, status = "SCHEDULED"): LabReservation => ({
  visibility: "limited",
  id,
  startsAt,
  endsAt,
  status,
  occupancyLabel: "Reservado por un estudiante",
});

describe("Bogota day and week ranges", () => {
  it("starts the Bogota day at 05:00 UTC, also for instants that are already the next UTC day", () => {
    // 2026-10-17T03:00Z is still Oct 16 at 22:00 in Bogota.
    expect(startOfBogotaDay(new Date("2026-10-17T03:00:00.000Z")).toISOString()).toBe("2026-10-16T05:00:00.000Z");
    expect(bogotaDayKey(new Date("2026-10-17T03:00:00.000Z"))).toBe("2026-10-16");
    expect(bogotaDayKey(new Date("2026-10-17T05:00:00.000Z"))).toBe("2026-10-17");
  });

  it("starts the week on Monday in Bogota, across a month boundary", () => {
    // Saturday 2026-10-31 at 23:30 in Bogota (Nov 1 04:30 UTC) belongs to the week of Monday Oct 26.
    expect(startOfBogotaWeek(new Date("2026-11-01T04:30:00.000Z")).toISOString()).toBe("2026-10-26T05:00:00.000Z");
    // Sunday 2026-11-01 at 10:00 in Bogota is still that week; Monday Nov 2 starts the next one.
    expect(startOfBogotaWeek(new Date("2026-11-01T15:00:00.000Z")).toISOString()).toBe("2026-10-26T05:00:00.000Z");
    expect(startOfBogotaWeek(new Date("2026-11-02T05:00:00.000Z")).toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });

  it("has no daylight saving shift: every week is exactly 7 × 24 h, also across the US/EU DST changes", () => {
    const range = calendarRange("week", new Date("2026-11-01T15:00:00.000Z"));

    expect(range.from.toISOString()).toBe("2026-10-26T05:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-11-02T05:00:00.000Z");
    expect(range.days.map(bogotaDayKey)).toEqual([
      "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01",
    ]);
    expect(calendarRange("week", new Date("2027-03-14T15:00:00.000Z")).to.getTime()
      - calendarRange("week", new Date("2027-03-14T15:00:00.000Z")).from.getTime()).toBe(7 * 86_400_000);
  });

  it("builds a one-day range for the day view", () => {
    const range = calendarRange("day", new Date("2026-10-16T14:30:00.000Z"));

    expect(range.from.toISOString()).toBe("2026-10-16T05:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-10-17T05:00:00.000Z");
    expect(range.days).toHaveLength(1);
  });

  it("moves the anchor by one day or one week", () => {
    const anchor = new Date("2026-10-16T14:30:00.000Z");

    expect(shiftAnchor("day", anchor, 1).toISOString()).toBe("2026-10-17T14:30:00.000Z");
    expect(shiftAnchor("week", anchor, -1).toISOString()).toBe("2026-10-09T14:30:00.000Z");
  });

  it("labels a slot with its Bogota wall-clock time", () => {
    expect(slotTimeLabel(new Date("2026-10-16T13:15:00.000Z"))).toBe("08:15");
  });
});

describe("buildSlotGrid", () => {
  const base = {
    view: "day" as const,
    anchor: new Date("2026-10-16T14:30:00.000Z"),
    now: new Date("2026-10-16T14:37:00.000Z"),
    slotMinutes: 15,
    maxAdvanceDays: 14,
    reservations: [] as LabReservation[],
  };

  const slotAt = (grid: ReturnType<typeof buildSlotGrid>, iso: string) => {
    const slot = grid.days.flatMap((day) => day.slots).find((candidate) => candidate.startsAt.toISOString() === iso);

    if (!slot) {
      throw new Error(`no slot at ${iso}`);
    }

    return slot;
  };

  it("splits each Bogota day into slots of slotMinutes", () => {
    const grid = buildSlotGrid(base);

    expect(grid.days).toHaveLength(1);
    expect(grid.days[0]?.slots).toHaveLength(96);
    expect(grid.days[0]?.slots[0]?.startsAt.toISOString()).toBe("2026-10-16T05:00:00.000Z");
    expect(grid.days[0]?.slots[95]?.endsAt.toISOString()).toBe("2026-10-17T05:00:00.000Z");
    expect(buildSlotGrid({ ...base, view: "week", slotMinutes: 30 }).days.map((day) => day.slots.length))
      .toEqual([48, 48, 48, 48, 48, 48, 48]);
  });

  it("aligns slots to the same epoch boundaries the backend checks", () => {
    // 45 does not divide the 05:00 UTC day start, so the first slot is the first epoch boundary of the day.
    const grid = buildSlotGrid({ ...base, slotMinutes: 45 });
    const first = grid.days[0]?.slots[0];

    expect((first?.startsAt.getTime() ?? -1) % (45 * 60_000)).toBe(0);
    expect(first?.startsAt.getTime()).toBeGreaterThanOrEqual(new Date("2026-10-16T05:00:00.000Z").getTime());
  });

  it("marks past slots; the slot in progress stays bookable as on the server", () => {
    const grid = buildSlotGrid(base);

    expect(slotAt(grid, "2026-10-16T14:15:00.000Z").state).toBe("past");
    expect(slotAt(grid, "2026-10-16T14:30:00.000Z").state).toBe("free");
    expect(slotAt(grid, "2026-10-16T14:45:00.000Z").state).toBe("free");
  });

  it("marks slots that start after the booking window", () => {
    const grid = buildSlotGrid({ ...base, maxAdvanceDays: 0.25, view: "day" });

    // now + 6 h = 20:37 UTC: 20:30 is inside, 20:45 outside.
    expect(slotAt(grid, "2026-10-16T20:30:00.000Z").state).toBe("free");
    expect(slotAt(grid, "2026-10-16T20:45:00.000Z").state).toBe("outside-window");
  });

  it("overlays the reservations that occupy each slot and ignores cancelled and preempted ones", () => {
    const occupied = limited("r1", "2026-10-16T15:00:00.000Z", "2026-10-16T15:30:00.000Z");
    const grid = buildSlotGrid({
      ...base,
      reservations: [
        occupied,
        limited("r2", "2026-10-16T16:00:00.000Z", "2026-10-16T17:00:00.000Z", "CANCELLED"),
        limited("r3", "2026-10-16T17:00:00.000Z", "2026-10-16T18:00:00.000Z", "PREEMPTED"),
        limited("old", "2026-10-16T13:00:00.000Z", "2026-10-16T13:30:00.000Z", "COMPLETED"),
      ],
    });

    expect(slotAt(grid, "2026-10-16T15:00:00.000Z")).toMatchObject({ state: "occupied", reservation: occupied, isFirstOfReservation: true });
    expect(slotAt(grid, "2026-10-16T15:15:00.000Z")).toMatchObject({ state: "occupied", isFirstOfReservation: false });
    expect(slotAt(grid, "2026-10-16T15:30:00.000Z").state).toBe("free");
    expect(slotAt(grid, "2026-10-16T16:00:00.000Z").state).toBe("free");
    expect(slotAt(grid, "2026-10-16T17:00:00.000Z").state).toBe("free");
    expect(slotAt(grid, "2026-10-16T13:00:00.000Z").state).toBe("occupied");
  });

  it("flags occupied slots in the bookable time range (for staff preemption) but not past or outside ones", () => {
    const grid = buildSlotGrid({
      ...base,
      maxAdvanceDays: 0.25,
      reservations: [
        limited("past", "2026-10-16T13:00:00.000Z", "2026-10-16T13:30:00.000Z"),
        limited("now", "2026-10-16T14:30:00.000Z", "2026-10-16T15:00:00.000Z"),
        limited("later", "2026-10-16T21:00:00.000Z", "2026-10-16T21:30:00.000Z"),
      ],
    });

    expect(slotAt(grid, "2026-10-16T13:00:00.000Z")).toMatchObject({ state: "occupied", bookable: false });
    expect(slotAt(grid, "2026-10-16T14:30:00.000Z")).toMatchObject({ state: "occupied", bookable: true });
    expect(slotAt(grid, "2026-10-16T21:00:00.000Z")).toMatchObject({ state: "occupied", bookable: false });
    expect(slotAt(grid, "2026-10-16T15:00:00.000Z")).toMatchObject({ state: "free", bookable: true });
    expect(slotAt(grid, "2026-10-16T14:15:00.000Z")).toMatchObject({ state: "past", bookable: false });
  });

  it("keeps the slot that crosses Bogota midnight in the day it starts in (slot lengths that do not divide 300 min)", () => {
    // 45-min epoch boundaries: 04:30–05:15 UTC crosses Bogota midnight (05:00 UTC).
    const grid = buildSlotGrid({ ...base, slotMinutes: 45 });
    const slots = grid.days[0]?.slots ?? [];

    expect(slots[0]?.startsAt.toISOString()).toBe("2026-10-16T05:15:00.000Z");
    expect(slots.at(-1)?.startsAt.toISOString()).toBe("2026-10-17T04:30:00.000Z");
    expect(slots.at(-1)?.endsAt.toISOString()).toBe("2026-10-17T05:15:00.000Z");
    // 1440 / 45 = 32 slots per day, none lost.
    expect(slots).toHaveLength(32);
  });

  it("aligns rows only when slotMinutes divides the 24 h day", () => {
    expect(buildSlotGrid({ ...base, view: "week", slotMinutes: 15 }).alignedRows).toBe(true);
    expect(buildSlotGrid({ ...base, view: "week", slotMinutes: 45 }).alignedRows).toBe(true);
    const odd = buildSlotGrid({ ...base, view: "week", slotMinutes: 7 });
    const firstTimes = odd.days.map((day) => slotTimeLabel(day.slots[0]?.startsAt ?? new Date(0)));

    expect(odd.alignedRows).toBe(false);
    // With 7-min slots consecutive days start at different times: a shared time column would be wrong.
    expect(new Set(firstTimes).size).toBeGreaterThan(1);
  });

  it("does not let a completed (released early) reservation block the bookable range", () => {
    // Released at 14:40 UTC inside the slot in progress (14:30): the backend only conflicts with SCHEDULED reservations.
    const released = limited("done", "2026-10-16T14:00:00.000Z", "2026-10-16T14:40:00.000Z", "COMPLETED");
    const grid = buildSlotGrid({ ...base, reservations: [released] });

    expect(slotAt(grid, "2026-10-16T14:00:00.000Z").state).toBe("occupied");
    expect(slotAt(grid, "2026-10-16T14:15:00.000Z").state).toBe("occupied");
    expect(slotAt(grid, "2026-10-16T14:30:00.000Z")).toMatchObject({ state: "free", reservation: null, bookable: true });
  });

  it("marks a reservation that started in an earlier slot as the first one at the start of the day", () => {
    const overnight = limited("n", "2026-10-16T04:00:00.000Z", "2026-10-16T06:00:00.000Z");
    const grid = buildSlotGrid({ ...base, reservations: [overnight] });

    expect(slotAt(grid, "2026-10-16T05:00:00.000Z")).toMatchObject({ state: "occupied", isFirstOfReservation: true });
  });
});

describe("availableDurations", () => {
  const start = new Date("2026-10-16T15:00:00.000Z");

  it("offers multiples of slotMinutes up to the maximum duration", () => {
    expect(availableDurations(start, { slotMinutes: 15, maxDurationMinutes: 60, reservations: [] })).toEqual([15, 30, 45, 60]);
    expect(availableDurations(start, { slotMinutes: 25, maxDurationMinutes: 60, reservations: [] })).toEqual([25, 50]);
  });

  it("stops at the next reservation that occupies the ventilator", () => {
    const next = limited("n", "2026-10-16T15:45:00.000Z", "2026-10-16T16:00:00.000Z");
    const cancelled = limited("c", "2026-10-16T15:15:00.000Z", "2026-10-16T15:30:00.000Z", "CANCELLED");

    expect(availableDurations(start, { slotMinutes: 15, maxDurationMinutes: 120, reservations: [next, cancelled] }))
      .toEqual([15, 30, 45]);
  });

  it("offers nothing from a start that a scheduled reservation already covers (slot taken while the dialog was open)", () => {
    const taken = limited("t", "2026-10-16T14:45:00.000Z", "2026-10-16T15:30:00.000Z");

    expect(availableDurations(start, { slotMinutes: 15, maxDurationMinutes: 120, reservations: [taken] })).toEqual([]);
  });

  it("ignores completed reservations, which the backend does not treat as conflicts", () => {
    const completed = limited("d", "2026-10-16T15:30:00.000Z", "2026-10-16T16:00:00.000Z", "COMPLETED");

    expect(availableDurations(start, { slotMinutes: 15, maxDurationMinutes: 60, reservations: [completed] })).toEqual([15, 30, 45, 60]);
  });
});
