/*
* Funcionalidad: Simulator AI assist launcher
* Descripción: "Asesoría IA" button of the running console session bar (T7). It resolves the assistance policy of the
*   session (FREE allowed; EXAM only with a known ALLOWED_WITH_PENALTY policy, otherwise disabled with the reason shown
*   next to the button) and toggles the collapsible assist side panel, which is loaded on demand (lazy-assist-panel)
*   so the AI pieces stay out of the console chunk. It keeps the answers of this session, so they stay listed when
*   the panel is closed and reopened. When the session stops being active (ending, ended) the panel closes, which
*   unmounts it and aborts a running stream. Depends on React, the assist entities, the lazy panel and the console
*   CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useId, useState } from "react";
import { cx } from "@shared/lib/class-names";
import type { SimulationMode } from "../config/simulator.config";
import { resolveAssistPolicy } from "../entities/sim-assist.entity";
import type { AssistancePolicyValue, AssistTurn } from "../entities/sim-assist.entity";
import { AssistPanel } from "./lazy-assist-panel";
import styles from "../../UI/session-console.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const ASSIST_LAUNCHER_COPY = {
  open: "Asesoría IA",
} as const;

export type AssistLauncherProps = {
  sessionId: string
  mode: SimulationMode
  /** Rubric assistance policy when the host knows it (e.g. the exam flow); null/undefined = unknown. */
  policy?: AssistancePolicyValue | null | undefined
  /** false while the session is starting, ending or ended: the panel closes and the button is disabled. */
  active: boolean
};

export function AssistLauncher({ sessionId, mode, policy: policyValue, active }: AssistLauncherProps) {
  const policy = resolveAssistPolicy(mode, policyValue);
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<AssistTurn[]>([]);
  const panelId = useId();
  const reasonId = useId();

  // The session stopped (ending or ended): close the panel, which aborts a running answer.
  if (!active && open) {
    setOpen(false);
  }

  const onAnswered = useCallback((turn: AssistTurn) => {
    setHistory((current) => (current.some((item) => item.aiHelpEventId === turn.aiHelpEventId) ? current : [...current, turn]));
  }, []);
  const onClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        className={cx(styles.timeButton)}
        aria-expanded={open}
        {...(open ? { "aria-controls": panelId } : {})}
        {...(policy.status === "disabled" ? { "aria-describedby": reasonId } : {})}
        disabled={policy.status === "disabled" || !active}
        onClick={() => setOpen((value) => !value)}
      >
        {ASSIST_LAUNCHER_COPY.open}
      </button>
      {policy.status === "disabled" ? <span id={reasonId} className={cx(styles.assistReason)}>{policy.reason}</span> : null}
      {open && policy.status !== "disabled" ? (
        <AssistPanel id={panelId} sessionId={sessionId} policy={policy} history={history} onAnswered={onAnswered} onClose={onClose} />
      ) : null}
    </>
  );
}
