/*
* Funcionalidad: Monitoring panel
* Descripción: Monitoreo tab of the /simulador workspace. v0.1 (W5): a minimal panel that reads the workspace session
*   (whether a session is open and its phase) so the shell can prove the tab is mounted once and the session keeps
*   running across tab switches; W6 brings the digital monitor (console, session bar, case panel, result dialog).
*   Depends on the workspace session and the workspace styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { useWorkspaceSession } from "../workspace-session-provider";
import styles from "../../../UI/simulator-workspace.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const MONITORING_PANEL_COPY = {
  title: "Monitoreo",
  empty: "Configura o inicia un paciente en la pestaña \"Simular Paciente\" para ver las curvas en tiempo real.",
  running: "Sesión de simulación en curso.",
  preparing: "Preparando la sesión de simulación…",
} as const;

export function MonitoringPanel() {
  const { sessionId, host } = useWorkspaceSession();
  let body: string;

  if (!sessionId) {
    body = MONITORING_PANEL_COPY.empty;
  } else if (host?.phase === "ready") {
    body = MONITORING_PANEL_COPY.running;
  } else {
    body = MONITORING_PANEL_COPY.preparing;
  }

  return (
    <section className={cx(styles.temporaryPanel)} aria-labelledby="workspace-monitoreo-title">
      <h2 id="workspace-monitoreo-title" className={cx(styles.panelTitle)}>{MONITORING_PANEL_COPY.title}</h2>
      <p className={cx(styles.muted)} role="status">{body}</p>
    </section>
  );
}
