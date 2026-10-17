/*
* Funcionalidad: MyNotesPage
* Descripción: Page /me/notes (STUDENT): every note of the caller, newest first and paginated with the envelope pagination (10/25/50): `GET /api/notes`, or `GET /api/notes/modules/{moduleId}` when a module is selected. Filters by section (narrows the modules) and module come from the learning curriculum tree. Each loaded page is grouped by module (curriculum order) and lesson; a note only carries its lessonId, so each lesson is read once (`GET /api/lessons/{id}`, LessonResolver). Notes are edited in place with the learning NoteComposer (autosave; the lesson notes of the learning viewer and the home summary refresh) and deleted after a confirmation, reusing the learning NoteItem. Each module offers "Analizar mis notas con IA" (`POST /api/notes/analyze` with moduleId) with the shared AI rating. A page emptied by a deletion moves back to the last available page. Skeleton, retryable error, stale-data warning and empty states (no notes, no notes in the module); action errors are toasts. v1.1 (O2 follow-up): while the page corrected after an out-of-range deletion loads, the skeleton is shown instead of the kept previous result (the emptied page or the deleted note); the deletion reports success as soon as `DELETE /api/notes/{id}` resolves and the cache refresh runs in the background, so a refresh failure is never shown as a failed deletion. BACKEND GAPS: no text search nor section filter in the notes endpoints; NoteDTO carries no module nor lesson title. Depends on MUI, next/head, next/link, @features/learning, the design-system states, dialog and toast, the student space hooks, entities, components and CSS Module.
* Versión: 1.1
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
import { deleteNote, LEARN_HOME_URL, useCurriculumTree } from "@features/learning";
import type { Note } from "@features/learning";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { useToast } from "@shared/design-system/components/use-toast";
import { cx } from "@shared/lib/class-names";
import { LessonNotesGroup } from "../components/lesson-notes-group";
import { LessonResolver } from "../components/lesson-resolver";
import { ModuleNotesAnalysis } from "../components/module-notes-analysis";
import { NotesFilters } from "../components/notes-filters";
import {
  groupNotesByModule,
  listModuleOptions,
  NOTES_PAGE_SIZES,
  toModuleRanks,
  toNotesQuery,
} from "../entities/my-notes.entity";
import type { ModuleNotesGroup, NoteLessonInfo } from "../entities/my-notes.entity";
import { getStudentSpaceErrorMessage } from "../entities/student-space-error-messages";
import { useMyNotes } from "../hooks/use-my-notes";
import { useNoteChanges } from "../hooks/use-note-changes";
import styles from "../../UI/student-space.module.css";

// TODO(i18n): move to a student-space namespace in src/i18n.
export const MY_NOTES_COPY = {
  documentTitle: "Mis notas | VentyLab",
  title: "Mis notas",
  subtitle: "Todas tus notas de las lecciones, agrupadas por módulo y lección.",
  unknownModule: "Lecciones sin módulo identificado",
  loading: "Cargando tus notas…",
  loadErrorTitle: "No se pudieron cargar tus notas",
  staleWarning: "No se pudieron actualizar tus notas. Los datos mostrados pueden estar desactualizados.",
  retry: "Reintentar",
  emptyTitle: "Aún no has tomado notas",
  emptyDescription: "Abre una lección y usa la pestaña \"Notas\" para escribir tus apuntes; aquí podrás revisarlos todos.",
  emptyAction: "Ir al aprendizaje",
  emptyModuleTitle: "No tienes notas en este módulo",
  emptyModuleDescription: "Elige otro módulo o \"Todos los módulos\".",
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
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(NOTES_PAGE_SIZES[0] ?? 10);
  const [lessons, setLessons] = useState<Record<string, NoteLessonInfo>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState(false);
  const query = useMemo(() => toNotesQuery(pageIndex, pageSize), [pageIndex, pageSize]);
  const { page, isLoading, error, reload, replaceNote } = useMyNotes(moduleId, query);
  const { afterEdit, afterDelete } = useNoteChanges();
  const sections = useMemo(() => (tree ? tree.sections.map((section) => ({ id: section.id, title: section.title })) : []), [tree]);
  const moduleOptions = useMemo(() => (tree ? listModuleOptions(tree, sectionId) : []), [tree, sectionId]);
  const moduleRanks = useMemo(() => toModuleRanks(tree ? listModuleOptions(tree) : []), [tree]);
  const groups = useMemo(() => (page ? groupNotesByModule(page.items, lessons, moduleRanks) : []), [page, lessons, moduleRanks]);
  const lessonIds = useMemo(() => [...new Set(page?.items.map((note) => note.lessonId) ?? [])], [page]);
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

  const resolveLesson = useCallback((lesson: NoteLessonInfo) => {
    setLessons((current) => (current[lesson.lessonId] ? current : { ...current, [lesson.lessonId]: lesson }));
  }, []);

  const changeSection = (next: string | null) => {
    setSectionId(next);
    setPageIndex(0);
    setRecoveringPage(null);

    if (next !== null && tree && moduleId !== null && !listModuleOptions(tree, next).some((option) => option.id === moduleId)) {
      setModuleId(null);
    }
  };

  const changeModule = (next: string | null) => {
    setModuleId(next);
    setPageIndex(0);
    setRecoveringPage(null);
    setEditingId(null);
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
    const title = group.moduleTitle ?? MY_NOTES_COPY.unknownModule;

    return (
      <section key={group.moduleId ?? "unknown"} aria-label={title} className={cx(styles.moduleGroup)}>
        <h2 className={cx(styles.moduleTitle)}>{title}</h2>
        {group.moduleId ? <ModuleNotesAnalysis moduleId={group.moduleId} moduleTitle={title} /> : null}
        {group.lessons.map((lessonGroup) => (
          <LessonNotesGroup
            key={lessonGroup.lessonId}
            lessonId={lessonGroup.lessonId}
            lesson={lessonGroup.lesson}
            notes={lessonGroup.notes}
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
      return moduleId ? (
        <EmptyState icon={<NoteAltOutlinedIcon />} title={MY_NOTES_COPY.emptyModuleTitle} description={MY_NOTES_COPY.emptyModuleDescription} />
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
            setPageIndex(0);
            setRecoveringPage(null);
            setEditingId(null);
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
          sections={sections}
          modules={moduleOptions}
          sectionId={sectionId}
          moduleId={moduleId}
          disabled={!tree}
          onSectionChange={changeSection}
          onModuleChange={changeModule}
        />
        {lessonIds.map((lessonId) => <LessonResolver key={lessonId} lessonId={lessonId} onResolved={resolveLesson} />)}
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
