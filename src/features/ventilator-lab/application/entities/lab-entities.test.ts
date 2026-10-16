/*
* Funcionalidad: Lab entities tests
* Descripción: Lab settings resolution (vendored defaults without the platform settings list; server values per key with a per-key fallback to the defaults) and the upcoming reservations selection and status labels. Depends on vitest and the lab entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { settingDto } from "../pages/lab-test-helpers";
import { LAB_SETTING_DEFAULTS, resolveLabSettings } from "./lab-settings.entity";
import { reservationStatusLabel, upcomingReservations } from "./reservation.entity";
import type { LabReservation } from "./reservation.entity";

describe("resolveLabSettings", () => {
  it("uses the vendored backend defaults without the platform settings list", () => {
    const resolved = resolveLabSettings(null);

    expect(resolved.source).toBe("defaults");
    expect(resolved.settings["reservations.slotMinutes"]).toBe(15);
    expect(resolved.settings["reservations.maxDurationMinutes"]).toBe(120);
    expect(resolved.settings["reservations.maxAdvanceDays"]).toBe(14);
    expect(resolved.settings["reservations.maxUpcomingPerStudent"]).toBe(3);
    expect(resolved.settings["reservations.maxUpcomingPerGroup"]).toBe(5);
    expect(resolved.settings["commands.safety.maxPeep"]).toBe(15);
  });

  it("takes each numeric server value and keeps the default for missing or invalid keys", () => {
    const resolved = resolveLabSettings([
      settingDto("reservations.slotMinutes", 30),
      settingDto("reservations.maxDurationMinutes", "60"),
      settingDto("ai.quotas", 5),
    ]);

    expect(resolved.source).toBe("server");
    expect(resolved.settings["reservations.slotMinutes"]).toBe(30);
    expect(resolved.settings["reservations.maxDurationMinutes"]).toBe(LAB_SETTING_DEFAULTS["reservations.maxDurationMinutes"]);
    expect(resolved.settings["reservations.maxAdvanceDays"]).toBe(LAB_SETTING_DEFAULTS["reservations.maxAdvanceDays"]);
    expect(Object.keys(resolved.settings)).toEqual(Object.keys(LAB_SETTING_DEFAULTS));
  });
});

const limited = (id: string, startsAt: string, endsAt: string): LabReservation => ({
  visibility: "limited",
  id,
  startsAt,
  endsAt,
  status: "SCHEDULED",
  occupancyLabel: "Reservado por un estudiante",
});

describe("upcomingReservations", () => {
  it("drops ended and excluded reservations and orders the rest by start", () => {
    const now = new Date("2026-10-16T15:00:00.000Z");
    const list = [
      limited("late", "2026-10-17T10:00:00.000Z", "2026-10-17T11:00:00.000Z"),
      limited("ended", "2026-10-16T13:00:00.000Z", "2026-10-16T14:00:00.000Z"),
      limited("active", "2026-10-16T14:30:00.000Z", "2026-10-16T15:30:00.000Z"),
      limited("soon", "2026-10-16T16:00:00.000Z", "2026-10-16T17:00:00.000Z"),
    ];

    expect(upcomingReservations(list, now, "active").map(({ id }) => id)).toEqual(["soon", "late"]);
    expect(upcomingReservations(list, now).map(({ id }) => id)).toEqual(["active", "soon", "late"]);
  });

  it("labels the known statuses in Spanish and keeps unknown ones", () => {
    expect(reservationStatusLabel("SCHEDULED")).toBe("Programada");
    expect(reservationStatusLabel("PREEMPTED")).toBe("Desplazada");
    expect(reservationStatusLabel("ARCHIVED")).toBe("ARCHIVED");
  });
});
