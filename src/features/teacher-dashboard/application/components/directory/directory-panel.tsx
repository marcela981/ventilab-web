/*
* Funcionalidad: DirectoryPanel
* Descripción: Container of the Directorio tab of /teacher/students (July's PanelStudents directory, DISENO_BLOQUE4 §2.3): reads the URL state (?page ?q ?sort ?scope), loads that page of `GET /api/admin/students` and writes every change back with a shallow router.replace that keeps ?tab (a new search, sort or filter returns to page 1). Owns the row selection (id → name), which is cleared whenever the page, search, sort or filter change, and opens "Conformar Grupo" with the selected students; a created group clears the selection. States: skeleton, error (a 403 names the directory) with retry, empty ("Mis grupos" without students, a search without matches, no students), an out-of-range page moved to the last page. When the dialog closes and its opener is gone, the focus goes to the results region. Depends on MUI, next/router, React, the design-system states, the students directory hooks, entity and components and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import TablePagination from "@mui/material/TablePagination";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import {
  directorySelectionKey,
  getDirectoryErrorMessage,
  readDirectoryState,
  rowDisplayName,
  toDirectoryQuery,
  toggleDirectorySort,
} from "../../entities/students-directory.entity";
import type { DirectoryRow, DirectoryScope, DirectorySortKey, DirectoryState } from "../../entities/students-directory.entity";
import type { GroupMemberCandidate } from "../../hooks/use-group-builder";
import { useStudentsDirectory } from "../../hooks/use-students-directory";
import { DIRECTORY_TABLE_COPY, DirectoryTable } from "./directory-table";
import { DirectoryToolbar } from "./directory-toolbar";
import { GroupBuilderDialog } from "./group-builder-dialog";
import styles from "../../../UI/students-directory.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const DIRECTORY_PANEL_COPY = {
  loading: "Cargando estudiantes…",
  loadErrorTitle: "Error al cargar estudiantes",
  emptyTitle: "No hay estudiantes",
  emptyMineTitle: "No hay estudiantes en tus grupos",
  emptyMineDescription: "Los estudiantes de los grupos que creaste o supervisas aparecen aquí.",
  noMatchTitle: "No se encontraron estudiantes",
  noMatchDescription: "Cambia la búsqueda o el filtro.",
  emptyPageTitle: "Esta página no tiene estudiantes",
  emptyPageDescription: "Usa la paginación para ir a otra página.",
  selected: (count: number) => `${count} ${count === 1 ? "estudiante seleccionado" : "estudiantes seleccionados"}`,
} as const;

const PAGE_BUTTON_LABELS: Record<"first" | "last" | "next" | "previous", string> = {
  first: "Primera página",
  last: "Última página",
  next: "Página siguiente",
  previous: "Página anterior",
};

type Selection = ReadonlyMap<string, GroupMemberCandidate>;

const NO_SELECTION: Selection = new Map();

export function DirectoryPanel() {
  const router = useRouter();
  const state = readDirectoryState(router.query);
  const directory = useStudentsDirectory(state, router.isReady);
  const { rows, pagination } = directory;
  const resultsRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Selection>(NO_SELECTION);
  const [builderOpen, setBuilderOpen] = useState(false);
  const selectionKey = directorySelectionKey(state);
  const [selectionOwner, setSelectionOwner] = useState(selectionKey);

  // The selection belongs to the listing on screen: a new page, search, sort or filter clears it.
  if (selectionOwner !== selectionKey) {
    setSelectionOwner(selectionKey);
    setSelection(NO_SELECTION);
  }

  const { pathname, query, replace } = router;
  const tab = typeof query.tab === "string" ? query.tab : null;

  const navigate = useCallback((next: DirectoryState) => {
    void replace({ pathname, query: { ...(tab ? { tab } : {}), ...toDirectoryQuery(next) } }, undefined, { shallow: true });
  }, [replace, pathname, tab]);

  // Stable while the sort and filter stay: a new identity would restart the toolbar's debounce timer.
  const { key: sortKey, direction: sortDirection } = state.sort;
  const { scope } = state;
  const onSearch = useCallback(
    (q: string) => navigate({ page: 1, q, sort: { key: sortKey, direction: sortDirection }, scope }),
    [navigate, sortKey, sortDirection, scope],
  );
  const onScope = (next: DirectoryScope) => navigate({ ...state, scope: next, page: 1 });
  const onSort = (key: DirectorySortKey) => navigate({ ...state, sort: toggleDirectorySort(state.sort, key), page: 1 });

  useEffect(() => {
    // A page beyond the last one (shared URL, students removed): show the last page instead of an empty list.
    if (rows && rows.length === 0 && pagination && pagination.total > 0 && state.page > pagination.pages) {
      navigate({ ...state, page: Math.max(1, pagination.pages) });
    }
  }, [rows, pagination, state, navigate]);

  const toggleRow = (row: DirectoryRow) => {
    const next = new Map(selection);

    if (next.has(row.id)) {
      next.delete(row.id);
    } else {
      next.set(row.id, { id: row.id, name: rowDisplayName(row) });
    }

    setSelection(next);
  };

  const togglePage = (select: boolean) => {
    const next = new Map(selection);

    for (const row of rows ?? []) {
      if (select) {
        next.set(row.id, { id: row.id, name: rowDisplayName(row) });
      } else {
        next.delete(row.id);
      }
    }

    setSelection(next);
  };

  const closeBuilder = useCallback((created: boolean) => {
    setBuilderOpen(false);

    if (created) {
      setSelection(NO_SELECTION);
    }
  }, []);

  const restoreFocus = () => {
    // The opener ("Conformar Grupo") disappears with the selection: keep the focus in the directory.
    if (!document.activeElement || document.activeElement === document.body) {
      resultsRef.current?.focus();
    }
  };

  const renderPagination = (current: NonNullable<typeof pagination>) => (
    <TablePagination
      component="div"
      count={current.total}
      page={Math.max(0, Math.min(state.page, Math.max(1, current.pages)) - 1)}
      rowsPerPage={current.limit}
      rowsPerPageOptions={[current.limit]}
      onPageChange={(_event, next) => navigate({ ...state, page: next + 1 })}
      labelRowsPerPage="Filas por página:"
      labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
      getItemAriaLabel={(type) => PAGE_BUTTON_LABELS[type]}
    />
  );

  const renderEmpty = () => {
    if (state.q) {
      return <EmptyState title={DIRECTORY_PANEL_COPY.noMatchTitle} description={DIRECTORY_PANEL_COPY.noMatchDescription} />;
    }

    return state.scope === "mine"
      ? <EmptyState icon={<PeopleOutlineIcon />} title={DIRECTORY_PANEL_COPY.emptyMineTitle} description={DIRECTORY_PANEL_COPY.emptyMineDescription} />
      : <EmptyState icon={<PeopleOutlineIcon />} title={DIRECTORY_PANEL_COPY.emptyTitle} />;
  };

  const renderResults = () => {
    if (directory.error) {
      return (
        <ErrorState
          title={DIRECTORY_PANEL_COPY.loadErrorTitle}
          description={getDirectoryErrorMessage(directory.error)}
          onRetry={() => void directory.reload()}
        />
      );
    }

    if (!rows || !pagination) {
      return <ListSkeleton rows={5} label={DIRECTORY_PANEL_COPY.loading} />;
    }

    if (rows.length === 0) {
      if (pagination.total === 0) {
        return renderEmpty();
      }

      // Out-of-range page: the effect above moves to the last page. In range (rows removed meanwhile): never stuck.
      return state.page > pagination.pages ? <ListSkeleton rows={5} label={DIRECTORY_PANEL_COPY.loading} /> : (
        <>
          <EmptyState title={DIRECTORY_PANEL_COPY.emptyPageTitle} description={DIRECTORY_PANEL_COPY.emptyPageDescription} />
          {renderPagination(pagination)}
        </>
      );
    }

    return (
      <>
        <DirectoryTable
          rows={rows}
          sort={state.sort}
          selectedIds={new Set(selection.keys())}
          onSort={onSort}
          onToggleRow={toggleRow}
          onTogglePage={togglePage}
        />
        {renderPagination(pagination)}
      </>
    );
  };

  const members = [...selection.values()];

  return (
    <>
      <DirectoryToolbar
        search={state.q}
        scope={state.scope}
        selectedCount={selection.size}
        onSearch={onSearch}
        onScope={onScope}
        onBuildGroup={() => setBuilderOpen(true)}
      />
      <p role="status" className={cx(styles.srOnly)}>{selection.size > 0 ? DIRECTORY_PANEL_COPY.selected(selection.size) : ""}</p>
      <div ref={resultsRef} tabIndex={-1} aria-label={DIRECTORY_TABLE_COPY.label} role="region" className={cx(styles.results)}>
        {renderResults()}
      </div>
      <GroupBuilderDialog open={builderOpen} members={members} onClose={closeBuilder} onExited={restoreFocus} />
    </>
  );
}
