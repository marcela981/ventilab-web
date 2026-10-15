/*
* Funcionalidad: GradingQueuePage
* Descripción: Staff page /grading (teachers and admins): the queue of attempts waiting for review from `GET /api/evaluation-grading/queue`, filtered on the server by evaluation (READY evaluations plus those already in the loaded page) and student group, always oldest first (the backend has no sort option), 10/25/50 per page (changing a filter returns to the first page). Each row shows the student, the evaluation and its type, the attempt number, the submission date in Bogota time with its age and the automatic score so far, and links to /grading/attempts/[attemptId]. Revalidates on window focus. Loading, error with retry and empty ("No hay intentos pendientes de calificación") states; when the requested page comes back empty beyond the last page the list steps back to the last available page. Depends on MUI, next/head, the design-system components, @shared/lib, the grading hooks, entities, components and CSS Module. v1.1 (G1 review W1/S7): no sort toggle (the backend ignores sortOrder; reported gap); when a refresh fails while a page is already shown, an inline warning with the Spanish error and a retry stays above the (possibly stale) list.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import GradingIcon from "@mui/icons-material/Grading";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TablePagination from "@mui/material/TablePagination";
import Head from "next/head";
import { useMemo, useState } from "react";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { cx } from "@shared/lib/class-names";
import { GradingQueueFilters } from "../components/grading-queue-filters";
import { GradingQueueTable } from "../components/grading-queue-table";
import { DEFAULT_GRADING_FILTERS, mergeEvaluationOptions, toGradingQueueQuery } from "../entities/grading.entity";
import type { GradingQueueFilters as Filters } from "../entities/grading.entity";
import { getGradingErrorMessage } from "../entities/grading-error-messages";
import { useGradingFilterOptions } from "../hooks/use-grading-filter-options";
import { useGradingQueue } from "../hooks/use-grading-queue";
import styles from "../../UI/grading.module.css";

// TODO(i18n): move to a grading namespace in src/i18n.
export const QUEUE_COPY = {
  documentTitle: "Calificar | VentyLab",
  title: "Calificar",
  subtitle: "Intentos enviados que esperan tu revisión, empezando por los más antiguos.",
  loading: "Cargando intentos pendientes…",
  loadErrorTitle: "No se pudo cargar la cola de calificación",
  emptyTitle: "No hay intentos pendientes de calificación",
  emptyDescription: "Cuando un estudiante envíe una evaluación con preguntas abiertas o prácticas, aparecerá aquí.",
  noMatchTitle: "No hay intentos pendientes con estos filtros",
  noMatchDescription: "Prueba con otra evaluación u otro grupo.",
  clearFilters: "Limpiar filtros",
  rowsPerPage: "Filas por página:",
  staleWarning: "No se pudo actualizar la cola. Los datos mostrados pueden estar desactualizados.",
  retry: "Reintentar",
} as const;

const PAGE_SIZES = [10, 25, 50];

const PAGE_BUTTON_LABELS: Record<"first" | "last" | "next" | "previous", string> = {
  first: "Primera página",
  last: "Última página",
  next: "Página siguiente",
  previous: "Página anterior",
};

function hasFilters(filters: Filters): boolean {
  return filters.evaluationId !== DEFAULT_GRADING_FILTERS.evaluationId
    || filters.groupId !== DEFAULT_GRADING_FILTERS.groupId;
}

export type GradingQueuePageProps = {
  // Reference instant of the "hace 3 días" ages; tests pin it.
  now?: Date | undefined
};

export function GradingQueuePage({ now }: GradingQueuePageProps = {}) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_GRADING_FILTERS);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0] ?? 10);
  const query = useMemo(() => toGradingQueueQuery(filters, pageIndex, pageSize), [filters, pageIndex, pageSize]);
  const { page, isLoading, error, reload } = useGradingQueue(query);
  const options = useGradingFilterOptions();
  const evaluationOptions = useMemo(
    () => mergeEvaluationOptions(options.evaluations, page?.items ?? []),
    [options.evaluations, page],
  );
  const filtered = hasFilters(filters);
  // The server answered the requested page with no rows: it is beyond the last page (attempts were graded meanwhile).
  const outOfRange = page !== null && page.page === pageIndex + 1 && pageIndex > 0 && page.items.length === 0;

  if (outOfRange) {
    // Adjusting state while rendering (React's documented pattern): the next query asks for the last available page.
    setPageIndex(Math.max(0, Math.min(pageIndex - 1, page.pages - 1)));
  }

  const changeFilters = (next: Filters) => {
    setFilters(next);
    setPageIndex(0);
  };

  const renderList = () => {
    if (!page || outOfRange) {
      return null;
    }

    if (page.total === 0 && !filtered) {
      return (
        <EmptyState icon={<GradingIcon />} title={QUEUE_COPY.emptyTitle} description={QUEUE_COPY.emptyDescription} />
      );
    }

    return (
      <>
        <GradingQueueFilters
          value={filters}
          evaluations={evaluationOptions}
          groups={options.groups}
          onChange={changeFilters}
        />
        {page.items.length === 0 ? (
          <EmptyState
            title={QUEUE_COPY.noMatchTitle}
            description={QUEUE_COPY.noMatchDescription}
            action={(
              <Button onClick={() => changeFilters(DEFAULT_GRADING_FILTERS)}>
                {QUEUE_COPY.clearFilters}
              </Button>
            )}
          />
        ) : (
          <div className={cx(styles.results)}>
            <GradingQueueTable items={page.items} now={now} />
            <TablePagination
              component="div"
              count={page.total}
              page={Math.min(pageIndex, Math.max(0, page.pages - 1))}
              rowsPerPage={pageSize}
              rowsPerPageOptions={PAGE_SIZES}
              onPageChange={(_event, next) => setPageIndex(next)}
              onRowsPerPageChange={(event) => {
                setPageSize(Number(event.target.value));
                setPageIndex(0);
              }}
              labelRowsPerPage={QUEUE_COPY.rowsPerPage}
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
              getItemAriaLabel={(type) => PAGE_BUTTON_LABELS[type]}
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{QUEUE_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={QUEUE_COPY.title} subtitle={QUEUE_COPY.subtitle} />
      <div className={cx(styles.content)}>
        {page && error ? (
          <Alert
            severity="warning"
            action={<Button color="inherit" size="small" onClick={() => void reload()}>{QUEUE_COPY.retry}</Button>}
          >
            {QUEUE_COPY.staleWarning} {getGradingErrorMessage(error)}
          </Alert>
        ) : null}
        {renderList()}
        {!page && isLoading ? <LoadingState label={QUEUE_COPY.loading} /> : null}
        {!page && !isLoading && error ? (
          <ErrorState
            title={QUEUE_COPY.loadErrorTitle}
            description={getGradingErrorMessage(error)}
            onRetry={() => void reload()}
          />
        ) : null}
      </div>
    </div>
  );
}
