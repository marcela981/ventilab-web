/*
* Funcionalidad: My notes mapper
* Descripción: Maps one page of the caller's notes (NoteDTO[] plus the envelope pagination) to a NotesPage of learning Note entities, the lesson read (`GET /api/lessons/{id}` → LessonDetailDTO) to the NoteLessonInfo that places a note in its module, and the module notes analysis (NotesAnalysisDTO) to the learning NotesAnalysis entity. Depends on the api-client types, the learning public types and the student space DTOs and entities. v1.1 (B1 closure): a note keeps the moduleId, lessonTitle and pageTitle labels of the API.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ApiPagination } from "@shared/api-client/api-types";
import type { Note, NotesAnalysis } from "@features/learning";
import type { NoteLessonInfo, NotesPage } from "../../application/entities/my-notes.entity";
import type { LessonDetailDTO, NoteDTO, NotesAnalysisDTO } from "../dtos/student-space.dto";

export function toMyNote(dto: NoteDTO): Note {
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

export function toNotesPage(items: readonly NoteDTO[], pagination: ApiPagination | null): NotesPage {
  return {
    items: items.map(toMyNote),
    total: pagination?.total ?? items.length,
    page: pagination?.page ?? 1,
    pages: pagination?.pages ?? 1,
  };
}

export function toNoteLessonInfo(dto: LessonDetailDTO): NoteLessonInfo {
  return {
    lessonId: dto.id,
    lessonTitle: dto.title,
    lessonOrder: dto.order,
    moduleId: dto.moduleId,
    moduleTitle: dto.module.title,
  };
}

export function toModuleNotesAnalysis(dto: NotesAnalysisDTO): NotesAnalysis {
  return {
    aiCallId: dto.aiCallId,
    summary: dto.summary,
    keyConcepts: dto.keyConcepts,
    gaps: dto.gaps,
    suggestions: dto.suggestions,
    notesAnalyzed: dto.notesAnalyzed,
  };
}
