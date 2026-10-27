/*
* Funcionalidad: Monitoring panel
* Descripción: Monitoreo tab of the /simulador workspace. v0.1 (W5): a minimal panel reading the workspace session.
*   v0.2 (W6, Bloque 1): the Digital/Real mode selector with the status chip on top (low-frequency state only: session
*   status and lab connection). Digital with an open session: the shared SessionMonitor of the simulator (session bar
*   with clock, multiplier and pause; store-fed VentilatorConsole with curves, numeric and patient monitors, alarms bar
*   and CONFIRMAR controls, WITHOUT the alarm limits panel, DISENO_BLOQUE1 §2.6; case panel with live objectives;
*   "Asesoría IA"; "Finalizar sesión") plus the own patient when the session has one; a successful end opens the
*   result dialog on /simulador and closing it clears `?session=`. Digital without a session: the July guide with the
*   shortcuts to Simular Paciente and Conexión. Real: the guide to connect, or the slot W10 fills while CONNECTED. The
*   mode is local state (the panel never unmounts); the digital view keeps rendering while the session runs, so the
*   console and its pending edits survive mode and tab switches. Depends on React, the simulator session entry point,
*   the workspace session and lab connection, the monitor components and the monitoring styles.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useState } from "react";
import { SessionMonitor } from "@features/simulator/session.entry";
import type { SimSessionHostValue } from "@features/simulator/session.entry";
import { cx } from "@shared/lib/class-names";
import { deriveMonitorStatus } from "../../entities/monitor-status.entity";
import type { MonitorMode } from "../../entities/monitor-status.entity";
import { useLabConnection } from "../lab-connection-provider";
import { useWorkspaceSession } from "../workspace-session-provider";
import { MonitorHeader } from "./monitor-header";
import { EmptyMonitorGuide, RealMonitorSlot } from "./monitor-guides";
import { PatientInfo } from "./patient-info";
import { SessionResultDialog } from "./session-result-dialog";
import styles from "../../../UI/monitoring/monitoring-panel.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const MONITORING_PANEL_COPY = {
  title: "Monitoreo",
  preparing: "Preparando la sesión de simulación…",
} as const;

function DigitalMonitor({ host }: { host: SimSessionHostValue }) {
  const patient = host.running?.boot.record.patient ?? null;

  return (
    <div className={cx(styles.console)}>
      <SessionMonitor host={host} aside={patient ? <PatientInfo patient={patient} /> : null} />
    </div>
  );
}

export function MonitoringPanel() {
  const { sessionId, host, endedSessionId, clear } = useWorkspaceSession();
  const { connected } = useLabConnection();
  const [mode, setMode] = useState<MonitorMode>("digital");
  const sessionStatus = host?.running?.session.status ?? null;
  const status = deriveMonitorStatus({ mode, sessionStatus, connected });

  let digital;

  if (!sessionId) {
    digital = <EmptyMonitorGuide />;
  } else if (host) {
    digital = <DigitalMonitor host={host} />;
  } else {
    digital = <p className={cx(styles.muted)} role="status">{MONITORING_PANEL_COPY.preparing}</p>;
  }

  return (
    <section className={cx(styles.panel)} aria-labelledby="workspace-monitoreo-title">
      <h2 id="workspace-monitoreo-title" className={cx(styles.visuallyHidden)}>{MONITORING_PANEL_COPY.title}</h2>
      <MonitorHeader mode={mode} onModeChange={setMode} status={status} />
      {/* The digital view stays mounted in real mode while a session runs (console state, pending edits, canvases). */}
      <div hidden={mode !== "digital"}>{digital}</div>
      {mode === "real" ? <RealMonitorSlot connected={connected} /> : null}
      <SessionResultDialog sessionId={endedSessionId} onClose={clear} />
    </section>
  );
}
