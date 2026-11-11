/*
* Funcionalidad: Monitor guides
* Descripción: Guide states of the Monitoreo tab (W6, Bloque 1): without a digital session nor a connection, the July
*   placeholder message (FLUJOS_JULIO a.4/a.9: "Configura o inicia un paciente…") with the shortcuts to Simular
*   Paciente and Conexión; in real mode without a CONNECTED ventilator, the guide to connect from Conexión; and the
*   slot of the real-ventilator console while connected (W10 mounts the real monitor there). Depends on the workspace
*   tab hook and the monitoring styles.
*   v0.2 (W10, Bloque 1): while connected the slot LAZY loads the real monitor (its hooks and the live console are not
*   part of the Monitoreo chunk), with the waiting message as fallback. Depends also on React.lazy and retryImport.
*   v0.3 (Bloque 5, C8): the real slot takes the monitor top row (`header`: shown with the guides and the fallback)
*   and the July pieces it hands to the real monitor (mode selector, signal chip, value cards).
*   v0.4 (2026-11-10, real-mode reconnection): once the real monitor was shown it stays mounted while the connection is
*   CONNECTING again (socket reconnection, control re-read); before, deriveConnectionState's CONNECTING unmounted the
*   whole console. The guide to connect is only for a caller who never got CONNECTED (or left the connection).
* Versión: 0.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense, useState } from "react";
import type { ReactNode } from "react";
import type { MonitorCardsController } from "@shared/ventilator-console";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
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
  /** v0.4: the connection is CONNECTING (socket reconnecting, control re-read): a console already shown stays mounted. */
  reconnecting?: boolean
  /** The monitor top row (mode selector and chip) for the states without the real console. */
  header?: ReactNode
  /** July pieces of the real console: left column top, curves toolbar start, value cards. */
  leftTop?: ReactNode
  statusChip?: ReactNode
  cards?: MonitorCardsController | undefined
};

const RealMonitor = lazy(() =>
  retryImport(() => import("./real/real-monitor")).then((module) => ({ default: module.RealMonitor })),
);

/** Real mode: the guide to connect, or the real monitor (W10) while connected and while it reconnects. */
export function RealMonitorSlot({ connected, reconnecting = false, header = null, leftTop = null, statusChip = null, cards }: RealMonitorSlotProps) {
  const { selectTab } = useWorkspaceTab();
  // Latched once CONNECTED and kept while CONNECTING: a reconnection must not unmount the console (curves, breath
  // detection, pending edits and the command queue would start over); only leaving the connection drops it.
  const [shown, setShown] = useState(connected);

  if (connected && !shown) {
    setShown(true);
  } else if (!connected && !reconnecting && shown) {
    setShown(false);
  }

  if (connected || (shown && reconnecting)) {
    return (
      <section data-slot="real-monitor">
        <Suspense fallback={<>{header}<p className={cx(styles.guideText)} role="status">{MONITOR_GUIDES_COPY.realConnected}</p></>}>
          <RealMonitor header={header} leftTop={leftTop} statusChip={statusChip} cards={cards} />
        </Suspense>
      </section>
    );
  }

  return (
    <>
      {header}
      <section className={cx(styles.guide)}>
        <p className={cx(styles.guideText)}>{MONITOR_GUIDES_COPY.realDisconnected}</p>
        <div className={cx(styles.guideActions)}>
          <button type="button" className={cx(styles.primaryButton)} onClick={() => selectTab("conexion")}>
            {MONITOR_GUIDES_COPY.goToConnection}
          </button>
        </div>
      </section>
    </>
  );
}
