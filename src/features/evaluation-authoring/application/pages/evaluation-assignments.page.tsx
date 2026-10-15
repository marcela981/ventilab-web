/*
* Funcionalidad: EvaluationAssignmentsPage
* Descripción: Staff page /evaluations/manage/[evaluationId]/assignments. Header with the evaluation title and status, "Volver a la lista", "Editar evaluación" and "Activar"; "Activar" is enabled only for a READY evaluation the caller can manage, otherwise the reason is shown (the backend answers 409 evaluation.not_activatable). "Activar" opens the ActivateEvaluationDialog (groups and Bogota window) and sends `POST /api/evaluations/{id}/assignments`; its failures (403 permissions, 409 overlap/not activatable, 422 window or group) stay in the dialog in Spanish. Below, the activations from `GET /api/evaluations/{id}/assignments` with group, window, state and attempts; "Cerrar ahora" asks for confirmation and sends `POST .../assignments/{assignmentId}/close`, "Eliminar" (upcoming without attempts) asks for confirmation and sends `DELETE .../assignments/{assignmentId}`; results show as toasts. Mutations are single-flight and refresh the authoring keys. Loading, error with retry and empty states. Depends on MUI, next/head, next/link, the design-system components, @shared/lib, the authoring hooks, service, entities, components and the assignments CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { activateEvaluation, closeAssignment, deleteAssignment } from "../../api/services/evaluation-authoring.service";
import { ActivateEvaluationDialog } from "../components/assignments/activate-evaluation-dialog";
import { AssignmentsTable } from "../components/assignments/assignments-table";
import { ASSIGNMENTS_COPY } from "../entities/assignments-copy";
import { buildEvaluationEditUrl, EVALUATIONS_MANAGE_URL } from "../entities/authoring-urls";
import { EVALUATION_STATUS_LABELS } from "../entities/evaluation-authoring.entity";
import { getAssignmentErrorMessage } from "../entities/evaluation-authoring-error-messages";
import { canActivate } from "../entities/evaluation-assignment.entity";
import type { ActivationBody, EvaluationAssignment } from "../entities/evaluation-assignment.entity";
import { useAuthoringMutation } from "../hooks/use-authoring-mutation";
import { useEvaluationAssignments } from "../hooks/use-evaluation-assignments";
import { useEvaluationDetail } from "../hooks/use-evaluation-detail";
import styles from "../../UI/assignments.module.css";

export type EvaluationAssignmentsPageProps = {
  evaluationId: string
};

type PendingAction = { kind: "close" | "delete", assignment: EvaluationAssignment };

export function EvaluationAssignmentsPage({ evaluationId }: EvaluationAssignmentsPageProps) {
  const toast = useToast();
  const detail = useEvaluationDetail(evaluationId);
  const list = useEvaluationAssignments(evaluationId);
  const { pending, run } = useAuthoringMutation(getAssignmentErrorMessage);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<PendingAction | null>(null);

  const { evaluation } = detail;
  const canManage = evaluation?.canManage ?? false;
  const activatable = evaluation !== null && canManage && canActivate(evaluation.status);

  const activate = async(body: ActivationBody): Promise<string | null> => {
    const outcome = await run(() => activateEvaluation(evaluationId, body));

    if (outcome.status === "success") {
      setDialogOpen(false);
      toast.success(ASSIGNMENTS_COPY.activated(outcome.value.length));

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
    }
  };

  const actions = (
    <div className={cx(styles.headerActions)}>
      <Button component={Link} href={EVALUATIONS_MANAGE_URL} startIcon={<ArrowBackIcon />}>
        {ASSIGNMENTS_COPY.backToList}
      </Button>
      {evaluation && canManage ? (
        <Button component={Link} href={buildEvaluationEditUrl(evaluationId)} variant="outlined">
          {ASSIGNMENTS_COPY.edit}
        </Button>
      ) : null}
      <Button variant="contained" disabled={!activatable || pending} onClick={() => setDialogOpen(true)}>
        {ASSIGNMENTS_COPY.activate}
      </Button>
    </div>
  );

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
          canManage={canManage}
          disabled={pending}
          onClose={(assignment) => setAction({ kind: "close", assignment })}
          onDelete={(assignment) => setAction({ kind: "delete", assignment })}
        />
      </div>
    );
  };

  const renderNotice = () => {
    if (!evaluation) {
      return null;
    }

    if (!canManage) {
      return <Alert severity="info">{ASSIGNMENTS_COPY.notManageable}</Alert>;
    }

    return canActivate(evaluation.status) ? null : <Alert severity="info">{ASSIGNMENTS_COPY.notActivatable}</Alert>;
  };

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{ASSIGNMENTS_COPY.documentTitle(evaluation?.title ?? ASSIGNMENTS_COPY.title)}</title>
      </Head>
      <PageHeader
        title={ASSIGNMENTS_COPY.title}
        subtitle={evaluation ? ASSIGNMENTS_COPY.subtitle(evaluation.title) : ASSIGNMENTS_COPY.subtitleLoading}
        actions={actions}
      />
      {!evaluation && detail.isLoading ? <LoadingState label={ASSIGNMENTS_COPY.loading} /> : null}
      {!evaluation && !detail.isLoading && detail.error ? (
        <ErrorState
          title={ASSIGNMENTS_COPY.loadErrorTitle}
          description={getAssignmentErrorMessage(detail.error)}
          onRetry={() => void detail.reload()}
        />
      ) : null}
      {evaluation ? (
        <div className={cx(styles.content)}>
          <span className={cx(styles.statusText)}>{ASSIGNMENTS_COPY.status(EVALUATION_STATUS_LABELS[evaluation.status])}</span>
          {renderNotice()}
          {renderList()}
        </div>
      ) : null}
      {dialogOpen ? (
        <ActivateEvaluationDialog pending={pending} onSubmit={activate} onClose={() => setDialogOpen(false)} />
      ) : null}
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
    </div>
  );
}
