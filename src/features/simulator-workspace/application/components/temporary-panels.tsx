/*
* Funcionalidad: Temporary workspace panels
* Descripción: Minimal panels of the /simulador tabs that are not built yet (W5, Bloque 1), so every tab has content
*   without loading the pages that existed before the workspace: Simular Paciente (W8 brings the own-patient form;
*   meanwhile a short list of published cases with "Iniciar práctica", which opens the session in Monitoreo through the
*   workspace session), Conexión (W7 brings reservation and connection; meanwhile a link to the reservations calendar)
*   and Mis sesiones (W9 brings the unified list and the replay). Each one is lazy loaded by the workspace and replaced
*   by its task. Depends on next/link, the design-system states, the simulator catalog entry point, the workspace
*   session and the workspace styles.
*   v0.2 (W8, Bloque 1): the temporary Simular panel is gone (the patient form panel replaces it).
*   Depends on next/link and the workspace styles.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Link from "next/link";
import { cx } from "@shared/lib/class-names";
import styles from "../../UI/simulator-workspace.module.css";

/** Reservations calendar of the ventilator lab (its page is kept, see the ventilator-lab routes). */
const LAB_RESERVATIONS_PATH = "/lab/reservations";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const TEMPORARY_PANELS_COPY = {
  conexionTitle: "Conexión",
  conexionNote: "Muy pronto podrás reservar y conectarte al ventilador físico desde esta pestaña. Mientras tanto, puedes reservar desde el calendario.",
  reservations: "Ver calendario de reservas",
  sesionesTitle: "Mis sesiones",
  sesionesNote: "Muy pronto verás aquí tus sesiones y sus repeticiones.",
} as const;

export function TemporaryConexionPanel() {
  return (
    <section className={cx(styles.temporaryPanel)} aria-labelledby="workspace-conexion-title">
      <h2 id="workspace-conexion-title" className={cx(styles.panelTitle)}>{TEMPORARY_PANELS_COPY.conexionTitle}</h2>
      <p className={cx(styles.muted)}>{TEMPORARY_PANELS_COPY.conexionNote}</p>
      <Link href={LAB_RESERVATIONS_PATH} className={cx(styles.link)}>{TEMPORARY_PANELS_COPY.reservations}</Link>
    </section>
  );
}

export function TemporarySesionesPanel() {
  return (
    <section className={cx(styles.temporaryPanel)} aria-labelledby="workspace-sesiones-title">
      <h2 id="workspace-sesiones-title" className={cx(styles.panelTitle)}>{TEMPORARY_PANELS_COPY.sesionesTitle}</h2>
      <p className={cx(styles.muted)}>{TEMPORARY_PANELS_COPY.sesionesNote}</p>
    </section>
  );
}
