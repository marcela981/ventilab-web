/*
* Funcionalidad: Notes mapper
* Descripción: Maps the notes DTOs of the backend to the learning Note and NotesAnalysis entities (drops the model, scope and ids of the analysis that the panel does not use). Depends on the notes DTOs and the note entity. v1.1 (B1 closure): copies the moduleId, lessonTitle and pageTitle labels of the API.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { Note, NotesAnalysis } from "../../application/entities/note.entity";
import type { NoteDTO, NotesAnalysisDTO } from "../dtos/notes.dto";

export function toNote(dto: NoteDTO): Note {
  return {
    id: dto.id,
    lessonId: dto.lessonId,
    pageId: dto.pageId,
    moduleId: dto.moduleId,
    lessonTitle: dto.lessonTitle,
    pageTitle: dto.pageTitle,
    content: dto.content,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toNotes(dtos: readonly NoteDTO[]): Note[] {
  return dtos.map(toNote);
}

export function toNotesAnalysis(dto: NotesAnalysisDTO): NotesAnalysis {
  return {
    aiCallId: dto.aiCallId,
    summary: dto.summary,
    keyConcepts: dto.keyConcepts,
    gaps: dto.gaps,
    suggestions: dto.suggestions,
    notesAnalyzed: dto.notesAnalyzed,
  };
}
