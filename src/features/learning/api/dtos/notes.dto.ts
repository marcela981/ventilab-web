/*
* Funcionalidad: Notes DTOs
* Descripción: Request and response types of the private notes endpoints used by the lesson notes panel, taken from the generated OpenAPI schema: NoteDTO (Tiptap JSON `content`, `lessonId`, nullable `pageId`, timestamps), CreateNoteDTO (`POST /api/notes`), UpdateNoteDTO (`PATCH /api/notes/{noteId}`), AnalyzeNotesDTO and NotesAnalysisDTO (`POST /api/notes/analyze`). Types only.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type NoteDTO = Schemas["NoteDTO"];

export type CreateNoteDTO = Schemas["CreateNoteDTO"];

export type UpdateNoteDTO = Schemas["UpdateNoteDTO"];

export type AnalyzeNotesDTO = Schemas["AnalyzeNotesDTO"];

export type NotesAnalysisDTO = Schemas["NotesAnalysisDTO"];
