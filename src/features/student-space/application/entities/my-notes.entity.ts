/*
* Funcionalidad: My notes entity
* Descripción: Pure rules of /me/notes: the module options of the filters in curriculum order (from the learning curriculum tree, optionally narrowed to one section), the query of one page of notes (`GET /api/notes` or `GET /api/notes/modules/{moduleId}`, newest first) and the grouping of the loaded page by module and lesson. A note only carries its lessonId, so its lesson and module come from the lesson read (`GET /api/lessons/{id}`); lessons not resolved yet (or not readable) fall into a trailing group without module. Notes keep the API order inside each lesson. BACKEND GAPS: notes cannot be filtered by section nor by text, and NoteDTO carries no module nor lesson title. Depends on the learning public types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { CurriculumLevel, CurriculumTree, Note } from "@features/learning";

export type NoteLessonInfo = {
  lessonId: string
  lessonTitle: string
  lessonOrder: number
  moduleId: string
  moduleTitle: string
};

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

export type NotesQuery = {
  page: number
  limit: number
  sortOrder: "desc"
};

export type LessonNotesGroup = {
  lessonId: string
  lesson: NoteLessonInfo | null
  notes: Note[]
};

export type ModuleNotesGroup = {
  // null groups the notes whose lesson is not resolved.
  moduleId: string | null
  moduleTitle: string | null
  lessons: LessonNotesGroup[]
};

/** Rows per page of /me/notes. */
export const NOTES_PAGE_SIZES = [10, 25, 50];

/** Query of one page of /me/notes (pageIndex is zero-based, the API page is one-based). */
export function toNotesQuery(pageIndex: number, limit: number): NotesQuery {
  return { page: pageIndex + 1, limit, sortOrder: "desc" };
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

/** Groups one page of notes by module (curriculum order) and lesson (lesson order). */
export function groupNotesByModule(
  notes: readonly Note[],
  lessons: Readonly<Record<string, NoteLessonInfo | undefined>>,
  moduleRanks: ReadonlyMap<string, number>,
): ModuleNotesGroup[] {
  const byLesson = new Map<string, LessonNotesGroup>();

  for (const note of notes) {
    const group = byLesson.get(note.lessonId) ?? { lessonId: note.lessonId, lesson: lessons[note.lessonId] ?? null, notes: [] };

    group.notes.push(note);
    byLesson.set(note.lessonId, group);
  }

  const byModule = new Map<string | null, ModuleNotesGroup>();

  for (const lessonGroup of byLesson.values()) {
    const moduleId = lessonGroup.lesson?.moduleId ?? null;
    const group = byModule.get(moduleId) ?? { moduleId, moduleTitle: lessonGroup.lesson?.moduleTitle ?? null, lessons: [] };

    group.lessons.push(lessonGroup);
    byModule.set(moduleId, group);
  }

  const groups = [...byModule.values()];

  for (const group of groups) {
    group.lessons.sort((a, b) => (a.lesson?.lessonOrder ?? Number.MAX_SAFE_INTEGER) - (b.lesson?.lessonOrder ?? Number.MAX_SAFE_INTEGER));
  }

  return groups.sort((a, b) => {
    if (a.moduleId === null || b.moduleId === null) {
      return a.moduleId === null ? (b.moduleId === null ? 0 : 1) : -1;
    }

    return rankOf(moduleRanks, a.moduleId) - rankOf(moduleRanks, b.moduleId) || (a.moduleTitle ?? "").localeCompare(b.moduleTitle ?? "", "es");
  });
}

/** Curriculum position of every module (rank used to order the module groups). */
export function toModuleRanks(options: readonly ModuleOption[]): Map<string, number> {
  return new Map(options.map((option, index) => [option.id, index]));
}
