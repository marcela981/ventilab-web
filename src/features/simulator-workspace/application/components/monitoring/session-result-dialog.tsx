/*
* Funcionalidad: Session result dialog
* Descripción: Result of a digital session ended from the Monitoreo tab, shown in a dialog WITHOUT leaving /simulador
*   (W6, Bloque 1; DISENO_BLOQUE1 §3 "Finalizar → ResultDialog"). The result content of the simulator (server score,
*   objectives, breakdown, local evolution) is lazy loaded from its entry point; the dialog links to the replay
*   (/simulator/sessions/[id]/replay until W9 brings the replay into Mis sesiones) and closing it clears the session
*   (`onClose`). Depends on MUI Dialog, React.lazy, @shared/lib/retry-import, the design-system loading state, the
*   simulator result and session entry points and the monitoring styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Link from "next/link";
import { lazy, Suspense, useId } from "react";
import { buildSessionReplayUrl } from "@features/simulator/session.entry";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
import styles from "../../../UI/monitoring/monitoring-panel.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const RESULT_DIALOG_COPY = {
  title: "Resultado de la sesión",
  loading: "Cargando el resultado de la sesión…",
  viewReplay: "Ver repetición",
  close: "Cerrar",
} as const;

const SessionResultSummary = lazy(() =>
  retryImport(() => import("@features/simulator/result.entry")).then((module) => ({ default: module.SessionResultSummary })),
);

export type SessionResultDialogProps = {
  /** The ended session whose result is shown; null keeps the dialog closed. */
  sessionId: string | null
  onClose: () => void
};

export function SessionResultDialog({ sessionId, onClose }: SessionResultDialogProps) {
  const titleId = useId();

  return (
    <Dialog open={sessionId !== null} onClose={onClose} aria-labelledby={titleId} maxWidth="lg" fullWidth>
      <DialogTitle id={titleId}>{RESULT_DIALOG_COPY.title}</DialogTitle>
      <DialogContent dividers>
        {sessionId ? (
          <Suspense fallback={<LoadingState label={RESULT_DIALOG_COPY.loading} />}>
            <SessionResultSummary sessionId={sessionId} />
          </Suspense>
        ) : null}
      </DialogContent>
      <DialogActions className={cx(styles.dialogActions)}>
        {sessionId ? (
          <Link href={buildSessionReplayUrl(sessionId)} className={cx(styles.link)}>{RESULT_DIALOG_COPY.viewReplay}</Link>
        ) : null}
        <button type="button" className={cx(styles.primaryButton)} onClick={onClose}>{RESULT_DIALOG_COPY.close}</button>
      </DialogActions>
    </Dialog>
  );
}
