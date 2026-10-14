/*
* Funcionalidad: GroupsPage
* Descripción: Staff page /groups (teachers and admins): reads `GET /api/groups` (the backend decides the scope: every group for an admin, the managed, supervised and own teacher groups for a teacher) and shows them in a table with client-side filters (text, type, active state) and client-side pagination (10, 25 or 50 per page), because the endpoint has neither (decision 7, backend gap). Changing a filter returns to the first page. Empty states for no groups and for no match (with "Limpiar filtros"), a loading state and an error state with retry (403 included). v1.1 (T11b): "Crear grupo" (teachers and admins, the route is staff-only) opens GroupFormDialog for a STUDENT group (teacher groups are created by admins in slice C); `POST /api/groups` through useGroupMutation, which refreshes every groups key; server errors (403 type_creation_forbidden included) show inline in the dialog and a success shows a toast. Group names link to the detail. v1.2 (T11c): admins choose the type (STUDENT or TEACHER) in the dialog ("Crear grupo"); teachers keep the student-only dialog and always send STUDENT. Loaded on demand through lazy-staff-pages. Depends on MUI, next/head, @shared/design-system components, @shared/session, useGroups, GroupFilters, GroupsTable and the groups CSS Module.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AddIcon from "@mui/icons-material/Add";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import Button from "@mui/material/Button";
import TablePagination from "@mui/material/TablePagination";
import Head from "next/head";
import { useMemo, useState } from "react";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { cx } from "@shared/lib/class-names";
import { useSession } from "@shared/session/use-session";
import { toCreateGroupRequest } from "../../api/mappers/groups.mapper";
import { createGroup } from "../../api/services/groups.service";
import { FeedbackToast } from "../components/feedback-toast";
import type { Feedback } from "../components/feedback-toast";
import { GroupFilters } from "../components/group-filters";
import { GroupFormDialog } from "../components/group-form-dialog";
import { GroupsTable } from "../components/groups-table";
import { creatableGroupTypes, EMPTY_GROUP_DRAFT, EMPTY_GROUP_FILTERS, filterGroups, paginate } from "../entities/group.entity";
import type { Group, GroupDraft, GroupFilters as GroupFiltersValue } from "../entities/group.entity";
import { getGroupErrorMessage } from "../entities/groups-error-messages";
import { useGroupMutation } from "../hooks/use-group-mutation";
import { useGroups } from "../hooks/use-groups";
import styles from "../../UI/groups.module.css";

// TODO(i18n): move to a groups namespace in src/i18n.
const PAGE_COPY = {
  documentTitle: "Grupos | VentyLab",
  title: "Grupos",
  subtitle: "Consulta los grupos que administras, supervisas o integras.",
  loading: "Cargando grupos…",
  loadErrorTitle: "No se pudieron cargar los grupos",
  emptyTitle: "Aún no hay grupos",
  emptyDescription: "Los grupos que crees, supervises o integres aparecerán aquí.",
  noMatchTitle: "Ningún grupo coincide con los filtros",
  noMatchDescription: "Prueba con otro texto o cambia el tipo o el estado.",
  clearFilters: "Limpiar filtros",
  rowsPerPage: "Filas por página:",
  create: "Crear grupo",
  createTitle: "Crear grupo de estudiantes",
  createAnyTitle: "Crear grupo",
  created: (name: string) => `Grupo «${name}» creado.`,
} as const;

const PAGE_SIZES = [10, 25, 50];

const PAGE_BUTTON_LABELS: Record<"first" | "last" | "next" | "previous", string> = {
  first: "Primera página",
  last: "Última página",
  next: "Página siguiente",
  previous: "Página anterior",
};

type GroupListProps = {
  groups: readonly Group[]
};

function GroupList({ groups }: GroupListProps) {
  const [filters, setFilters] = useState<GroupFiltersValue>(EMPTY_GROUP_FILTERS);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0] ?? 10);
  const filtered = useMemo(() => filterGroups(groups, filters), [groups, filters]);
  // A reload can shrink the list below the current page.
  const lastPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);

  const changeFilters = (next: GroupFiltersValue) => {
    setFilters(next);
    setPage(0);
  };

  if (groups.length === 0) {
    return <EmptyState icon={<GroupWorkIcon />} title={PAGE_COPY.emptyTitle} description={PAGE_COPY.emptyDescription} />;
  }

  return (
    <div className={cx(styles.content)}>
      <GroupFilters value={filters} onChange={changeFilters} />
      {filtered.length === 0 ? (
        <EmptyState
          title={PAGE_COPY.noMatchTitle}
          description={PAGE_COPY.noMatchDescription}
          action={<Button onClick={() => changeFilters(EMPTY_GROUP_FILTERS)}>{PAGE_COPY.clearFilters}</Button>}
        />
      ) : (
        <div className={cx(styles.results)}>
          <GroupsTable groups={paginate(filtered, currentPage, pageSize)} />
          <TablePagination
            component="div"
            count={filtered.length}
            page={currentPage}
            rowsPerPage={pageSize}
            rowsPerPageOptions={PAGE_SIZES}
            onPageChange={(_event, next) => setPage(next)}
            onRowsPerPageChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(0);
            }}
            labelRowsPerPage={PAGE_COPY.rowsPerPage}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
            getItemAriaLabel={(type) => PAGE_BUTTON_LABELS[type]}
          />
        </div>
      )}
    </div>
  );
}

function CreateGroupAction() {
  const { role } = useSession();
  const types = creatableGroupTypes(role);
  const { pending, run } = useGroupMutation();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const submit = async(draft: GroupDraft) => {
    setError(null);

    // The backend rejects a type the role cannot create; the UI never sends one.
    const type = types.includes(draft.type) ? draft.type : "STUDENT";
    const outcome = await run(() => createGroup(toCreateGroupRequest({ ...draft, type })));

    if (outcome.status === "error") {
      setError(outcome.message);
    } else if (outcome.status === "success") {
      setOpen(false);
      setFeedback({ severity: "success", message: PAGE_COPY.created(draft.name.trim()) });
    }
  };

  return (
    <div className={cx(styles.headerActions)}>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {PAGE_COPY.create}
      </Button>
      {open ? (
        <GroupFormDialog
          title={types.length > 1 ? PAGE_COPY.createAnyTitle : PAGE_COPY.createTitle}
          submitLabel={PAGE_COPY.create}
          initialDraft={EMPTY_GROUP_DRAFT}
          typeOptions={types}
          pending={pending}
          error={error}
          onSubmit={(draft) => void submit(draft)}
          onCancel={() => setOpen(false)}
        />
      ) : null}
      <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />
    </div>
  );
}

export function GroupsPage() {
  const { groups, isLoading, error, reload } = useGroups();

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{PAGE_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={PAGE_COPY.title} subtitle={PAGE_COPY.subtitle} actions={<CreateGroupAction />} />
      {groups ? <GroupList groups={groups} /> : null}
      {!groups && isLoading ? <LoadingState label={PAGE_COPY.loading} /> : null}
      {!groups && !isLoading && error ? (
        <ErrorState title={PAGE_COPY.loadErrorTitle} description={getGroupErrorMessage(error)} onRetry={() => void reload()} />
      ) : null}
    </div>
  );
}
