/*
* Funcionalidad: Delete case flow
* Descripción: Confirmed deletion of a clinical case (T12), shared by the case list row and the editor tools. A
*   destructive confirmation sends DELETE /api/clinical-cases/{id}; when the backend refuses it with 409 because the
*   case is in use (simulation sessions, evaluation attempts or questions), a second dialog explains it and offers
*   "Archivar" instead (PATCH /status ARCHIVED, which keeps the sessions); cancelling there changes nothing. Any other
*   failure is a toast. Each outcome reports "deleted" or "archived" to the host and shows a success toast; the case
*   queries are refreshed by the mutation hook. Depends on the design-system dialogs and toast, the case editor
*   service, the case tools entity and the case mutation hook.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useState } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { useToast } from "@shared/design-system/components/use-toast";
import { changeClinicalCaseStatus, deleteClinicalCase } from "../../api/services/case-editor.service";
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
} as const;

export type DeleteCaseTarget = { id: string, title: string };

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

  const close = () => {
    setInUse(null);
    onClose();
  };

  const remove = async() => {
    if (!target) {
      return;
    }

    const outcome = await run(() => deleteClinicalCase(target.id));

    if (outcome.status === "busy") {
      return;
    }

    if (outcome.status === "success") {
      toast.success(DELETE_CASE_COPY.deleted(target.title));
      close();
      onDone?.("deleted", target);
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
        description={target ? DELETE_CASE_COPY.confirmDescription(target.title) : undefined}
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
        description={inUse ? DELETE_CASE_COPY.inUseDescription(inUse.title) : undefined}
        confirmLabel={DELETE_CASE_COPY.archive}
        cancelLabel={DELETE_CASE_COPY.cancel}
        isPending={pending}
        onConfirm={() => void archive()}
        onCancel={close}
      />
    </>
  );
}
