/*
* Funcionalidad: CaseListPage
* Descripción: Staff page /simulator/cases (teachers and admins): the clinical cases from GET /api/clinical-cases with
*   the server filters status, pathology and difficulty (a change returns to the first page), newest first,
*   paginated. Expert validation cannot be filtered or shown: the list summary has no validated flag and the editor
*   never fetches /definition per row (BACKEND GAP, stated in a note); the status column appears only while the list
*   is filtered by one status, since the summary has no status either. Row actions: Editar (editor route), Duplicar
*   (POST /duplicate, then the editor of the copy), Publicar and Archivar (PATCH /status, each confirmed). "Nuevo
*   caso" opens /simulator/cases/new. Loading, error with retry, empty and no-match states; failures show a toast.
*   Test-run, delete and expert validation arrive with T12. Depends on MUI, next/head, next/link, next/router, the
*   design-system components, @shared/lib, the case editor hooks, entities, config and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AddIcon from "@mui/icons-material/Add";
import BiotechIcon from "@mui/icons-material/Biotech";
import Button from "@mui/material/Button";
import TablePagination from "@mui/material/TablePagination";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { FormField } from "@shared/design-system/components/form-field";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { changeClinicalCaseStatus, duplicateClinicalCase } from "../../api/services/case-editor.service";
import {
  CASE_DIFFICULTIES,
  CASE_PATHOLOGIES,
  CASE_STATUSES,
  DIFFICULTY_LABELS,
  PATHOLOGY_LABELS,
  STATUS_LABELS,
} from "../config/case-editor.config";
import type { CaseDifficulty, CasePathology, CaseStatus } from "../config/case-editor.config";
import { buildCaseEditUrl, NEW_CASE_URL } from "../config/case-editor.routes";
import { getCaseEditorErrorMessage } from "../entities/case-editor-errors";
import { hasCaseListFilters, NO_CASE_LIST_FILTERS, STATUS_ACTION_TARGET, statusActionsFor } from "../entities/case-list.entity";
import type { CaseListFilters, CaseListRow, StatusAction } from "../entities/case-list.entity";
import { useCaseList } from "../hooks/use-case-list";
import { useCaseMutation } from "../hooks/use-case-mutation";
import styles from "../../UI/case-list.module.css";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const CASE_LIST_COPY = {
  documentTitle: "Casos clínicos | VentyLab",
  title: "Casos clínicos",
  subtitle: "Crea, edita, duplica y publica los casos del simulador.",
  create: "Nuevo caso",
  filtersLabel: "Filtros de casos clínicos",
  status: "Estado",
  pathology: "Patología",
  difficulty: "Dificultad",
  all: "Todos",
  allFeminine: "Todas",
  validationNote: "La validación por experto no se puede filtrar ni mostrar en la lista: el listado no informa ese dato. Se ve al abrir el caso.",
  statusNote: "Filtra por estado para ver el estado de cada caso.",
  loading: "Cargando casos clínicos…",
  loadErrorTitle: "No se pudieron cargar los casos clínicos",
  emptyTitle: "Aún no hay casos clínicos",
  emptyDescription: "Crea el primer caso para el simulador.",
  noMatchTitle: "Ningún caso coincide con los filtros",
  noMatchDescription: "Cambia el estado, la patología o la dificultad.",
  clearFilters: "Limpiar filtros",
  caseColumn: "Caso",
  pathologyColumn: "Patología",
  difficultyColumn: "Dificultad",
  statusColumn: "Estado",
  actionsColumn: "Acciones",
  edit: "Editar",
  duplicate: "Duplicar",
  publish: "Publicar",
  archive: "Archivar",
  actionsFor: (title: string) => `Acciones de ${title}`,
  duplicated: (title: string) => `Se creó una copia de «${title}».`,
  publishTitle: "¿Publicar el caso?",
  publishDescription: (title: string) => `«${title}» quedará visible para los estudiantes en el simulador.`,
  archiveTitle: "¿Archivar el caso?",
  archiveDescription: (title: string) => `«${title}» dejará de estar disponible para los estudiantes. Sus sesiones se conservan.`,
  cancel: "Cancelar",
  published: (title: string) => `«${title}» se publicó.`,
  archived: (title: string) => `«${title}» se archivó.`,
  rowsPerPage: "Filas por página:",
} as const;

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

const PAGE_BUTTON_LABELS: Record<"first" | "last" | "next" | "previous", string> = {
  first: "Primera página",
  last: "Última página",
  next: "Página siguiente",
  previous: "Página anterior",
};

const ACTION_COPY: Readonly<Record<StatusAction, { label: string, title: string, description: (title: string) => string, done: (title: string) => string }>> = {
  publish: { label: CASE_LIST_COPY.publish, title: CASE_LIST_COPY.publishTitle, description: CASE_LIST_COPY.publishDescription, done: CASE_LIST_COPY.published },
  archive: { label: CASE_LIST_COPY.archive, title: CASE_LIST_COPY.archiveTitle, description: CASE_LIST_COPY.archiveDescription, done: CASE_LIST_COPY.archived },
};

function labelOf(labels: Readonly<Record<string, string>>, value: string): string {
  return labels[value] ?? value;
}

function CreateAction() {
  return (
    <Button component={Link} href={NEW_CASE_URL} variant="contained" startIcon={<AddIcon />}>
      {CASE_LIST_COPY.create}
    </Button>
  );
}

type FiltersProps = { value: CaseListFilters, onChange: (next: CaseListFilters) => void };

function CaseListFiltersBar({ value, onChange }: FiltersProps) {
  return (
    <div className={cx(styles.filters)} role="group" aria-label={CASE_LIST_COPY.filtersLabel}>
      <FormField
        select
        label={CASE_LIST_COPY.status}
        value={value.status}
        onChange={(event) => onChange({ ...value, status: event.target.value as CaseStatus | "" })}
        slotProps={NATIVE_SELECT}
      >
        <option value="">{CASE_LIST_COPY.all}</option>
        {CASE_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
      </FormField>
      <FormField
        select
        label={CASE_LIST_COPY.pathology}
        value={value.pathology}
        onChange={(event) => onChange({ ...value, pathology: event.target.value as CasePathology | "" })}
        slotProps={NATIVE_SELECT}
      >
        <option value="">{CASE_LIST_COPY.allFeminine}</option>
        {CASE_PATHOLOGIES.map((pathology) => <option key={pathology} value={pathology}>{PATHOLOGY_LABELS[pathology]}</option>)}
      </FormField>
      <FormField
        select
        label={CASE_LIST_COPY.difficulty}
        value={value.difficulty}
        onChange={(event) => onChange({ ...value, difficulty: event.target.value as CaseDifficulty | "" })}
        slotProps={NATIVE_SELECT}
      >
        <option value="">{CASE_LIST_COPY.allFeminine}</option>
        {CASE_DIFFICULTIES.map((difficulty) => <option key={difficulty} value={difficulty}>{DIFFICULTY_LABELS[difficulty]}</option>)}
      </FormField>
    </div>
  );
}

type TableProps = {
  rows: readonly CaseListRow[]
  showStatus: boolean
  busy: boolean
  onDuplicate: (row: CaseListRow) => void
  onStatus: (row: CaseListRow, action: StatusAction) => void
};

function CasesTable({ rows, showStatus, busy, onDuplicate, onStatus }: TableProps) {
  return (
    <div className={cx(styles.tableContainer)}>
      <table className={cx(styles.table)}>
        <thead>
          <tr>
            <th scope="col">{CASE_LIST_COPY.caseColumn}</th>
            <th scope="col">{CASE_LIST_COPY.pathologyColumn}</th>
            <th scope="col">{CASE_LIST_COPY.difficultyColumn}</th>
            {showStatus ? <th scope="col">{CASE_LIST_COPY.statusColumn}</th> : null}
            <th scope="col">{CASE_LIST_COPY.actionsColumn}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">
                <span className={cx(styles.caseTitle)}>{row.title}</span>
                <span className={cx(styles.secondary)}>{row.mainDiagnosis}</span>
              </th>
              <td>{labelOf(PATHOLOGY_LABELS, row.pathology)}</td>
              <td>{labelOf(DIFFICULTY_LABELS, row.difficulty)}</td>
              {showStatus ? (
                <td>
                  {row.status ? <span className={cx(styles.statusBadge)} data-status={row.status}>{STATUS_LABELS[row.status]}</span> : "—"}
                </td>
              ) : null}
              <td>
                <div className={cx(styles.rowActions)} role="group" aria-label={CASE_LIST_COPY.actionsFor(row.title)}>
                  <Button size="small" component={Link} href={buildCaseEditUrl(row.id)}>{CASE_LIST_COPY.edit}</Button>
                  <Button size="small" disabled={busy} onClick={() => onDuplicate(row)}>{CASE_LIST_COPY.duplicate}</Button>
                  {statusActionsFor(row.status).map((action) => (
                    <Button key={action} size="small" disabled={busy} onClick={() => onStatus(row, action)}>
                      {ACTION_COPY[action].label}
                    </Button>
                  ))}
                  {/* T12 slot: test-run, expert validation and delete (409 → archive). */}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type PendingStatus = { row: CaseListRow, action: StatusAction };

export function CaseListPage() {
  const router = useRouter();
  const toast = useToast();
  const list = useCaseList();
  const { pending, run } = useCaseMutation();
  const [confirming, setConfirming] = useState<PendingStatus | null>(null);
  const { rows, pagination } = list;
  const filtered = hasCaseListFilters(list.filters);

  const duplicate = async(row: CaseListRow) => {
    const outcome = await run(() => duplicateClinicalCase(row.id));

    if (outcome.status === "success") {
      toast.success(CASE_LIST_COPY.duplicated(row.title));
      void router.push(buildCaseEditUrl(outcome.value));
    } else if (outcome.status === "error") {
      toast.error(outcome.message);
    }
  };

  const changeStatus = async() => {
    if (!confirming) {
      return;
    }

    const { row, action } = confirming;
    const outcome = await run(() => changeClinicalCaseStatus(row.id, STATUS_ACTION_TARGET[action]));

    if (outcome.status === "busy") {
      return;
    }

    setConfirming(null);

    if (outcome.status === "success") {
      toast.success(ACTION_COPY[action].done(row.title));
    } else {
      toast.error(outcome.message);
    }
  };

  const renderList = () => {
    if (!rows || !pagination) {
      return null;
    }

    if (pagination.total === 0 && !filtered) {
      return (
        <EmptyState
          icon={<BiotechIcon />}
          title={CASE_LIST_COPY.emptyTitle}
          description={CASE_LIST_COPY.emptyDescription}
          action={<CreateAction />}
        />
      );
    }

    return (
      <>
        {rows.length === 0 ? (
          <EmptyState
            title={CASE_LIST_COPY.noMatchTitle}
            description={CASE_LIST_COPY.noMatchDescription}
            action={<Button onClick={() => list.setFilters(NO_CASE_LIST_FILTERS)}>{CASE_LIST_COPY.clearFilters}</Button>}
          />
        ) : (
          <div className={cx(styles.results)}>
            <CasesTable
              rows={rows}
              showStatus={list.filters.status !== ""}
              busy={pending}
              onDuplicate={(row) => void duplicate(row)}
              onStatus={(row, action) => setConfirming({ row, action })}
            />
            <TablePagination
              component="div"
              count={pagination.total}
              page={Math.max(0, list.page - 1)}
              rowsPerPage={pagination.limit}
              rowsPerPageOptions={[pagination.limit]}
              onPageChange={(_event, next) => list.setPage(next + 1)}
              labelRowsPerPage={CASE_LIST_COPY.rowsPerPage}
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
              getItemAriaLabel={(type) => PAGE_BUTTON_LABELS[type]}
            />
          </div>
        )}
      </>
    );
  };

  const action = confirming ? ACTION_COPY[confirming.action] : null;

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{CASE_LIST_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={CASE_LIST_COPY.title} subtitle={CASE_LIST_COPY.subtitle} actions={<CreateAction />} />
      <div className={cx(styles.content)}>
        {/* Kept while a new filter loads, so the author can keep refining. */}
        {filtered || (pagination !== null && pagination.total > 0) ? (
          <>
            <CaseListFiltersBar value={list.filters} onChange={list.setFilters} />
            <p className={cx(styles.note)} role="note">{CASE_LIST_COPY.validationNote}</p>
            {list.filters.status === "" ? <p className={cx(styles.note)}>{CASE_LIST_COPY.statusNote}</p> : null}
          </>
        ) : null}
        {renderList()}
        {!rows && list.isLoading ? <LoadingState label={CASE_LIST_COPY.loading} /> : null}
        {!rows && !list.isLoading && list.error ? (
          <ErrorState
            title={CASE_LIST_COPY.loadErrorTitle}
            description={getCaseEditorErrorMessage(list.error)}
            onRetry={() => void list.reload()}
          />
        ) : null}
      </div>
      <ConfirmDialog
        open={confirming !== null}
        title={action?.title ?? ""}
        description={confirming && action ? action.description(confirming.row.title) : undefined}
        confirmLabel={action?.label ?? ""}
        cancelLabel={CASE_LIST_COPY.cancel}
        destructive={confirming?.action === "archive"}
        isPending={pending}
        onConfirm={() => void changeStatus()}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
