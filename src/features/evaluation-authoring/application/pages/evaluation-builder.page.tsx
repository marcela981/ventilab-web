/*
* Funcionalidad: EvaluationBuilderPage
* Descripción: Staff page of the evaluation builder: /evaluations/manage/new (evaluationId null) and /evaluations/manage/[id]/edit. Header with "Volver a la lista", the "Cambios sin guardar"/"Todo guardado" indicator and the explicit "Guardar" ("Crear evaluación" while creating: the first save posts the evaluation and replaces the route with its editor). Below: the structure-locked banner with "Duplicar", the evaluation-level readiness issues after a 422, the metadata form and, once the evaluation exists, the scenarios and questions editor (BuilderStructure, loaded with React.lazy + retryImport so the drag-and-drop library stays in its own chunk) with delete confirmations. Leaving with unsaved changes asks for confirmation (route change and beforeunload). Loading and error-with-retry states for the edit route. Depends on React, MUI, next/head, next/link, the design-system components, @shared/lib, the builder hook, entities, components and CSS Module. v1.1 (A3): the header shows the evaluation status with "Marcar como lista (READY)" for a DRAFT (client READY validation first, issues on the cards, then `PATCH .../status`) and "Volver a borrador" for a READY evaluation; the evaluation-level issues come from the backend or from the client validation. v1.2 (A4): "Vista previa como estudiante" opens the StudentPreviewDialog (loaded on demand with React.lazy + retryImport) with the saved evaluation rendered by the student components.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Head from "next/head";
import Link from "next/link";
import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
import { EvaluationMetadataForm } from "../components/builder/evaluation-metadata-form";
import { StructureLockedBanner } from "../components/builder/structure-locked-banner";
import { EVALUATIONS_MANAGE_URL } from "../entities/authoring-urls";
import { EVALUATION_STATUS_LABELS } from "../entities/evaluation-authoring.entity";
import { BUILDER_COPY } from "../entities/builder-copy";
import { readinessIssueMessage } from "../entities/builder-question.entity";
import { getAuthoringErrorMessage } from "../entities/evaluation-authoring-error-messages";
import { useEvaluationBuilder } from "../hooks/use-evaluation-builder";
import styles from "../../UI/builder.module.css";

const BuilderStructure = lazy(() =>
  retryImport(() => import("../components/builder/builder-structure")).then((module) => ({ default: module.BuilderStructure })),
);

const StudentPreviewDialog = lazy(() =>
  retryImport(() => import("../components/preview/student-preview-dialog")).then((module) => ({ default: module.StudentPreviewDialog })),
);

export type EvaluationBuilderPageProps = {
  // null: a new evaluation (/evaluations/manage/new).
  evaluationId: string | null
};

type DeleteTarget = { kind: "question" | "scenario", id: string };

export function EvaluationBuilderPage({ evaluationId }: EvaluationBuilderPageProps) {
  const builder = useEvaluationBuilder(evaluationId);
  const { creating, evaluation, form, layout } = builder;
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const keyCounter = useRef(0);

  const newKey = useCallback(() => {
    keyCounter.current += 1;

    return `new-option-${keyCounter.current}`;
  }, []);

  const confirmDelete = async() => {
    if (!deleteTarget) {
      return;
    }

    const done = deleteTarget.kind === "question"
      ? await builder.deleteQuestion(deleteTarget.id)
      : await builder.deleteScenario(deleteTarget.id);

    if (done) {
      setDeleteTarget(null);
    }
  };

  const { generalIssues } = builder;
  const statusBusy = builder.pending || builder.saving;
  const documentTitle = creating ? BUILDER_COPY.newDocumentTitle : BUILDER_COPY.editDocumentTitle(evaluation?.title ?? "");

  const actions = (
    <div className={cx(styles.headerActions)}>
      <Button component={Link} href={EVALUATIONS_MANAGE_URL} startIcon={<ArrowBackIcon />}>
        {BUILDER_COPY.backToList}
      </Button>
      {form ? (
        <span className={cx(styles.saveState, builder.dirty && styles.saveStateDirty)} role="status">
          {builder.dirty ? BUILDER_COPY.unsaved : BUILDER_COPY.allSaved}
        </span>
      ) : null}
      {!creating && evaluation ? (
        <Button variant="outlined" startIcon={<VisibilityIcon />} onClick={() => setPreviewOpen(true)}>
          {BUILDER_COPY.preview}
        </Button>
      ) : null}
      <AsyncButton
        variant="contained"
        loading={builder.saving}
        disabled={!form || builder.pending || (!creating && !builder.dirty)}
        onClick={builder.save}
      >
        {creating ? BUILDER_COPY.create : BUILDER_COPY.save}
      </AsyncButton>
    </div>
  );

  const statusActions = evaluation && evaluation.canManage ? (
    <div className={cx(styles.headerActions)}>
      <span className={cx(styles.saveState)}>{BUILDER_COPY.statusLabel(EVALUATION_STATUS_LABELS[evaluation.status])}</span>
      {evaluation.status === "DRAFT" ? (
        <Button variant="outlined" disabled={statusBusy} onClick={() => void builder.markReady()}>{BUILDER_COPY.markReady}</Button>
      ) : null}
      {evaluation.status === "READY" ? (
        <Button variant="outlined" disabled={statusBusy || builder.locked} onClick={() => void builder.markDraft()}>{BUILDER_COPY.backToDraft}</Button>
      ) : null}
    </div>
  ) : null;

  const renderStructure = () => {
    if (creating) {
      return <p className={cx(styles.muted)}>{BUILDER_COPY.createFirst}</p>;
    }

    if (!layout) {
      return null;
    }

    return (
      <RouteErrorBoundary>
        <Suspense fallback={<ListSkeleton rows={3} label={BUILDER_COPY.loadingStructure} />}>
          <BuilderStructure
            builder={builder}
            layout={layout}
            newKey={newKey}
            onRequestDeleteQuestion={(id) => setDeleteTarget({ kind: "question", id })}
            onRequestDeleteScenario={(id) => setDeleteTarget({ kind: "scenario", id })}
          />
        </Suspense>
      </RouteErrorBoundary>
    );
  };

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{documentTitle}</title>
      </Head>
      <PageHeader
        title={creating ? BUILDER_COPY.newTitle : BUILDER_COPY.editTitle}
        subtitle={creating ? BUILDER_COPY.newSubtitle : BUILDER_COPY.editSubtitle}
        actions={actions}
      />
      {!creating && !evaluation && builder.isLoading ? <LoadingState label={BUILDER_COPY.loading} /> : null}
      {!creating && !evaluation && !builder.isLoading && builder.loadError ? (
        <ErrorState
          title={BUILDER_COPY.loadErrorTitle}
          description={getAuthoringErrorMessage(builder.loadError)}
          onRetry={() => void builder.reload()}
        />
      ) : null}
      {form ? (
        <div className={cx(styles.content)}>
          {statusActions}
          {builder.locked ? <StructureLockedBanner busy={builder.pending} onDuplicate={builder.duplicate} /> : null}
          {generalIssues.length > 0 ? (
            <Alert severity="warning">
              <ul className={cx(styles.issueList)}>
                {generalIssues.map((issue) => <li key={issue.code}>{readinessIssueMessage(issue)}</li>)}
              </ul>
            </Alert>
          ) : null}
          <EvaluationMetadataForm
            form={form}
            errors={builder.metadataErrors}
            creating={creating}
            editorKey={evaluation?.id ?? "new"}
            onChange={builder.updateForm}
            onTypeChange={builder.changeType}
          />
          <section className={cx(styles.panel)} aria-labelledby="builder-structure-title">
            <h2 id="builder-structure-title" className={cx(styles.panelTitle)}>{BUILDER_COPY.structureTitle}</h2>
            {renderStructure()}
          </section>
        </div>
      ) : null}
      {previewOpen && evaluation ? (
        <RouteErrorBoundary>
          <Suspense fallback={<LoadingState label={BUILDER_COPY.loadingPreview} />}>
            <StudentPreviewDialog evaluationId={evaluation.id} dirty={builder.dirty} onClose={() => setPreviewOpen(false)} />
          </Suspense>
        </RouteErrorBoundary>
      ) : null}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.kind === "scenario" ? BUILDER_COPY.deleteScenarioTitle : BUILDER_COPY.deleteQuestionTitle}
        description={deleteTarget?.kind === "scenario" ? BUILDER_COPY.deleteScenarioDescription : BUILDER_COPY.deleteQuestionDescription}
        confirmLabel={BUILDER_COPY.deleteConfirm}
        cancelLabel={BUILDER_COPY.cancel}
        destructive
        isPending={builder.pending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
