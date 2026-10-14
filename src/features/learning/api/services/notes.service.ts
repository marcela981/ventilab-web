/*
* Funcionalidad: Notes service
* Descripción: Calls of the private notes endpoints: list path of a lesson's notes (owner-only on the backend), create (`POST /api/notes` with lessonId, optional pageId and the Tiptap document), update (`PATCH /api/notes/{noteId}`), delete (`DELETE /api/notes/{noteId}`) and the AI analysis of a lesson's notes (`POST /api/notes/analyze` with the slow timeout: it waits for the language model). Depends on @shared/api-client, the notes DTOs and mapper.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiDelete, apiPatch, apiPost } from "@shared/api-client/api-request";
import type { Note, NoteDoc, NotesAnalysis } from "../../application/entities/note.entity";
import { toNote, toNotesAnalysis } from "../mappers/notes.mapper";

export const LESSON_NOTES_PATH = "/api/notes/lessons/{lessonId}";
// Backend maximum page size (ListQueryDTO @Max(100)); a lesson rarely holds that many notes of one user.
export const LESSON_NOTES_LIMIT = 100;

export type CreateNoteInput = {
  lessonId: string
  pageId: string | null
  content: NoteDoc
};

export async function createNote({ lessonId, pageId, content }: CreateNoteInput): Promise<Note> {
  const body = pageId === null ? { lessonId, content } : { lessonId, pageId, content };
  const result = await apiPost("/api/notes", { body });

  return toNote(result.data);
}

export async function updateNoteContent(noteId: string, content: NoteDoc): Promise<Note> {
  const result = await apiPatch("/api/notes/{noteId}", { params: { noteId }, body: { content } });

  return toNote(result.data);
}

export async function deleteNote(noteId: string): Promise<void> {
  await apiDelete("/api/notes/{noteId}", { params: { noteId } });
}

export async function analyzeLessonNotes(lessonId: string): Promise<NotesAnalysis> {
  const result = await apiPost("/api/notes/analyze", { body: { lessonId }, timeout: "slow" });

  return toNotesAnalysis(result.data);
}
