/*
* Funcionalidad: AttemptsList
* Descripción: Left column of the "Revisar" tab of the unified grading screen: the July header "Total · Entregadas · Calificadas" (counts of the whole evaluation, ignoring the status filter), the filters (group and statuses), one row per attempt (student, attempt number, status, grade or score, lateness; aria-current on the selected one) that opens it in the review pane, a "Reiniciar intento" action on submitted, pending-review and graded attempts, and the pagination. Loading, error with retry, empty and no-match states. Depends on MUI, the design-system states, @shared/lib, the evaluation attempts and grading entities, the filters component and the grading CSS Module. v1.1 (ajustes C1): each graded row shows its release state ("Sin liberar", "Nota liberada", "Nota y respuestas liberadas").
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import TablePagination from "@mui/material/TablePagination";
import { ErrorState } from "@shared/design-system/components/error-state";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatGrade } from "@shared/lib/format";
import type { ApiError } from "@shared/api-client/api-error";
import { canResetAttempt, GRADING_ATTEMPT_STATUS_LABELS, summarizeCounts } from "../../entities/evaluation-attempts.entity";
import type { EvaluationAttemptRow, EvaluationAttemptsFilters, EvaluationAttemptsPage } from "../../entities/evaluation-attempts.entity";
import type { FilterOption } from "../../entities/grading.entity";
import { studentLabel } from "../../entities/grading.entity";
import { getGradingErrorMessage } from "../../entities/grading-error-messages";
import { RELEASE_STATE_LABELS, releaseStateOf } from "../../entities/results-release.entity";
import { AttemptsListFilters } from "./attempts-list-filters";
import styles from "../../../UI/grading.module.css";

// TODO(i18n): move to a grading namespace in src/i18n.
export const ATTEMPTS_LIST_COPY = {
  label: "Intentos de la evaluación",
  summary: (total: number, submitted: number, graded: number) => `Total ${total} · Entregadas ${submitted} · Calificadas ${graded}`,
  attempt: (number: number) => `Intento ${number}`,
  late: "Fuera de plazo",
  grade: (grade: string) => `Nota ${grade}`,
  score: (score: number, max: number) => `${score}/${max} pts`,
  open: (student: string, number: number) => `Revisar el intento ${number} de ${student}`,
  reset: "Reiniciar intento",
  resetFor: (student: string) => `Reiniciar intento de ${student}`,
  loading: "Cargando los intentos…",
  loadErrorTitle: "No se pudieron cargar los intentos",
  empty: "Todavía no hay intentos en esta evaluación.",
  noMatch: "No hay intentos con estos filtros.",
  rowsPerPage: "Filas:",
} as const;

export const ATTEMPTS_PAGE_SIZES = [10, 25, 50];

const PAGE_BUTTON_LABELS: Record<"first" | "last" | "next" | "previous", string> = {
  first: "Primera página",
  last: "Última página",
  next: "Página siguiente",
  previous: "Página anterior",
};

export type AttemptsListProps = {
  page: EvaluationAttemptsPage | null
  isLoading: boolean
  error: ApiError | null
  onRetry: () => void
  filters: EvaluationAttemptsFilters
  groups: readonly FilterOption[]
  onFiltersChange: (next: EvaluationAttemptsFilters) => void
  selectedAttemptId: string | null
  onSelect: (row: EvaluationAttemptRow) => void
  onReset: (row: EvaluationAttemptRow) => void
  pageIndex: number
  pageSize: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
};

// The release state matters once the attempt is graded (the server only releases GRADED attempts).
function rowRelease(row: EvaluationAttemptRow): string | null {
  const state = releaseStateOf(row);

  return row.status === "GRADED" || state !== "none" ? RELEASE_STATE_LABELS[state] : null;
}

function rowResult(row: EvaluationAttemptRow): string | null {
  if (row.grade !== null) {
    return ATTEMPTS_LIST_COPY.grade(formatGrade(row.grade));
  }

  return row.score !== null && row.maxScore !== null ? ATTEMPTS_LIST_COPY.score(row.score, row.maxScore) : null;
}

export function AttemptsList(props: AttemptsListProps) {
  const { page, isLoading, error, filters, selectedAttemptId } = props;

  const renderRows = () => {
    if (!page) {
      if (error && !isLoading) {
        return <ErrorState title={ATTEMPTS_LIST_COPY.loadErrorTitle} description={getGradingErrorMessage(error)} onRetry={props.onRetry} />;
      }

      return <ListSkeleton rows={4} label={ATTEMPTS_LIST_COPY.loading} />;
    }

    if (page.items.length === 0) {
      return <p className={cx(styles.subtitle)}>{page.counts.total === 0 ? ATTEMPTS_LIST_COPY.empty : ATTEMPTS_LIST_COPY.noMatch}</p>;
    }

    return (
      <>
        <ul className={cx(styles.attemptsList)} aria-label={ATTEMPTS_LIST_COPY.label}>
          {page.items.map((row) => {
            const student = studentLabel({ name: row.studentName, email: row.studentEmail });
            const selected = row.attemptId === selectedAttemptId;
            const result = rowResult(row);
            const release = rowRelease(row);

            return (
              <li key={row.attemptId} className={cx(styles.attemptRow, selected && styles.attemptRowSelected)}>
                <button
                  type="button"
                  className={cx(styles.attemptOpen)}
                  aria-current={selected ? "true" : undefined}
                  aria-label={ATTEMPTS_LIST_COPY.open(student, row.attemptNumber)}
                  onClick={() => props.onSelect(row)}
                >
                  <span className={cx(styles.attemptStudent)}>{student}</span>
                  <span className={cx(styles.attemptMeta)}>
                    {ATTEMPTS_LIST_COPY.attempt(row.attemptNumber)} · {GRADING_ATTEMPT_STATUS_LABELS[row.status]}
                    {result ? ` · ${result}` : ""}
                    {release ? ` · ${release}` : ""}
                    {row.isLate ? ` · ${ATTEMPTS_LIST_COPY.late}` : ""}
                  </span>
                </button>
                {canResetAttempt(row) ? (
                  <Button size="small" aria-label={ATTEMPTS_LIST_COPY.resetFor(student)} onClick={() => props.onReset(row)}>
                    {ATTEMPTS_LIST_COPY.reset}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
        <TablePagination
          component="div"
          count={page.total}
          page={Math.min(props.pageIndex, Math.max(0, page.pages - 1))}
          rowsPerPage={props.pageSize}
          rowsPerPageOptions={ATTEMPTS_PAGE_SIZES}
          onPageChange={(_event, next) => props.onPageChange(next)}
          onRowsPerPageChange={(event) => props.onPageSizeChange(Number(event.target.value))}
          labelRowsPerPage={ATTEMPTS_LIST_COPY.rowsPerPage}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          getItemAriaLabel={(type) => PAGE_BUTTON_LABELS[type]}
        />
      </>
    );
  };

  const summary = page ? summarizeCounts(page.counts) : null;

  return (
    <div className={cx(styles.attemptsColumn)}>
      {summary ? (
        <p className={cx(styles.attemptsSummary)} role="status">{ATTEMPTS_LIST_COPY.summary(summary.total, summary.submitted, summary.graded)}</p>
      ) : null}
      <AttemptsListFilters value={filters} groups={props.groups} onChange={props.onFiltersChange} />
      {renderRows()}
    </div>
  );
}
