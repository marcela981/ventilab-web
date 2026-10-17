/*
* Funcionalidad: Reservation calendar
* Descripción: Week or day table of the ventilator slots in America/Bogota built from the slot grid: one column per Bogota day, one row per slot (the time column follows the first day), and per cell a "Reservar" button for a free slot, the occupancy of a taken slot (the holder text the backend returned for the caller role, shown on the first slot of each reservation: students never see other people's names) or an inert cell for past slots and slots outside the booking window. On each range or view change it scrolls to the row of the current Bogota time. v1.1 (T3): with canSelectOccupied (staff) the occupied slots of the bookable range are buttons too, to book over them (preemption). v1.2 (T2 review fix): when the slot length does not divide the 24 h day (grid.alignedRows false) consecutive days have different slot times, so the time column is left empty and every cell shows its own Bogota start time; otherwise the shared time column follows the first day. v1.3 (T4 review fix S1): read-only occupied cells show their own time too when the rows are not aligned. Depends on the slot grid and reservation entities, the class-names helper and the CSS Module.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useRef } from "react";
import { cx } from "@shared/lib/class-names";
import { reservationHolderText } from "../entities/reservation.entity";
import { bogotaDayLabel, slotTimeLabel, slotWindowLabel, startOfBogotaDay } from "../entities/slot-grid";
import type { GridSlot, SlotGrid } from "../entities/slot-grid";
import styles from "../../UI/lab-reservations.module.css";

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const CALENDAR_COPY = {
  label: "Calendario de reservas del ventilador",
  time: "Hora",
  book: (slot: string) => `Reservar ${slot}`,
  bookOver: (slot: string, holder: string) => `Reservar ${slot} sobre la reserva de ${holder}`,
  occupied: "Ocupado",
  past: "Franja pasada",
  outside: "Fuera de la ventana de reserva",
} as const;

export type ReservationCalendarProps = {
  grid: SlotGrid
  now: Date
  onSelectSlot: (slot: GridSlot) => void
  /** Staff: occupied slots in the bookable range are selectable too (the backend decides whether they can be preempted). */
  canSelectOccupied?: boolean
};

type SlotCellProps = {
  slot: GridSlot
  onSelectSlot: (slot: GridSlot) => void
  canSelectOccupied: boolean
  /** Show the slot's own start time inside the cell (rows not aligned across days). */
  showTime: boolean
};

function SlotCell({ slot, onSelectSlot, canSelectOccupied, showTime }: SlotCellProps) {
  const windowLabel = slotWindowLabel(slot.startsAt, slot.endsAt);
  const time = showTime ? <span className={cx(styles.slotTime)}>{slotTimeLabel(slot.startsAt)}</span> : null;

  if (slot.state === "free") {
    return (
      <button
        type="button"
        className={cx(styles.slotFree)}
        aria-label={CALENDAR_COPY.book(windowLabel)}
        onClick={() => onSelectSlot(slot)}
      >
        {time}
      </button>
    );
  }

  if (slot.state === "occupied" && slot.reservation) {
    const holder = reservationHolderText(slot.reservation) ?? CALENDAR_COPY.occupied;

    if (canSelectOccupied && slot.bookable) {
      return (
        <button
          type="button"
          className={cx(styles.slotOccupied, styles.slotOccupiedSelectable, slot.isFirstOfReservation && styles.slotOccupiedStart)}
          aria-label={CALENDAR_COPY.bookOver(windowLabel, holder)}
          title={`${windowLabel} · ${holder}`}
          onClick={() => onSelectSlot(slot)}
        >
          {time}
          {slot.isFirstOfReservation ? <span className={cx(styles.slotHolder)}>{holder}</span> : null}
        </button>
      );
    }

    return (
      <div
        className={cx(styles.slotOccupied, slot.isFirstOfReservation && styles.slotOccupiedStart)}
        title={`${windowLabel} · ${holder}`}
      >
        {time}
        {slot.isFirstOfReservation ? <span className={cx(styles.slotHolder)}>{holder}</span> : null}
      </div>
    );
  }

  return (
    <div
      className={cx(slot.state === "past" ? styles.slotPast : styles.slotOutside)}
      title={slot.state === "past" ? CALENDAR_COPY.past : CALENDAR_COPY.outside}
      aria-hidden="true"
    >
      {time}
    </div>
  );
}

/** Row of the first day whose slot contains the current Bogota time of day. */
function currentRowIndex(grid: SlotGrid, now: Date): number {
  const first = grid.days[0];

  if (!first) {
    return -1;
  }

  const minuteOfDay = (now.getTime() - startOfBogotaDay(now).getTime()) / 60_000;

  return first.slots.findIndex((slot) => (slot.endsAt.getTime() - first.start.getTime()) / 60_000 > minuteOfDay);
}

export function ReservationCalendar({ grid, now, onSelectSlot, canSelectOccupied = false }: ReservationCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const targetRowRef = useRef<HTMLTableRowElement>(null);
  const rowCount = Math.max(0, ...grid.days.map((day) => day.slots.length));
  const targetRow = currentRowIndex(grid, now);
  const rangeKey = `${grid.from.toISOString()}|${grid.days.length}`;

  useEffect(() => {
    const container = scrollRef.current;
    const row = targetRowRef.current;

    if (container && row) {
      container.scrollTop = Math.max(0, row.offsetTop - row.offsetHeight);
    }
    // Only when the range or view changes, not on every refresh of `now`.
  }, [rangeKey]);

  return (
    <div ref={scrollRef} className={cx(styles.calendarScroll)}>
      <table className={cx(styles.calendar)} aria-label={CALENDAR_COPY.label}>
        <thead>
          <tr>
            <th scope="col" className={cx(styles.timeHead)}>{CALENDAR_COPY.time}</th>
            {grid.days.map((day) => (
              <th key={day.key} scope="col" className={cx(styles.dayHead)}>{bogotaDayLabel(day.start)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }, (_, index) => {
            const label = grid.days[0]?.slots[index];

            return (
              <tr key={index} ref={index === targetRow ? targetRowRef : undefined}>
                <th scope="row" className={cx(styles.timeCell)}>{label && grid.alignedRows ? slotTimeLabel(label.startsAt) : ""}</th>
                {grid.days.map((day) => {
                  const slot = day.slots[index];

                  return (
                    <td key={day.key} className={cx(styles.slotCell)}>
                      {slot ? <SlotCell slot={slot} onSelectSlot={onSelectSlot} canSelectOccupied={canSelectOccupied} showTime={!grid.alignedRows} /> : null}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
