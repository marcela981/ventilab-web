/*
* Funcionalidad: Delete case flow
* Descripción: Confirmed deletion of a clinical case (T12), shared by the case list row and the editor tools. A
*   destructive confirmation sends DELETE /api/clinical-cases/{id}; when the backend refuses it with 409 because the
*   case is in use (simulation sessions, evaluation attempts or questions), a second dialog explains it and offers
*   "Archivar" instead (PATCH /status ARCHIVED, which keeps the sessions); cancelling there changes nothing. Any other
*   failure is a toast. Each outcome reports "deleted" or "archived" to the host and shows a success toast; the case
*   queries are refreshed by the mutation hook. Depends on the design-system dialogs and toast, the case editor
*   service, the case tools entity and the case mutation hook.
*   v1.1 (review of ffe9297): a case already ARCHIVED (status known to the host) is not offered "Archivar": a toast
*   says it is in use and already archived; a delete refreshes only the list (no 404 re-read of the definition in the
*   editor); the dialogs keep the last target text during their exit transition.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useState } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { useToast } from "@shared/design-system/components/use-toast";
import { CASES_PATH, changeClinicalCaseStatus, deleteClinicalCase } from "../../api/services/case-editor.service";
import type { CaseStatus } from "../config/case-editor.config";
import { isCaseInUseError } from "../entities/case-tools.entity";
import { useCaseMutation } from "../hooks/use-case-mutation";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const DELETE_CASE_COPY = {
  confirmTitle: "¿Eliminar el caso?",
  confirmDescription: (title: string) => `«${title}» se eliminará de forma permanente. Esta acción no se puede deshacer.`,
  confirm: "Eliminar",
  inUseTitle: "No se puede eliminar el caso",
  inUseDescription: (title: string) => `«${title}» está en uso por sesiones de simulación, intentos o preguntas de evaluación. Puedes archivarlo: dejará de estar disponible para los estudiantes y sus sesiones se conservan.`,
  archive: "Archivar",
  cancel: "Cancelar",
  deleted: (title: string) => `«${title}» se eliminó.`,
  archived: (title: string) => `«${title}» se archivó.`,
  inUseArchived: (title: string) => `«${title}» está en uso y no se puede eliminar; ya está archivado, así que los estudiantes no lo ven.`,
} as const;

/** `status`: the stored status when the host knows it (an ARCHIVED case in use is not offered "Archivar"). */
export type DeleteCaseTarget = { id: string, title: string, status?: CaseStatus | null | undefined };

export type DeleteCaseOutcome = "deleted" | "archived";

export type DeleteCaseFlowProps = {
  /** The case to delete; null closes the flow. */
  target: DeleteCaseTarget | null
  onClose: () => void
  onDone?: ((outcome: DeleteCaseOutcome, target: DeleteCaseTarget) => void) | undefined
};

export function DeleteCaseFlow({ target, onClose, onDone }: DeleteCaseFlowProps) {
  const toast = useToast();
  const { pending, run } = useCaseMutation();
  const [inUse, setInUse] = useState<DeleteCaseTarget | null>(null);
  // The last target stays readable while the dialog plays its exit transition (the host already cleared it).
  const [shown, setShown] = useState<DeleteCaseTarget | null>(target);
  const [shownInUse, setShownInUse] = useState<DeleteCaseTarget | null>(inUse);

  if (target !== null && (target.id !== shown?.id || target.title !== shown.title)) {
    setShown(target);
  }

  if (inUse !== null && inUse.id !== shownInUse?.id) {
    setShownInUse(inUse);
  }

  const close = () => {
    setInUse(null);
    onClose();
  };

  const remove = async() => {
    if (!target) {
      return;
    }

    // Only the list is refreshed: the editor must not re-read the definition of a case that no longer exists.
    const outcome = await run(() => deleteClinicalCase(target.id), [CASES_PATH]);

    if (outcome.status === "busy") {
      return;
    }

    if (outcome.status === "success") {
      toast.success(DELETE_CASE_COPY.deleted(target.title));
      close();
      onDone?.("deleted", target);
    } else if (isCaseInUseError(outcome.error) && target.status === "ARCHIVED") {
      // Archiving is the only way out, and it is already archived.
      toast.info(DELETE_CASE_COPY.inUseArchived(target.title));
      close();
    } else if (isCaseInUseError(outcome.error)) {
      setInUse(target);
    } else {
      toast.error(outcome.message);
      close();
    }
  };

  const archive = async() => {
    if (!inUse) {
      return;
    }

    const archived = inUse;
    const outcome = await run(() => changeClinicalCaseStatus(archived.id, "ARCHIVED"));

    if (outcome.status === "busy") {
      return;
    }

    close();

    if (outcome.status === "success") {
      toast.success(DELETE_CASE_COPY.archived(archived.title));
      onDone?.("archived", archived);
    } else {
      toast.error(outcome.message);
    }
  };

  return (
    <>
      <ConfirmDialog
        open={target !== null && inUse === null}
        title={DELETE_CASE_COPY.confirmTitle}
        description={shown ? DELETE_CASE_COPY.confirmDescription(shown.title) : undefined}
        confirmLabel={DELETE_CASE_COPY.confirm}
        cancelLabel={DELETE_CASE_COPY.cancel}
        destructive
        isPending={pending}
        onConfirm={() => void remove()}
        onCancel={close}
      />
      <ConfirmDialog
        open={inUse !== null}
        title={DELETE_CASE_COPY.inUseTitle}
        description={shownInUse ? DELETE_CASE_COPY.inUseDescription(shownInUse.title) : undefined}
        confirmLabel={DELETE_CASE_COPY.archive}
        cancelLabel={DELETE_CASE_COPY.cancel}
        isPending={pending}
        onConfirm={() => void archive()}
        onCancel={close}
      />
    </>
  );
}
