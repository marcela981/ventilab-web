/*
* Funcionalidad: Simulator AI assist launcher
* Descripción: "Asesoría IA" button of the running console session bar (T7). It resolves the assistance policy of the
*   session (FREE allowed; EXAM only with a known ALLOWED_WITH_PENALTY policy, otherwise disabled with the reason shown
*   next to the button) and toggles the collapsible assist side panel, which is loaded on demand (lazy-assist-panel)
*   so the AI pieces stay out of the console chunk. It keeps the answers of this session, so they stay listed when
*   the panel is closed and reopened. When the session stops being active (ending, ended) the panel closes, which
*   unmounts it and aborts a running stream. Depends on React, the assist entities, the lazy panel and the console
*   CSS Module. v1.1 (review of bc8a596): the host may keep the answers (`history` + `onAnswered`), so they survive a
*   console resync; without them the launcher keeps them as before.
*   v2.0 (Bloque 5, C6): July layout (D25). The launcher sits next to the mode toggle of the console ("assistSlot"):
*   a round icon button (Psychology) named "Asesoría IA"; a disabled policy keeps its reason as the button
*   description and tooltip. The panel is one of the console drawers (380 px, non-modal, exclusive with "Alertas
*   detalladas" and "Caso clínico"); closing it (button or Escape) returns the focus to the launcher.
* Versión: 2.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import PsychologyIcon from "@mui/icons-material/Psychology";
import { useCallback, useEffect, useId, useState } from "react";
import { cx } from "@shared/lib/class-names";
import { useConsoleDrawer } from "@shared/ventilator-console";
import type { SimulationMode } from "../config/simulator.config";
import { resolveAssistPolicy } from "../entities/sim-assist.entity";
import type { AssistancePolicyValue, AssistTurn } from "../entities/sim-assist.entity";
import { AssistPanel } from "./lazy-assist-panel";
import styles from "../../UI/session-console.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const ASSIST_LAUNCHER_COPY = {
  open: "Asesoría IA",
} as const;

/** Key of the assist drawer among the console drawers. */
const ASSIST_DRAWER_KEY = "assist";

export type AssistLauncherProps = {
  sessionId: string
  mode: SimulationMode
  /** Rubric assistance policy when the host knows it (e.g. the exam flow); null/undefined = unknown. */
  policy?: AssistancePolicyValue | null | undefined
  /** false while the session is starting, ending or ended: the panel closes and the button is disabled. */
  active: boolean
  /** Answers kept by the host (e.g. above a console that remounts on a resync); omitted: kept by the launcher. */
  history?: readonly AssistTurn[] | undefined
  onAnswered?: ((turn: AssistTurn) => void) | undefined
};

export function AssistLauncher({ sessionId, mode, policy: policyValue, active, history: hostHistory, onAnswered: hostOnAnswered }: AssistLauncherProps) {
  const policy = resolveAssistPolicy(mode, policyValue);
  const { open, setOpen, toggle, close, triggerRef } = useConsoleDrawer(ASSIST_DRAWER_KEY);
  const [ownHistory, setOwnHistory] = useState<AssistTurn[]>([]);
  const panelId = useId();
  const reasonId = useId();
  const controlled = hostHistory !== undefined && hostOnAnswered !== undefined;
  const history = controlled ? hostHistory : ownHistory;
  const disabled = policy.status === "disabled";

  // The session stopped (ending or ended): close the panel, which aborts a running answer.
  useEffect(() => {
    if (!active && open) {
      setOpen(false);
    }
  }, [active, open, setOpen]);

  const onOwnAnswered = useCallback((turn: AssistTurn) => {
    setOwnHistory((current) => (current.some((item) => item.aiHelpEventId === turn.aiHelpEventId) ? current : [...current, turn]));
  }, []);
  const onAnswered = controlled ? hostOnAnswered : onOwnAnswered;
  const onClose = useCallback(() => close(), [close]);

  return (
    <span className={cx(styles.assistSlot)} title={disabled ? policy.reason : ASSIST_LAUNCHER_COPY.open}>
      <button
        ref={triggerRef}
        type="button"
        className={cx(styles.assistButton)}
        aria-label={ASSIST_LAUNCHER_COPY.open}
        aria-expanded={open}
        {...(open ? { "aria-controls": panelId } : {})}
        {...(disabled ? { "aria-describedby": reasonId } : {})}
        disabled={disabled || !active}
        onClick={toggle}
      >
        <PsychologyIcon aria-hidden="true" />
      </button>
      {disabled ? <span id={reasonId} className={cx(styles.visuallyHidden)}>{policy.reason}</span> : null}
      {open && active && !disabled ? (
        <AssistPanel id={panelId} sessionId={sessionId} policy={policy} history={history} onAnswered={onAnswered} onClose={onClose} />
      ) : null}
    </span>
  );
}
