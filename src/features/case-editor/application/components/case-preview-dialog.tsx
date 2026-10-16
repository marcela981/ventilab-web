/*
* Funcionalidad: Case local preview dialog
* Descripción: Local preview of the case draft (T12) in a full-width dialog: the shared ventilator console in live mode
*   with real waveforms, metrics, patient vitals and alarms from the vendored engine running in the simulation Web
*   Worker on the CURRENT draft (unsaved changes included), with no session and nothing sent to the server. The
*   console controls change the running preview only (never the draft). A status bar shows the simulated time and
*   Pausar / Reanudar / Reiniciar. When the draft cannot be simulated yet, the dialog lists what is missing (patient
*   sex and height, mechanics, initial ventilator settings, initial state) or asks to fix the draft errors first; a
*   worker failure or a browser without workers shows an error. The worker lives only while the dialog is open.
*   Depends on MUI, @shared/lib, @shared/ventilator-console, the case draft and case tools entities, the preview hook
*   and the case tools CSS Module. v1.1 (review of ffe9297): the dialog is described by its description paragraph.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useId, useMemo } from "react";
import { cx } from "@shared/lib/class-names";
import type { EngineCase } from "@shared/sim-engine";
import { VentilatorConsole } from "@shared/ventilator-console";
import { toUpsertCase } from "../entities/case-draft.entity";
import type { CaseDraft } from "../entities/case-draft.entity";
import { formatSimClock, previewEngineCase } from "../entities/case-tools.entity";
import type { PreviewBlock } from "../entities/case-tools.entity";
import { useCasePreview } from "../hooks/use-case-preview";
import type { CasePreviewDeps } from "../hooks/use-case-preview";
import styles from "../../UI/case-tools.module.css";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const CASE_PREVIEW_COPY = {
  title: "Vista previa local",
  description: "El motor corre en este navegador sobre el borrador actual (incluye los cambios sin guardar). No crea una sesión ni guarda nada; los cambios en el ventilador solo afectan esta vista previa.",
  draftErrors: (count: number) => (count === 1
    ? "El borrador tiene 1 error. Corrígelo para la vista previa (se marca al guardar)."
    : `El borrador tiene ${count} errores. Corrígelos para la vista previa (se marcan al guardar).`),
  missingTitle: "Para la vista previa falta completar:",
  time: (clock: string) => `Tiempo simulado: ${clock}`,
  starting: "Iniciando el motor…",
  pause: "Pausar",
  resume: "Reanudar",
  restart: "Reiniciar",
  close: "Cerrar",
} as const;

export const PREVIEW_BLOCK_LABELS: Readonly<Record<PreviewBlock, string>> = {
  patientSex: "Sexo del paciente",
  patientHeightCm: "Talla del paciente",
  mechanics: "Mecánica y fisiología",
  initialVentilatorSettings: "Ajustes iniciales del ventilador",
  initialState: "Gases iniciales (PaCO2 y PaO2)",
};

type PreviewSource =
  | { kind: "ready", engineCase: EngineCase }
  | { kind: "errors", count: number }
  | { kind: "missing", missing: readonly PreviewBlock[] };

/** What the preview can run for this draft: its engine case, or why not. */
export function previewSourceOf(caseId: string, draft: CaseDraft): PreviewSource {
  const mapping = toUpsertCase(draft);

  if (!mapping.body) {
    return { kind: "errors", count: Object.keys(mapping.errors).length };
  }

  const { engineCase, missing } = previewEngineCase(caseId, mapping.body);

  return engineCase ? { kind: "ready", engineCase } : { kind: "missing", missing };
}

function PreviewConsole({ engineCase, deps }: { engineCase: EngineCase, deps?: CasePreviewDeps | undefined }) {
  const preview = useCasePreview(engineCase, deps);
  const { adapter, status } = preview;

  return (
    <div className={cx(styles.dialogBody)}>
      <div className={cx(styles.previewBar)}>
        <span className={cx(styles.previewTime)}>
          {status === "starting" ? CASE_PREVIEW_COPY.starting : CASE_PREVIEW_COPY.time(formatSimClock(preview.simTimeMs))}
        </span>
        {status === "paused" ? (
          <Button size="small" onClick={preview.resume}>{CASE_PREVIEW_COPY.resume}</Button>
        ) : (
          <Button size="small" disabled={status !== "running"} onClick={preview.pause}>{CASE_PREVIEW_COPY.pause}</Button>
        )}
        <Button size="small" disabled={status === "unsupported"} onClick={preview.restart}>{CASE_PREVIEW_COPY.restart}</Button>
      </div>
      {preview.error ? <Alert severity="error">{preview.error}</Alert> : null}
      {preview.changeError ? <Alert severity="warning" onClose={preview.dismissChangeError}>{preview.changeError}</Alert> : null}
      {adapter && status !== "unsupported" ? (
        <div className={cx(styles.consoleFrame)}>
          <VentilatorConsole adapter={adapter} variant="live" {...(preview.applicability ? { applicability: preview.applicability } : {})} />
        </div>
      ) : null}
    </div>
  );
}

export type CasePreviewDialogProps = {
  open: boolean
  caseId: string
  draft: CaseDraft
  onClose: () => void
  deps?: CasePreviewDeps | undefined
};

export function CasePreviewDialog({ open, caseId, draft, onClose, deps }: CasePreviewDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  // The dialog is modal, so the draft (and the engine case, which restarts the worker when it changes) stays put while open.
  const source = useMemo(() => (open ? previewSourceOf(caseId, draft) : null), [caseId, draft, open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <DialogTitle id={titleId}>{CASE_PREVIEW_COPY.title}</DialogTitle>
      <DialogContent>
        <div className={cx(styles.dialogBody)}>
          <p className={cx(styles.note)} id={descriptionId}>{CASE_PREVIEW_COPY.description}</p>
          {source?.kind === "errors" ? <Alert severity="warning">{CASE_PREVIEW_COPY.draftErrors(source.count)}</Alert> : null}
          {source?.kind === "missing" ? (
            <Alert severity="warning">
              {CASE_PREVIEW_COPY.missingTitle}
              <ul className={cx(styles.missing)}>
                {source.missing.map((block) => <li key={block}>{PREVIEW_BLOCK_LABELS[block]}</li>)}
              </ul>
            </Alert>
          ) : null}
          {source?.kind === "ready" ? <PreviewConsole engineCase={source.engineCase} deps={deps} /> : null}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{CASE_PREVIEW_COPY.close}</Button>
      </DialogActions>
    </Dialog>
  );
}
