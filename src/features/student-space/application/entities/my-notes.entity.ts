/*
* Funcionalidad: My notes entity
* Descripción: Pure rules of /me/notes: the module options of the filters in curriculum order (from the learning curriculum tree, optionally narrowed to one curriculum section), the query of one page of notes (`GET /api/notes`, newest first, with the server-side filters: trimmed text `search`, `moduleId`, `lessonId` and the lesson page `pageId`; empty filters are left out) and the grouping of the loaded page by module (curriculum order, titles from the curriculum tree) and lesson (lesson title sent by the API). Each note carries its moduleId, lessonTitle and pageTitle, so no lesson is read to place it; notes whose module is unknown fall into a trailing group. Notes and lessons keep the API order (newest first). Depends on the learning public types. v1.1 (B2 closure): server-side search and filters, grouping by the note labels of the API instead of the per-lesson reads.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { CurriculumLevel, CurriculumTree, Note } from "@features/learning";

export type ModuleOption = {
  id: string
  title: string
  sectionId: string | null
};

export type NotesPage = {
  items: Note[]
  total: number
  page: number
  pages: number
};

/** Filters of /me/notes sent to the server (null or blank = no filter). */
export type NotesFilterValues = {
  search: string
  moduleId: string | null
  lessonId: string | null
  pageId: string | null
};

export type NotesQuery = {
  page: number
  limit: number
  sortOrder: "desc"
  search?: string
  moduleId?: string
  lessonId?: string
  pageId?: string
};

export type LessonNotesGroup = {
  lessonId: string
  lessonTitle: string | null
  moduleId: string | null
  notes: Note[]
};

export type ModuleNotesGroup = {
  // null groups the notes whose module is unknown.
  moduleId: string | null
  moduleTitle: string | null
  lessons: LessonNotesGroup[]
};

/** Rows per page of /me/notes. */
export const NOTES_PAGE_SIZES = [10, 25, 50];

/** Delay before the typed search reaches the server. */
export const NOTES_SEARCH_DEBOUNCE_MS = 300;

export const NO_NOTES_FILTERS: NotesFilterValues = { search: "", moduleId: null, lessonId: null, pageId: null };

export function hasNotesFilters(filters: NotesFilterValues): boolean {
  return filters.search.trim() !== "" || filters.moduleId !== null || filters.lessonId !== null || filters.pageId !== null;
}

/** Query of one page of /me/notes (pageIndex is zero-based, the API page is one-based). */
export function toNotesQuery(pageIndex: number, limit: number, filters: NotesFilterValues = NO_NOTES_FILTERS): NotesQuery {
  const search = filters.search.trim();

  return {
    page: pageIndex + 1,
    limit,
    sortOrder: "desc",
    ...(search ? { search } : {}),
    ...(filters.moduleId ? { moduleId: filters.moduleId } : {}),
    ...(filters.lessonId ? { lessonId: filters.lessonId } : {}),
    ...(filters.pageId ? { pageId: filters.pageId } : {}),
  };
}

function levelModules(level: CurriculumLevel): ModuleOption[] {
  return level.modules.map((module) => ({ id: module.id, title: module.title, sectionId: level.sectionId }));
}

/** Modules of the curriculum in its order (sections first, then unsectioned levels); one section when sectionId is set. */
export function listModuleOptions(tree: CurriculumTree, sectionId: string | null = null): ModuleOption[] {
  const sectioned = tree.sections
    .filter((section) => sectionId === null || section.id === sectionId)
    .flatMap((section) => section.levels.flatMap(levelModules));

  return sectionId === null ? [...sectioned, ...tree.unsectionedLevels.flatMap(levelModules)] : sectioned;
}

function rankOf(ranks: ReadonlyMap<string, number>, moduleId: string): number {
  return ranks.get(moduleId) ?? Number.MAX_SAFE_INTEGER;
}

/** Groups one page of notes by module (curriculum order, unknown module last) and lesson (API order). */
export function groupNotesByModule(notes: readonly Note[], modules: readonly ModuleOption[]): ModuleNotesGroup[] {
  const ranks = new Map(modules.map((option, index) => [option.id, index]));
  const titles = new Map(modules.map((option) => [option.id, option.title]));
  const byModule = new Map<string | null, ModuleNotesGroup>();
  const byLesson = new Map<string, LessonNotesGroup>();

  for (const note of notes) {
    let lesson = byLesson.get(note.lessonId);

    if (!lesson) {
      lesson = { lessonId: note.lessonId, lessonTitle: note.lessonTitle, moduleId: note.moduleId, notes: [] };
      byLesson.set(note.lessonId, lesson);

      const group = byModule.get(note.moduleId)
        ?? { moduleId: note.moduleId, moduleTitle: note.moduleId === null ? null : titles.get(note.moduleId) ?? null, lessons: [] };

      group.lessons.push(lesson);
      byModule.set(note.moduleId, group);
    }

    lesson.notes.push(note);
  }

  return [...byModule.values()].sort((a, b) => {
    if (a.moduleId === null || b.moduleId === null) {
      return a.moduleId === null ? (b.moduleId === null ? 0 : 1) : -1;
    }

    return rankOf(ranks, a.moduleId) - rankOf(ranks, b.moduleId) || (a.moduleTitle ?? "").localeCompare(b.moduleTitle ?? "", "es");
  });
}
