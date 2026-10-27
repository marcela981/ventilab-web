/*
* Funcionalidad: ConnectionPanel
* Descripción: Panel of the Conexión tab of /simulador (W7, Bloque 1; FLUJOS_JULIO b.3): one centred column with the two
*   July cards, "1. Reserva del ventilador" (ReservationCard) and "2. Conexión con el ventilador" (ConnectionCard). It
*   only reads the lab connection of the workspace (LabConnectionProvider, above the tabs), so hiding the tab never
*   disconnects nor releases anything. Replaces the temporary panel of W5. Depends on the connection cards and the
*   connection styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { ConnectionCard } from "./connection-card";
import { ReservationCard } from "./reservation-card";
import styles from "../../../UI/connection/connection-panel.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const CONNECTION_PANEL_COPY = {
  title: "Conexión",
} as const;

export function ConnectionPanel() {
  return (
    <section className={cx(styles.panel)} aria-labelledby="workspace-conexion-title">
      <h2 id="workspace-conexion-title" className={cx(styles.visuallyHidden)}>{CONNECTION_PANEL_COPY.title}</h2>
      <div className={cx(styles.grid)}>
        <ReservationCard />
        <ConnectionCard />
      </div>
    </section>
  );
}
