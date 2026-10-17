/*
* Funcionalidad: Note entity
* Descripción: Domain types and pure rules of the private lesson notes: Note (Tiptap JSON document, optional anchor Page), NotesAnalysis (AI summary, key concepts, gaps, suggestions and the aiCallId used to rate it), the empty document, the "has any text" check used to avoid creating empty notes, the resolution of an anchor pageId to its 1-based page number inside the lesson (null when unknown) and the newest-first upsert/removal of a note in a list. No dependencies. v1.1 (B1 closure): Note carries the moduleId, lessonTitle and pageTitle labels of the API.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type NoteDoc = Record<string, unknown>;

export type Note = {
  id: string
  lessonId: string
  pageId: string | null
  // Labels sent by the API (null when the lesson or page is gone): module of the lesson, lesson and anchor page titles.
  moduleId: string | null
  lessonTitle: string | null
  pageTitle: string | null
  content: NoteDoc
  createdAt: string
  updatedAt: string
};

export type NotesAnalysis = {
  aiCallId: string
  summary: string
  keyConcepts: string[]
  gaps: string[]
  suggestions: string[]
  notesAnalyzed: number
};

export const EMPTY_NOTE_DOC: NoteDoc = { type: "doc", content: [{ type: "paragraph" }] };

export function hasNoteText(node: unknown): boolean {
  if (typeof node !== "object" || node === null) {
    return false;
  }

  const { text, content } = node as { text?: unknown, content?: unknown };

  if (typeof text === "string" && text.trim() !== "") {
    return true;
  }

  return Array.isArray(content) && content.some((child) => hasNoteText(child));
}

export function notePageNumber(pageId: string | null, pages: readonly { id: string }[] | null): number | null {
  if (pageId === null || pages === null) {
    return null;
  }

  const index = pages.findIndex((page) => page.id === pageId);

  return index === -1 ? null : index + 1;
}

export function upsertNote(notes: readonly Note[], note: Note): Note[] {
  return notes.some((item) => item.id === note.id)
    ? notes.map((item) => (item.id === note.id ? note : item))
    : [note, ...notes];
}

export function removeNote(notes: readonly Note[], noteId: string): Note[] {
  return notes.filter((item) => item.id !== noteId);
}
