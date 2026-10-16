/*
* Funcionalidad: CaseEditorTools
* Descripción: The T12 tools of the case editor, rendered in the editor `renderTools` slot under the section index:
*   the expert validation (a badge from the stored definition and, only for callers holding the contract permission
*   `clinical-cases:validate`, a "Marcar como validado" action with a confirmation that calls PATCH
*   /expert-validation; disabled while there are unsaved changes, because saving clears the validation; there is no
*   revert endpoint), the server test run of the stored case (dialog), the local preview of the current draft in the
*   simulation worker (dialog) and the delete with the 409 → archive alternative. A successful validation refreshes
*   the definition (the stored facts update); a deletion calls `onDeleted` so the host can leave the editor. Depends
*   on MUI, the design-system dialog and toast, @shared/lib, @shared/session, the case editor service, the tools
*   dialogs, the case mutation hook and the case tools CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import { useId, useState } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { useSession } from "@shared/session/use-session";
import type { ClinicalCaseDefinitionDTO } from "../../api/dtos/case-editor.dto";
import type { runClinicalCaseTest } from "../../api/services/case-editor.service";
import { validateClinicalCase } from "../../api/services/case-editor.service";
import type { CaseDraft } from "../entities/case-draft.entity";
import type { CasePreviewDeps } from "../hooks/use-case-preview";
import { useCaseMutation } from "../hooks/use-case-mutation";
import { CasePreviewDialog } from "./case-preview-dialog";
import { CaseTestRunDialog } from "./case-test-run";
import { DeleteCaseFlow } from "./delete-case-flow";
import type { DeleteCaseOutcome } from "./delete-case-flow";
import styles from "../../UI/case-tools.module.css";

/** Contract permission of PATCH /clinical-cases/{id}/expert-validation (minimum role TEACHER). */
export const VALIDATE_PERMISSION = "clinical-cases:validate";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const CASE_TOOLS_COPY = {
  title: "Herramientas",
  validation: "Validación por experto",
  validated: "Validado",
  notValidated: "Sin validar",
  markValidated: "Marcar como validado",
  validatedNote: "Guardar cambios en el caso borra la validación.",
  dirtyValidationNote: "Guarda los cambios antes de validar: se valida la versión guardada.",
  validateTitle: "¿Marcar el caso como validado?",
  validateDescription: (title: string) => `Quedarás registrado como experto que validó «${title}». Si después se guardan cambios, la validación se borra.`,
  validateConfirm: "Marcar como validado",
  validatedDone: "El caso quedó validado por experto.",
  cancel: "Cancelar",
  testRun: "Probar en el servidor",
  testRunHint: "Corre el caso guardado sin intervención y grafica su evolución.",
  preview: "Vista previa local",
  previewHint: "Corre el borrador en este navegador con la consola del estudiante.",
  remove: "Eliminar caso",
} as const;

export type CaseEditorToolsProps = {
  caseId: string
  definition: ClinicalCaseDefinitionDTO
  draft: CaseDraft
  dirty: boolean
  onDeleted: () => void
  testRunService?: typeof runClinicalCaseTest | undefined
  previewDeps?: CasePreviewDeps | undefined
};

type OpenTool = "testRun" | "preview" | "validate" | "delete" | null;

export function CaseEditorTools({ caseId, definition, draft, dirty, onDeleted, testRunService, previewDeps }: CaseEditorToolsProps) {
  const toast = useToast();
  const { hasPermission } = useSession();
  const { pending, run } = useCaseMutation();
  const [open, setOpen] = useState<OpenTool>(null);
  const titleId = useId();
  const validated = definition.validatedByExpert;
  const canValidate = hasPermission(VALIDATE_PERMISSION);
  const close = () => setOpen(null);

  const validate = async() => {
    const outcome = await run(() => validateClinicalCase(caseId));

    if (outcome.status === "busy") {
      return;
    }

    close();

    if (outcome.status === "success") {
      toast.success(CASE_TOOLS_COPY.validatedDone);
    } else {
      toast.error(outcome.message);
    }
  };

  const deleted = (outcome: DeleteCaseOutcome) => {
    if (outcome === "deleted") {
      onDeleted();
    }
  };

  return (
    <section className={cx(styles.tools)} aria-labelledby={titleId}>
      <h2 id={titleId} className={cx(styles.toolsTitle)}>{CASE_TOOLS_COPY.title}</h2>
      <div className={cx(styles.toolGroup)}>
        <div className={cx(styles.validationRow)}>
          <span>{CASE_TOOLS_COPY.validation}</span>
          <span className={cx(styles.badge)} data-validated={validated}>
            {validated ? CASE_TOOLS_COPY.validated : CASE_TOOLS_COPY.notValidated}
          </span>
        </div>
        {validated ? <p className={cx(styles.note)}>{CASE_TOOLS_COPY.validatedNote}</p> : null}
        {!validated && canValidate ? (
          <>
            <Button size="small" variant="outlined" disabled={dirty || pending} onClick={() => setOpen("validate")}>
              {CASE_TOOLS_COPY.markValidated}
            </Button>
            {dirty ? <p className={cx(styles.note)}>{CASE_TOOLS_COPY.dirtyValidationNote}</p> : null}
          </>
        ) : null}
      </div>
      <div className={cx(styles.toolGroup)}>
        <Button size="small" variant="outlined" onClick={() => setOpen("testRun")}>{CASE_TOOLS_COPY.testRun}</Button>
        <p className={cx(styles.note)}>{CASE_TOOLS_COPY.testRunHint}</p>
      </div>
      <div className={cx(styles.toolGroup)}>
        <Button size="small" variant="outlined" onClick={() => setOpen("preview")}>{CASE_TOOLS_COPY.preview}</Button>
        <p className={cx(styles.note)}>{CASE_TOOLS_COPY.previewHint}</p>
      </div>
      <div className={cx(styles.toolGroup)}>
        <Button size="small" color="error" disabled={pending} onClick={() => setOpen("delete")}>{CASE_TOOLS_COPY.remove}</Button>
      </div>
      <ConfirmDialog
        open={open === "validate"}
        title={CASE_TOOLS_COPY.validateTitle}
        description={CASE_TOOLS_COPY.validateDescription(definition.title)}
        confirmLabel={CASE_TOOLS_COPY.validateConfirm}
        cancelLabel={CASE_TOOLS_COPY.cancel}
        isPending={pending}
        onConfirm={() => void validate()}
        onCancel={close}
      />
      <CaseTestRunDialog
        open={open === "testRun"}
        caseId={caseId}
        caseTitle={definition.title}
        dirty={dirty}
        onClose={close}
        service={testRunService}
      />
      <CasePreviewDialog open={open === "preview"} caseId={caseId} draft={draft} onClose={close} deps={previewDeps} />
      <DeleteCaseFlow
        target={open === "delete" ? { id: caseId, title: definition.title } : null}
        onClose={close}
        onDone={deleted}
      />
    </section>
  );
}
