/*
* Funcionalidad: Legacy lab redirects
* Descripción: T12: the legacy real-ventilator route `/simulador` (pages/simulador/index.js: the old dashboard with the
*   reservation, the connection tab and the live data of the physical ventilator, all in one page) is replaced by the
*   lab. Its connection console was a tab inside that single page (no own URL), so every legacy URL goes to the lab
*   summary `/lab`, which offers the calendar, the live console ("Entrar a la consola") and the recordings. There was
*   no separate legacy reservation route (the old reservations were the `/simulation/reserve` API inside `/simulador`).
*   `legacyLabRedirect` gives the getServerSideProps result: a temporary redirect (not permanent, so browsers do not
*   cache it while the legacy code still exists; P2 removes it with the author's approval). Depends on the lab routes.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { LAB_URL } from "./lab.routes";

/** Legacy route → new route. */
export const LEGACY_LAB_REDIRECTS = {
  "/simulador": LAB_URL,
} as const;

export type LegacyLabRoute = keyof typeof LEGACY_LAB_REDIRECTS;

export type LegacyLabRedirectResult = { redirect: { destination: string, permanent: false } };

export function legacyLabRedirect(from: LegacyLabRoute): LegacyLabRedirectResult {
  return { redirect: { destination: LEGACY_LAB_REDIRECTS[from], permanent: false } };
}
