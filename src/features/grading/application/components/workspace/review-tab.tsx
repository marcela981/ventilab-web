/*
* Funcionalidad: ReviewTab
* Descripción: "Revisar" tab of the unified grading screen (DISENO_BLOQUE3 §2.8): every attempt of the evaluation on the left (AttemptsList over `GET /api/evaluation-grading/attempts`, filtered by `?group=` and `?status=`) and the review pane of the attempt in `?attempt=` on the right (AttemptReviewPane, remounted per attempt). Switching attempts with unsaved grades asks first (the pane reports its drafts); tabs and filters keep the pane mounted. The URL changes are shallow replaces. "Reiniciar intento" opens the ResetAttemptDialog and toasts the result. Depends on React, next/router, the design-system states and toast, the grading entities, hooks and workspace components and the grading CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import RateReviewIcon from "@mui/icons-material/RateReview";
import { useRouter } from "next/router";
import { useCallback, useMemo, useRef, useState } from "react";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { GRADE_COPY } from "../../entities/grade-attempt-copy";
import { formatStatusFilter, parseStatusFilter, toEvaluationAttemptsQuery } from "../../entities/evaluation-attempts.entity";
import type { EvaluationAttemptRow, EvaluationAttemptsFilters } from "../../entities/evaluation-attempts.entity";
import { assignmentGroups } from "../../entities/evaluation-results.entity";
import { studentLabel } from "../../entities/grading.entity";
import { useEvaluationAttempts } from "../../hooks/use-evaluation-attempts";
import { useEvaluationAssignments } from "../../hooks/use-evaluation-results";
import { AttemptReviewPane } from "./attempt-review-pane";
import { ATTEMPTS_PAGE_SIZES, AttemptsList } from "./attempts-list";
import { useGradingWorkspace } from "./grading-workspace-context";
import { ResetAttemptDialog } from "./reset-attempt-dialog";
import styles from "../../../UI/grading.module.css";

// TODO(i18n): move to a grading namespace in src/i18n.
export const REVIEW_TAB_COPY = {
  chooseAttempt: "Elige un intento de la lista para revisarlo.",
  resetDone: (student: string) => `${student} podrá presentar la evaluación otra vez.`,
} as const;

const queryText = (value: string | string[] | undefined): string => (typeof value === "string" ? value : "");

export function ReviewTab() {
  const { evaluationId } = useGradingWorkspace();
  const router = useRouter();
  const toast = useToast();
  const attemptId = queryText(router.query.attempt) || null;
  const groupId = queryText(router.query.group);
  const statusParam = queryText(router.query.status);
  const filters = useMemo<EvaluationAttemptsFilters>(() => ({ groupId, statuses: parseStatusFilter(statusParam) }), [groupId, statusParam]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(ATTEMPTS_PAGE_SIZES[0] ?? 10);
  const query = useMemo(() => toEvaluationAttemptsQuery(evaluationId, filters, pageIndex, pageSize), [evaluationId, filters, pageIndex, pageSize]);
  const attempts = useEvaluationAttempts(query);
  const assignments = useEvaluationAssignments(evaluationId);
  const groups = useMemo(() => assignmentGroups(assignments.data ?? []), [assignments.data]);
  const [resetRow, setResetRow] = useState<EvaluationAttemptRow | null>(null);
  // The pane reports its unsaved grades; switching attempts would drop them.
  const dirtyRef = useRef(false);

  const handleDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  const replaceQuery = (changes: Record<string, string | null>) => {
    const next: Record<string, string | string[] | undefined> = { ...router.query };

    for (const [key, value] of Object.entries(changes)) {
      if (value) {
        next[key] = value;
      } else {
        delete next[key];
      }
    }

    void router.replace({ pathname: router.pathname, query: next }, undefined, { shallow: true });
  };

  const select = (row: EvaluationAttemptRow) => {
    if (row.attemptId === attemptId) {
      return;
    }

    if (dirtyRef.current && !window.confirm(GRADE_COPY.unsavedPrompt)) {
      return;
    }

    dirtyRef.current = false;
    replaceQuery({ attempt: row.attemptId });
  };

  const changeFilters = (next: EvaluationAttemptsFilters) => {
    setPageIndex(0);
    replaceQuery({ group: next.groupId || null, status: formatStatusFilter(next.statuses) || null });
  };

  const selectedRow = attempts.page?.items.find((row) => row.attemptId === attemptId) ?? null;

  return (
    <div className={cx(styles.reviewLayout)}>
      <AttemptsList
        page={attempts.page}
        isLoading={attempts.isLoading}
        error={attempts.error}
        onRetry={() => void attempts.reload()}
        filters={filters}
        groups={groups}
        onFiltersChange={changeFilters}
        selectedAttemptId={attemptId}
        onSelect={select}
        onReset={setResetRow}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onPageChange={setPageIndex}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageIndex(0);
        }}
      />
      <div className={cx(styles.reviewPane)}>
        {attemptId ? (
          <AttemptReviewPane
            key={attemptId}
            attemptId={attemptId}
            studentLabel={selectedRow ? studentLabel({ name: selectedRow.studentName, email: selectedRow.studentEmail }) : null}
            onDirtyChange={handleDirtyChange}
          />
        ) : (
          <EmptyState icon={<RateReviewIcon />} title={REVIEW_TAB_COPY.chooseAttempt} />
        )}
      </div>
      {resetRow ? (
        <ResetAttemptDialog
          evaluationId={evaluationId}
          row={resetRow}
          onClose={() => setResetRow(null)}
          onDone={(row) => {
            setResetRow(null);
            toast.success(REVIEW_TAB_COPY.resetDone(studentLabel({ name: row.studentName, email: row.studentEmail })));
          }}
        />
      ) : null}
    </div>
  );
}
