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
*   v0.3 (W10, Bloque 1): the real view is the lazy real monitor while CONNECTED; once real mode was opened it stays
*   mounted (hidden in digital mode), so its console edits, recording state and latency survive mode switches.
*   v0.4 (Bloque 5, C6): the digital SessionMonitor is the July layout (the own patient goes into the case drawer) and
*   receives the signed-in user's value cards preference (useMonitorCardsPref).
*   v0.5 (Bloque 5, C7): with the digital console on screen, the Digital/Real selector moves into its left column
*   (`leftTop`, before "Paciente activo") and the status chip to the start of the curves toolbar
*   (`curvesToolbarStart`); the top row (MonitorHeader) only shows for the states without a digital console (guide,
*   preparing, notices) and for the real view.
* Versión: 0.5
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { SessionMonitor } from "@features/simulator/session.entry";
import type { SimSessionHostValue } from "@features/simulator/session.entry";
import { cx } from "@shared/lib/class-names";
import { useSession } from "@shared/session/use-session";
import { deriveMonitorStatus } from "../../entities/monitor-status.entity";
import { useMonitorCardsPref } from "../../hooks/use-monitor-cards-pref";
import type { MonitorMode } from "../../entities/monitor-status.entity";
import { useLabConnection } from "../lab-connection-provider";
import { useWorkspaceSession } from "../workspace-session-provider";
import { MonitorHeader, MonitorModeSelector, MonitorStatusChip } from "./monitor-header";
import { EmptyMonitorGuide, RealMonitorSlot } from "./monitor-guides";
import { PatientInfo } from "./patient-info";
import { SessionResultDialog } from "./session-result-dialog";
import styles from "../../../UI/monitoring/monitoring-panel.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const MONITORING_PANEL_COPY = {
  title: "Monitoreo",
  preparing: "Preparando la sesión de simulación…",
} as const;

type DigitalMonitorProps = {
  host: SimSessionHostValue
  /** The July left column top (monitor mode selector) and the curves toolbar start (status chip). */
  leftTop: ReactNode
  chip: ReactNode
};

/** The digital console is on screen (not a phase notice nor the starting text). */
function hasDigitalConsole(host: SimSessionHostValue | null): boolean {
  return host?.phase === "ready" && Boolean(host.running?.session.adapter) && host.running?.version.status !== "blocked";
}

function DigitalMonitor({ host, leftTop, chip }: DigitalMonitorProps) {
  const patient = host.running?.boot.record.patient ?? null;
  const { user } = useSession();
  const cards = useMonitorCardsPref(user?.id);

  return (
    <div className={cx(styles.console)}>
      <SessionMonitor
        host={host}
        aside={patient ? <PatientInfo patient={patient} /> : null}
        cards={cards}
        leftTop={leftTop}
        curvesToolbarStart={chip}
      />
    </div>
  );
}

export function MonitoringPanel() {
  const { sessionId, host, endedSessionId, clear } = useWorkspaceSession();
  const { connected } = useLabConnection();
  const [mode, setMode] = useState<MonitorMode>("digital");
  const [realOpened, setRealOpened] = useState(false);
  const sessionStatus = host?.running?.session.status ?? null;
  const status = deriveMonitorStatus({ mode, sessionStatus, connected });
  // Stable nodes for the console slots (the console shell re-renders only when they change).
  const selector = useMemo(() => <MonitorModeSelector mode={mode} onModeChange={setMode} placement="column" />, [mode]);
  const chip = useMemo(() => <MonitorStatusChip status={status} />, [status]);
  const consoleHeader = mode === "digital" && hasDigitalConsole(host);

  if (mode === "real" && !realOpened) {
    setRealOpened(true);
  }

  let digital;

  if (!sessionId) {
    digital = <EmptyMonitorGuide />;
  } else if (host) {
    digital = <DigitalMonitor host={host} leftTop={selector} chip={chip} />;
  } else {
    digital = <p className={cx(styles.muted)} role="status">{MONITORING_PANEL_COPY.preparing}</p>;
  }

  return (
    <section className={cx(styles.panel)} aria-labelledby="workspace-monitoreo-title">
      <h2 id="workspace-monitoreo-title" className={cx(styles.visuallyHidden)}>{MONITORING_PANEL_COPY.title}</h2>
      {consoleHeader ? null : <MonitorHeader mode={mode} onModeChange={setMode} status={status} />}
      {/* The digital view stays mounted in real mode while a session runs (console state, pending edits, canvases). */}
      <div hidden={mode !== "digital"}>{digital}</div>
      {/* Same for the real view once opened (telemetry consumers exist only while CONNECTED). */}
      {realOpened ? <div hidden={mode !== "real"}><RealMonitorSlot connected={connected} /></div> : null}
      <SessionResultDialog sessionId={endedSessionId} onClose={clear} />
    </section>
  );
}
