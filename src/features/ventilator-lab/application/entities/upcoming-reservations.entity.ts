/*
* Funcionalidad: Staff upcoming reservations entity
* Descripción: Window of "Próximas reservas" on the staff lab (/teacher/lab, DISENO_BLOQUE4 §2.6): from 00:00 of the current Bogota day to UPCOMING_WINDOW_DAYS days later, stable during the day so the cached query does not change every minute (the list itself is upcomingReservations: scheduled, not ended, ordered by start). Depends on the slot grid entities.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { startOfBogotaDay } from "./slot-grid";

export const UPCOMING_WINDOW_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export type UpcomingWindow = {
  from: Date
  to: Date
};

/** From the start of the current Bogota day to UPCOMING_WINDOW_DAYS days later. */
export function upcomingWindow(now: Date): UpcomingWindow {
  const from = startOfBogotaDay(now);

  return { from, to: new Date(from.getTime() + UPCOMING_WINDOW_DAYS * DAY_MS) };
}
