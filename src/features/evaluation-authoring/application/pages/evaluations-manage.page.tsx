/*
* Funcionalidad: EvaluationsManagePage
* Descripción: Staff page /evaluations/manage (teachers and admins): lists the evaluations the caller can author from `GET /api/evaluations` with server filters and pagination: type, status (draft and ready by default, or one status, archived included), title search debounced 300 ms, sorted by last update, 10/25/50 per page (changing a filter returns to the first page). The module filter narrows only the loaded page on the client (the API has no module filter). "Nueva evaluación" links to /evaluations/manage/new. Row actions: Editar and Activaciones link to their routes, Duplicar (`POST .../duplicate`) shows a toast and opens the editor of the copy, Archivar asks for confirmation and sends `PATCH .../status` ARCHIVED. Mutations are single-flight and refresh every authoring key; failures (409 invalid_status_transition, 403, 422…) show the Spanish message of the authoring error map as a toast. Loading, error with retry, empty and no-match states. Depends on MUI, next/head, next/link, next/router, the design-system components, @shared/lib, the authoring hooks, entities, components and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AddIcon from "@mui/icons-material/Add";
import AssignmentIcon from "@mui/icons-material/Assignment";
import Button from "@mui/material/Button";
import TablePagination from "@mui/material/TablePagination";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { changeEvaluationStatus, duplicateEvaluation } from "../../api/services/evaluation-authoring.service";
import { EvaluationFilters } from "../components/evaluation-filters";
import { EvaluationsTable } from "../components/evaluations-table";
import { buildEvaluationEditUrl, NEW_EVALUATION_URL } from "../entities/authoring-urls";
import {
  EMPTY_EVALUATION_FILTERS,
  filterByModule,
  moduleOptions,
  toEvaluationListQuery,
} from "../entities/evaluation-authoring.entity";
import type { EvaluationListFilters, EvaluationListItem } from "../entities/evaluation-authoring.entity";
import { getAuthoringErrorMessage } from "../entities/evaluation-authoring-error-messages";
import { SEARCH_DEBOUNCE_MS, useAuthoringEvaluations, useDebouncedValue } from "../hooks/use-authoring-evaluations";
import { useAuthoringMutation } from "../hooks/use-authoring-mutation";
import styles from "../../UI/authoring.module.css";

// TODO(i18n): move to an evaluation-authoring namespace in src/i18n.
export const MANAGE_COPY = {
  documentTitle: "Gestionar evaluaciones | VentyLab",
  title: "Gestionar evaluaciones",
  subtitle: "Crea, edita, duplica y activa las evaluaciones de tus grupos.",
  create: "Nueva evaluación",
  loading: "Cargando evaluaciones…",
  loadErrorTitle: "No se pudieron cargar las evaluaciones",
  emptyTitle: "Aún no hay evaluaciones",
  emptyDescription: "Crea la primera evaluación para tus grupos.",
  noMatchTitle: "Ninguna evaluación coincide con los filtros",
  noMatchDescription: "Prueba con otro texto o cambia el tipo, el estado o el módulo.",
  clearFilters: "Limpiar filtros",
  rowsPerPage: "Filas por página:",
  duplicated: (title: string) => `Se creó una copia de «${title}».`,
  archiveTitle: "¿Archivar la evaluación?",
  archiveDescription: (title: string) =>
    `«${title}» dejará de aparecer en la lista y no se podrá activar de nuevo. Sus intentos y calificaciones se conservan.`,
  archiveConfirm: "Archivar",
  archiveCancel: "Cancelar",
  archived: (title: string) => `«${title}» se archivó.`,
} as const;

const PAGE_SIZES = [10, 25, 50];

const PAGE_BUTTON_LABELS: Record<"first" | "last" | "next" | "previous", string> = {
  first: "Primera página",
  last: "Última página",
  next: "Página siguiente",
  previous: "Página anterior",
};

function hasFilters(filters: EvaluationListFilters): boolean {
  return filters.search.trim() !== ""
    || filters.type !== EMPTY_EVALUATION_FILTERS.type
    || filters.status !== EMPTY_EVALUATION_FILTERS.status
    || filters.moduleId !== EMPTY_EVALUATION_FILTERS.moduleId;
}

function CreateAction() {
  return (
    <Button component={Link} href={NEW_EVALUATION_URL} variant="contained" startIcon={<AddIcon />}>
      {MANAGE_COPY.create}
    </Button>
  );
}

export function EvaluationsManagePage() {
  const router = useRouter();
  const toast = useToast();
  const [filters, setFilters] = useState<EvaluationListFilters>(EMPTY_EVALUATION_FILTERS);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0] ?? 10);
  const [archiveTarget, setArchiveTarget] = useState<EvaluationListItem | null>(null);
  const search = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS);
  const query = useMemo(
    () => toEvaluationListQuery({ search, type: filters.type, status: filters.status }, pageIndex, pageSize),
    [search, filters.type, filters.status, pageIndex, pageSize],
  );
  const { page, isLoading, error, reload } = useAuthoringEvaluations(query);
  const { pending, run } = useAuthoringMutation();
  const visible = useMemo(() => (page ? filterByModule(page.items, filters.moduleId) : []), [page, filters.moduleId]);
  const modules = useMemo(() => (page ? moduleOptions(page.items) : []), [page]);
  const filtered = hasFilters(filters);

  const changeFilters = (next: EvaluationListFilters) => {
    setFilters(next);
    setPageIndex(0);
  };

  const duplicate = async(evaluation: EvaluationListItem) => {
    const outcome = await run(() => duplicateEvaluation(evaluation.id));

    if (outcome.status === "success") {
      toast.success(MANAGE_COPY.duplicated(evaluation.title));
      void router.push(buildEvaluationEditUrl(outcome.value));
    } else if (outcome.status === "error") {
      toast.error(outcome.message);
    }
  };

  const archive = async() => {
    if (!archiveTarget) {
      return;
    }

    const target = archiveTarget;
    const outcome = await run(() => changeEvaluationStatus(target.id, "ARCHIVED"));

    if (outcome.status === "busy") {
      return;
    }

    setArchiveTarget(null);

    if (outcome.status === "success") {
      toast.success(MANAGE_COPY.archived(target.title));
    } else {
      toast.error(outcome.message);
    }
  };

  const renderList = () => {
    if (!page) {
      return null;
    }

    if (page.total === 0 && !filtered) {
      return (
        <EmptyState
          icon={<AssignmentIcon />}
          title={MANAGE_COPY.emptyTitle}
          description={MANAGE_COPY.emptyDescription}
          action={<CreateAction />}
        />
      );
    }

    return (
      <>
        <EvaluationFilters value={filters} modules={modules} onChange={changeFilters} />
        {visible.length === 0 ? (
          <EmptyState
            title={MANAGE_COPY.noMatchTitle}
            description={MANAGE_COPY.noMatchDescription}
            action={<Button onClick={() => changeFilters(EMPTY_EVALUATION_FILTERS)}>{MANAGE_COPY.clearFilters}</Button>}
          />
        ) : (
          <div className={cx(styles.results)}>
            <EvaluationsTable
              evaluations={visible}
              busy={pending}
              onDuplicate={(evaluation) => void duplicate(evaluation)}
              onArchive={setArchiveTarget}
            />
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
              labelRowsPerPage={MANAGE_COPY.rowsPerPage}
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
        <title>{MANAGE_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={MANAGE_COPY.title} subtitle={MANAGE_COPY.subtitle} actions={<CreateAction />} />
      <div className={cx(styles.content)}>
        {renderList()}
        {!page && isLoading ? <LoadingState label={MANAGE_COPY.loading} /> : null}
        {!page && !isLoading && error ? (
          <ErrorState
            title={MANAGE_COPY.loadErrorTitle}
            description={getAuthoringErrorMessage(error)}
            onRetry={() => void reload()}
          />
        ) : null}
      </div>
      <ConfirmDialog
        open={archiveTarget !== null}
        title={MANAGE_COPY.archiveTitle}
        description={archiveTarget ? MANAGE_COPY.archiveDescription(archiveTarget.title) : undefined}
        confirmLabel={MANAGE_COPY.archiveConfirm}
        cancelLabel={MANAGE_COPY.archiveCancel}
        destructive
        isPending={pending}
        onConfirm={() => void archive()}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
