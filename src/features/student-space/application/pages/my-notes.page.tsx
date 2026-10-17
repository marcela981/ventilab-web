/*
* Funcionalidad: MyNotesPage
* Descripción: Page /me/notes (STUDENT): every note of the caller, newest first and paginated with the envelope pagination (10/25/50) from `GET /api/notes`, searched and filtered on the server: text search (`search`, debounced), module (`moduleId`), lesson (`lessonId`) and lesson page (`pageId`); the curriculum section only narrows the module options (learning curriculum tree). Each loaded page is grouped by module (curriculum order, title from the tree) and lesson (title sent with each note), so no lesson is read to place a note. Notes are edited in place with the learning NoteComposer (autosave; the lesson notes of the learning viewer and the home summary refresh) and deleted after a confirmation, reusing the learning NoteItem; each lesson links to its page in the learning viewer. Each module offers "Analizar mis notas con IA" (`POST /api/notes/analyze` with moduleId) with the shared AI rating. A page emptied by a deletion moves back to the last available page. Skeleton, retryable error, stale-data warning and empty states (no notes at all; no notes matching the search or filters, with "Limpiar filtros"); action errors are toasts. v1.1 (O2 follow-up): while the page corrected after an out-of-range deletion loads, the skeleton is shown instead of the kept previous result (the emptied page or the deleted note); the deletion reports success as soon as `DELETE /api/notes/{id}` resolves and the cache refresh runs in the background, so a refresh failure is never shown as a failed deletion. v1.2 (B2 closure): server-side search and module, lesson and page filters on one endpoint; the per-lesson reads (LessonResolver) and the per-module endpoint are gone. Depends on MUI, next/head, next/link, @features/learning, the design-system states, dialog and toast, the student space hooks, entities, components and CSS Module.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TablePagination from "@mui/material/TablePagination";
import Head from "next/head";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { deleteNote, LEARN_HOME_URL, useCurriculumTree, useLessonPages, useModuleLessons } from "@features/learning";
import type { Note } from "@features/learning";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { LessonNotesGroup } from "../components/lesson-notes-group";
import { ModuleNotesAnalysis } from "../components/module-notes-analysis";
import { NotesFilters } from "../components/notes-filters";
import {
  groupNotesByModule,
  hasNotesFilters,
  listModuleOptions,
  NOTES_PAGE_SIZES,
  NOTES_SEARCH_DEBOUNCE_MS,
  toNotesQuery,
} from "../entities/my-notes.entity";
import type { ModuleNotesGroup, NotesFilterValues } from "../entities/my-notes.entity";
import { getStudentSpaceErrorMessage } from "../entities/student-space-error-messages";
import { useDebouncedValue } from "../hooks/use-debounced-value";
import { useMyNotes } from "../hooks/use-my-notes";
import { useNoteChanges } from "../hooks/use-note-changes";
import styles from "../../UI/student-space.module.css";

// TODO(i18n): move to a student-space namespace in src/i18n.
export const MY_NOTES_COPY = {
  documentTitle: "Mis notas | VentyLab",
  title: "Mis notas",
  subtitle: "Todas tus notas de las lecciones, agrupadas por módulo y lección.",
  unknownModule: "Lecciones sin módulo identificado",
  moduleFallback: "Módulo",
  loading: "Cargando tus notas…",
  loadErrorTitle: "No se pudieron cargar tus notas",
  staleWarning: "No se pudieron actualizar tus notas. Los datos mostrados pueden estar desactualizados.",
  retry: "Reintentar",
  emptyTitle: "Aún no has tomado notas",
  emptyDescription: "Abre una lección y usa la pestaña \"Notas\" para escribir tus apuntes; aquí podrás revisarlos todos.",
  emptyAction: "Ir al aprendizaje",
  emptyFilteredTitle: "No hay notas que coincidan",
  emptyFilteredDescription: "Prueba con otra palabra o quita algún filtro.",
  clearFilters: "Limpiar filtros",
  deleteTitle: "Eliminar nota",
  deleteDescription: "La nota se eliminará de forma permanente. Esta acción no se puede deshacer.",
  deleteConfirm: "Eliminar",
  deleted: "Nota eliminada.",
  rowsPerPage: "Notas por página:",
} as const;

const PAGE_BUTTON_LABELS: Record<"first" | "last" | "next" | "previous", string> = {
  first: "Primera página",
  last: "Última página",
  next: "Página siguiente",
  previous: "Página anterior",
};

export function MyNotesPage() {
  const toast = useToast();
  const { tree } = useCurriculumTree();
  const [searchInput, setSearchInput] = useState("");
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [pageId, setPageId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(NOTES_PAGE_SIZES[0] ?? 10);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);
  const search = useDebouncedValue(searchInput.trim(), NOTES_SEARCH_DEBOUNCE_MS);
  // Search that the current page index belongs to: a new debounced search starts again at the first page.
  const [pagedSearch, setPagedSearch] = useState(search);

  if (pagedSearch !== search) {
    // Adjusting state while rendering (React's documented pattern).
    setPagedSearch(search);
    setPageIndex(0);
  }

  const filters = useMemo<NotesFilterValues>(() => ({ search, moduleId, lessonId, pageId }), [search, moduleId, lessonId, pageId]);
  const query = useMemo(() => toNotesQuery(pageIndex, pageSize, filters), [pageIndex, pageSize, filters]);
  const { page, isLoading, error, reload, replaceNote } = useMyNotes(query);
  const { afterEdit, afterDelete } = useNoteChanges();
  const { lessons } = useModuleLessons(moduleId);
  const { pages: lessonPages } = useLessonPages(lessonId);
  const sections = useMemo(() => (tree ? tree.sections.map((section) => ({ id: section.id, title: section.title })) : []), [tree]);
  const moduleOptions = useMemo(() => (tree ? listModuleOptions(tree, sectionId) : []), [tree, sectionId]);
  const allModules = useMemo(() => (tree ? listModuleOptions(tree) : []), [tree]);
  const lessonOptions = useMemo(() => (lessons ?? []).map((lesson) => ({ id: lesson.id, title: lesson.title })), [lessons]);
  const pageOptions = useMemo(() => (lessonPages ?? []).map((lessonPage) => ({ id: lessonPage.id, title: lessonPage.title })), [lessonPages]);
  const groups = useMemo(() => (page ? groupNotesByModule(page.items, allModules) : []), [page, allModules]);
  // Page number being loaded after a deletion emptied the last page; null while the student navigates normally.
  const [recoveringPage, setRecoveringPage] = useState<number | null>(null);
  // The server answered the requested page with no rows: it is beyond the last page (notes were deleted meanwhile).
  const outOfRange = page !== null && page.page === pageIndex + 1 && pageIndex > 0 && page.items.length === 0;

  if (outOfRange) {
    // Adjusting state while rendering (React's documented pattern): the next query asks for the last available page.
    const nextIndex = Math.max(0, Math.min(pageIndex - 1, page.pages - 1));

    setPageIndex(nextIndex);
    setRecoveringPage(nextIndex + 1);
  } else if (recoveringPage !== null && page?.page === recoveringPage) {
    setRecoveringPage(null);
  }

  // keepPreviousData would keep the emptied page (or the deleted note) on screen while the corrected page loads: show the skeleton instead.
  const awaitingPage = outOfRange || (recoveringPage !== null && page?.page !== recoveringPage);

  const restart = () => {
    setPageIndex(0);
    setRecoveringPage(null);
    setEditingId(null);
  };

  const changeSection = (next: string | null) => {
    setSectionId(next);
    restart();

    if (next !== null && tree && moduleId !== null && !listModuleOptions(tree, next).some((option) => option.id === moduleId)) {
      setModuleId(null);
      setLessonId(null);
      setPageId(null);
    }
  };

  const changeModule = (next: string | null) => {
    setModuleId(next);
    setLessonId(null);
    setPageId(null);
    restart();
  };

  const changeLesson = (next: string | null) => {
    setLessonId(next);
    setPageId(null);
    restart();
  };

  const changePage = (next: string | null) => {
    setPageId(next);
    restart();
  };

  const clearFilters = () => {
    setSearchInput("");
    setSectionId(null);
    setModuleId(null);
    setLessonId(null);
    setPageId(null);
    restart();
  };

  const handleSaved = useCallback((note: Note) => {
    void replaceNote(note);
    void afterEdit();
  }, [replaceNote, afterEdit]);

  const closeEditor = useCallback(() => setEditingId(null), []);

  const confirmDelete = async() => {
    if (!pendingDelete) {
      return;
    }

    setDeleting(true);

    try {
      await deleteNote(pendingDelete.id);
    } catch (deleteError) {
      toast.error(getStudentSpaceErrorMessage(deleteError));

      return;
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }

    toast.success(MY_NOTES_COPY.deleted);
    // The note is already deleted: a failed refresh surfaces as the stale-data warning of the list, never as a delete error.
    void afterDelete().catch(() => undefined);
  };

  const renderModuleGroup = (group: ModuleNotesGroup) => {
    const title = group.moduleTitle ?? (group.moduleId ? MY_NOTES_COPY.moduleFallback : MY_NOTES_COPY.unknownModule);

    return (
      <section key={group.moduleId ?? "unknown"} aria-label={title} className={cx(styles.moduleGroup)}>
        <h2 className={cx(styles.moduleTitle)}>{title}</h2>
        {group.moduleId ? <ModuleNotesAnalysis moduleId={group.moduleId} moduleTitle={title} /> : null}
        {group.lessons.map((lessonGroup) => (
          <LessonNotesGroup
            key={lessonGroup.lessonId}
            group={lessonGroup}
            editingId={editingId}
            onEdit={(note) => setEditingId(note.id)}
            onDelete={(note) => setPendingDelete(note)}
            onSaved={handleSaved}
            onCloseEditor={closeEditor}
          />
        ))}
      </section>
    );
  };

  const renderNotes = () => {
    if (!page || awaitingPage) {
      return null;
    }

    if (page.items.length === 0) {
      return hasNotesFilters(filters) ? (
        <EmptyState
          icon={<NoteAltOutlinedIcon />}
          title={MY_NOTES_COPY.emptyFilteredTitle}
          description={MY_NOTES_COPY.emptyFilteredDescription}
          action={<Button variant="outlined" onClick={clearFilters}>{MY_NOTES_COPY.clearFilters}</Button>}
        />
      ) : (
        <EmptyState
          icon={<NoteAltOutlinedIcon />}
          title={MY_NOTES_COPY.emptyTitle}
          description={MY_NOTES_COPY.emptyDescription}
          action={<Button component={Link} href={LEARN_HOME_URL} variant="outlined">{MY_NOTES_COPY.emptyAction}</Button>}
        />
      );
    }

    return (
      <>
        {groups.map(renderModuleGroup)}
        <TablePagination
          component="div"
          className={cx(styles.pagination)}
          count={page.total}
          page={Math.min(pageIndex, Math.max(0, page.pages - 1))}
          rowsPerPage={pageSize}
          rowsPerPageOptions={NOTES_PAGE_SIZES}
          onPageChange={(_event, next) => {
            setPageIndex(next);
            setRecoveringPage(null);
            setEditingId(null);
          }}
          onRowsPerPageChange={(event) => {
            setPageSize(Number(event.target.value));
            restart();
          }}
          labelRowsPerPage={MY_NOTES_COPY.rowsPerPage}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          getItemAriaLabel={(type) => PAGE_BUTTON_LABELS[type]}
        />
      </>
    );
  };

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{MY_NOTES_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={MY_NOTES_COPY.title} subtitle={MY_NOTES_COPY.subtitle} />
      <div className={cx(styles.content)}>
        <NotesFilters
          search={searchInput}
          sections={sections}
          modules={moduleOptions}
          lessons={lessonOptions}
          pages={pageOptions}
          sectionId={sectionId}
          moduleId={moduleId}
          lessonId={lessonId}
          pageId={pageId}
          disabled={!tree}
          onSearchChange={setSearchInput}
          onSectionChange={changeSection}
          onModuleChange={changeModule}
          onLessonChange={changeLesson}
          onPageChange={changePage}
        />
        {page && error ? (
          <Alert
            severity="warning"
            action={<Button color="inherit" size="small" onClick={() => void reload()}>{MY_NOTES_COPY.retry}</Button>}
          >
            {MY_NOTES_COPY.staleWarning} {getStudentSpaceErrorMessage(error)}
          </Alert>
        ) : null}
        {renderNotes()}
        {(!page && isLoading) || (awaitingPage && !error) ? <ListSkeleton rows={4} label={MY_NOTES_COPY.loading} /> : null}
        {!page && !isLoading && error ? (
          <ErrorState
            title={MY_NOTES_COPY.loadErrorTitle}
            description={getStudentSpaceErrorMessage(error)}
            onRetry={() => void reload()}
          />
        ) : null}
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        title={MY_NOTES_COPY.deleteTitle}
        description={MY_NOTES_COPY.deleteDescription}
        confirmLabel={MY_NOTES_COPY.deleteConfirm}
        destructive
        isPending={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
