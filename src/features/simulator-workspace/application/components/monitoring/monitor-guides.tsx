/*
* Funcionalidad: Monitor guides
* Descripción: Guide states of the Monitoreo tab (W6, Bloque 1): without a digital session nor a connection, the July
*   placeholder message (FLUJOS_JULIO a.4/a.9: "Configura o inicia un paciente…") with the shortcuts to Simular
*   Paciente and Conexión; in real mode without a CONNECTED ventilator, the guide to connect from Conexión; and the
*   slot of the real-ventilator console while connected (W10 mounts the real monitor there). Depends on the workspace
*   tab hook and the monitoring styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { useWorkspaceTab } from "../../hooks/use-workspace-tab";
import styles from "../../../UI/monitoring/monitoring-panel.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const MONITOR_GUIDES_COPY = {
  empty: "Configura o inicia un paciente en la pestaña \"Simular Paciente\" para ver las curvas en tiempo real.",
  goToPatient: "Ir a Simular Paciente",
  goToConnection: "Ir a Conexión",
  realDisconnected: "Conéctate desde la pestaña Conexión para ver los datos del ventilador físico.",
  realConnected: "Conectado al ventilador físico. Esperando datos del ventilador físico...",
} as const;

export function EmptyMonitorGuide() {
  const { selectTab } = useWorkspaceTab();

  return (
    <section className={cx(styles.guide)} aria-label={MONITOR_GUIDES_COPY.empty}>
      <p className={cx(styles.guideText)}>{MONITOR_GUIDES_COPY.empty}</p>
      <div className={cx(styles.guideActions)}>
        <button type="button" className={cx(styles.primaryButton)} onClick={() => selectTab("simular")}>
          {MONITOR_GUIDES_COPY.goToPatient}
        </button>
        <button type="button" className={cx(styles.secondaryButton)} onClick={() => selectTab("conexion")}>
          {MONITOR_GUIDES_COPY.goToConnection}
        </button>
      </div>
    </section>
  );
}

export type RealMonitorSlotProps = {
  connected: boolean
};

/** Real mode: the guide to connect, or the slot of the real-ventilator console (W10) while connected. */
export function RealMonitorSlot({ connected }: RealMonitorSlotProps) {
  const { selectTab } = useWorkspaceTab();

  if (connected) {
    return (
      <section className={cx(styles.guide)} data-slot="real-monitor">
        <p className={cx(styles.guideText)} role="status">{MONITOR_GUIDES_COPY.realConnected}</p>
      </section>
    );
  }

  return (
    <section className={cx(styles.guide)}>
      <p className={cx(styles.guideText)}>{MONITOR_GUIDES_COPY.realDisconnected}</p>
      <div className={cx(styles.guideActions)}>
        <button type="button" className={cx(styles.primaryButton)} onClick={() => selectTab("conexion")}>
          {MONITOR_GUIDES_COPY.goToConnection}
        </button>
      </div>
    </section>
  );
}
