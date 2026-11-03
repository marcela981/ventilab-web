/*
* Funcionalidad: Upcoming reservations window tests
* Descripción: upcomingWindow starts at 00:00 of the Bogota day (also late at night, when the UTC date is already the next day) and spans UPCOMING_WINDOW_DAYS days. Depends on vitest and the upcoming reservations entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { UPCOMING_WINDOW_DAYS, upcomingWindow } from "./upcoming-reservations.entity";

describe("upcomingWindow", () => {
  it("spans the current Bogota day and the next days", () => {
    const window = upcomingWindow(new Date("2026-10-16T14:37:00.000Z"));

    expect(UPCOMING_WINDOW_DAYS).toBe(7);
    expect(window.from.toISOString()).toBe("2026-10-16T05:00:00.000Z");
    expect(window.to.toISOString()).toBe("2026-10-23T05:00:00.000Z");
  });

  it("uses the Bogota day when the UTC date already changed", () => {
    // 22:30 of Friday 16 in Bogota is Saturday 17 in UTC.
    expect(upcomingWindow(new Date("2026-10-17T03:30:00.000Z")).from.toISOString()).toBe("2026-10-16T05:00:00.000Z");
  });

  it("keeps the same bounds during the day", () => {
    const morning = upcomingWindow(new Date("2026-10-16T06:00:00.000Z"));
    const evening = upcomingWindow(new Date("2026-10-17T04:59:00.000Z"));

    expect(evening).toEqual(morning);
  });
});
