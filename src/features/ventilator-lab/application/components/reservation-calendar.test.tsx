/*
* Funcionalidad: Reservation calendar tests
* Descripción: Time labels of the calendar table (T2 review fix): with a slot length that divides the 24 h day the shared time column follows the rows and cells carry no time; with one that does not (consecutive days start at different times) the time column is empty and every cell shows its own Bogota start time. v1.1 (T4 review fix S1): read-only occupied cells show their time too. Depends on vitest, Testing Library, the slot grid and the calendar component.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { toLabReservation } from "../../api/mappers/reservations.mapper";
import type { LabReservation } from "../entities/reservation.entity";
import { buildSlotGrid } from "../entities/slot-grid";
import { summaryDto } from "../pages/lab-test-helpers";
import { ReservationCalendar } from "./reservation-calendar";

const NOW = new Date("2026-10-16T14:37:00.000Z");

function renderGrid(slotMinutes: number, reservations: LabReservation[] = []) {
  const grid = buildSlotGrid({ view: "week", anchor: NOW, now: NOW, slotMinutes, maxAdvanceDays: 14, reservations });

  render(<ReservationCalendar grid={grid} now={NOW} onSelectSlot={() => undefined} />);

  return { table: screen.getByRole("table", { name: "Calendario de reservas del ventilador" }) };
}

describe("ReservationCalendar time labels", { timeout: 20_000 }, () => {
  it("uses the shared time column when every day has the same slot times", () => {
    const { table } = renderGrid(60);
    const rowHeaders = within(table).getAllByRole("rowheader").map((header) => header.textContent);

    expect(rowHeaders.slice(0, 3)).toEqual(["00:00", "01:00", "02:00"]);
    expect(within(table).getByRole("button", { name: /16 de oct · 10:00 – 11:00/ }).textContent).toBe("");
  });

  it("labels every cell with its own time when the rows of consecutive days are not aligned", () => {
    const { table } = renderGrid(7);
    const rowHeaders = within(table).getAllByRole("rowheader").map((header) => header.textContent);

    expect(rowHeaders.every((text) => text === "")).toBe(true);
    // Each free cell shows its own start time (the button text), matching its aria-label window.
    const fridayButton = within(table).getAllByRole("button").find((button) => button.getAttribute("aria-label")?.includes("16 de oct"));
    const label = fridayButton?.getAttribute("aria-label") ?? "";

    expect(label).toContain(`· ${fridayButton?.textContent ?? "?"} – `);
  });

  it("shows the own time in read-only occupied cells too when the rows are not aligned (T4 review fix S1)", () => {
    const taken = toLabReservation({ ...summaryDto("x", "reservations.labels.student", "x"), startsAt: "2026-10-16T17:00:00.000Z", endsAt: "2026-10-16T18:00:00.000Z" });
    const { table } = renderGrid(7, [taken]);
    const cells = within(table).getAllByTitle(/Reservado por un estudiante/);

    expect(cells.length).toBeGreaterThan(0);

    for (const cell of cells) {
      const start = /· (\d{2}:\d{2}) – /.exec(cell.getAttribute("title") ?? "")?.[1];

      expect(start).toBeDefined();
      expect(cell.textContent).toContain(start ?? "?");
    }
  });
});
