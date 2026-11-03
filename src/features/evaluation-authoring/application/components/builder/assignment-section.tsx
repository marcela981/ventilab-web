/*
* Funcionalidad: AssignmentSection
* Descripción: "Asignación a grupos" section of the evaluation builder (DISENO_BLOQUE3 §2.7; it replaces the page /evaluations/manage/[evaluationId]/assignments, now a redirect to `?section=asignacion`). Lists the assignments of the evaluation (`GET /api/evaluations/{id}/assignments`, AssignmentsTable: group, Bogota window, state, attempts; "Cerrar ahora" and "Eliminar" after confirmation, with a reload when the row turned out stale) and, for staff and a READY evaluation, the inline "Nueva asignación" form (ActivateEvaluationForm: groups and window in America/Bogota, `POST .../assignments`, all or nothing). While the evaluation is not READY it says "Marca la evaluación como lista para asignarla." (the backend only assigns READY evaluations). With `focusOnMount` (the builder opened with `?section=asignacion`) it scrolls to its heading and focuses it. Depends on React, MUI, the design-system states and toast, the session, the authoring services, hooks, entities and components and the assignments CSS Module.
* Versión: 2.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { useSession } from "@shared/session/use-session";
import { activateEvaluation, closeAssignment, deleteAssignment } from "../../../api/services/evaluation-authoring.service";
import { ASSIGNMENTS_COPY } from "../../entities/assignments-copy";
import { canActivate } from "../../entities/evaluation-assignment.entity";
import type { ActivationBody, EvaluationAssignment } from "../../entities/evaluation-assignment.entity";
import type { EvaluationStatus } from "../../entities/evaluation-authoring.entity";
import { getAssignmentErrorMessage } from "../../entities/evaluation-authoring-error-messages";
import { useAuthoringMutation } from "../../hooks/use-authoring-mutation";
import { useEvaluationAssignments } from "../../hooks/use-evaluation-assignments";
import { ActivateEvaluationForm } from "../assignments/activate-evaluation-form";
import { AssignmentsTable } from "../assignments/assignments-table";
import styles from "../../../UI/assignments.module.css";

export const ASSIGNMENT_SECTION_ID = "asignacion";

export type AssignmentSectionProps = {
  evaluationId: string
  status: EvaluationStatus
  // The builder was opened with ?section=asignacion: scroll to the section and focus its heading.
  focusOnMount?: boolean | undefined
  now?: Date | undefined
};

type PendingAction = { kind: "close" | "delete", assignment: EvaluationAssignment };

export function AssignmentSection({ evaluationId, status, focusOnMount = false, now }: AssignmentSectionProps) {
  const toast = useToast();
  const { hasRole } = useSession();
  const list = useEvaluationAssignments(evaluationId);
  const { pending, run } = useAuthoringMutation(getAssignmentErrorMessage);
  const [action, setAction] = useState<PendingAction | null>(null);
  const [formKey, setFormKey] = useState(0);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const isStaff = hasRole("TEACHER", "ADMIN");
  const assignable = isStaff && canActivate(status);

  useEffect(() => {
    if (focusOnMount && headingRef.current) {
      headingRef.current.scrollIntoView?.({ block: "start" });
      headingRef.current.focus();
    }
  }, [focusOnMount]);

  const assign = async(body: ActivationBody): Promise<string | null> => {
    const outcome = await run(() => activateEvaluation(evaluationId, body));

    if (outcome.status === "success") {
      toast.success(ASSIGNMENTS_COPY.activated(outcome.value.length));
      setFormKey((key) => key + 1);

      return null;
    }

    return outcome.status === "error" ? outcome.message : null;
  };

  const confirmAction = async() => {
    if (!action) {
      return;
    }

    const { assignment, kind } = action;
    const outcome = await run(() => (kind === "close"
      ? closeAssignment(evaluationId, assignment.id)
      : deleteAssignment(evaluationId, assignment.id)));

    if (outcome.status === "success") {
      setAction(null);
      toast.success(kind === "close" ? ASSIGNMENTS_COPY.closed(assignment.groupName) : ASSIGNMENTS_COPY.deleted(assignment.groupName));
    } else if (outcome.status === "error") {
      setAction(null);
      toast.error(outcome.message);
      // The row may be stale (assignment_not_found, assignment_closed, assignment_has_attempts).
      void list.reload();
    }
  };

  const renderList = () => {
    if (list.assignments === null) {
      if (list.error && !list.isLoading) {
        return (
          <ErrorState
            title={ASSIGNMENTS_COPY.listErrorTitle}
            description={getAssignmentErrorMessage(list.error)}
            onRetry={() => void list.reload()}
          />
        );
      }

      return <ListSkeleton rows={3} label={ASSIGNMENTS_COPY.listLoading} />;
    }

    if (list.assignments.length === 0) {
      return <EmptyState title={ASSIGNMENTS_COPY.emptyTitle} description={ASSIGNMENTS_COPY.emptyDescription} />;
    }

    return (
      <div className={cx(styles.results)}>
        <AssignmentsTable
          assignments={list.assignments}
          disabled={pending}
          onClose={(assignment) => setAction({ kind: "close", assignment })}
          onDelete={(assignment) => setAction({ kind: "delete", assignment })}
        />
      </div>
    );
  };

  const renderNotice = () => {
    if (!isStaff) {
      return <Alert severity="info">{ASSIGNMENTS_COPY.notStaff}</Alert>;
    }

    return canActivate(status) ? null : <Alert severity="info">{ASSIGNMENTS_COPY.notActivatable}</Alert>;
  };

  return (
    <section id={ASSIGNMENT_SECTION_ID} className={cx(styles.section)} aria-labelledby="builder-assignment-title">
      <h2 id="builder-assignment-title" ref={headingRef} tabIndex={-1} className={cx(styles.sectionTitle)}>
        {ASSIGNMENTS_COPY.title}
      </h2>
      <p className={cx(styles.muted)}>{ASSIGNMENTS_COPY.subtitle}</p>
      {renderNotice()}
      {renderList()}
      {assignable ? <ActivateEvaluationForm key={formKey} pending={pending} onSubmit={assign} now={now} /> : null}
      <ConfirmDialog
        open={action !== null}
        title={action?.kind === "delete" ? ASSIGNMENTS_COPY.deleteTitle : ASSIGNMENTS_COPY.closeTitle}
        description={action
          ? (action.kind === "delete"
            ? ASSIGNMENTS_COPY.deleteDescription(action.assignment.groupName)
            : ASSIGNMENTS_COPY.closeDescription(action.assignment.groupName))
          : undefined}
        confirmLabel={action?.kind === "delete" ? ASSIGNMENTS_COPY.deleteConfirm : ASSIGNMENTS_COPY.closeConfirm}
        cancelLabel={ASSIGNMENTS_COPY.cancel}
        destructive
        isPending={pending}
        onConfirm={() => void confirmAction()}
        onCancel={() => setAction(null)}
      />
    </section>
  );
}
