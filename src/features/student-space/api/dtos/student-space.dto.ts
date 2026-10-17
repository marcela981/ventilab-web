/*
* Funcionalidad: Student space DTOs
* Descripción: Backend contracts read by the student space (STUDENT): the home summary (`GET /api/me/summary` → MySummaryDTO with progress, grades, evaluations, notes, conversations, simulation sessions, reservations and the unread notifications count), the published grades (`GET /api/my-evaluations/grades` → MyEvaluationGradeDTO[]), the caller's notes (`GET /api/notes`, `GET /api/notes/modules/{moduleId}` → NoteDTO[]), the lesson detail used to place a note in its module (`GET /api/lessons/{id}` → LessonDetailDTO) and the notes analysis (`POST /api/notes/analyze` → NotesAnalysisDTO). All aliases of the generated OpenAPI schema. Depends on @shared/api-client.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type MySummaryDTO = Schemas["MySummaryDTO"];
export type MyProgressDTO = Schemas["MyProgressDTO"];
export type ProgressItemDTO = Schemas["ProgressItemDTO"];
export type MyGradeDTO = Schemas["MyGradeDTO"];
export type SummaryEvaluationDTO = Schemas["AnalyticsEvaluationDTO"];
export type MyNoteDTO = Schemas["MyNoteDTO"];
export type MyConversationDTO = Schemas["MyConversationDTO"];
export type MySimulationSessionDTO = Schemas["MySimulationSessionDTO"];
export type MyReservationDTO = Schemas["MyReservationDTO"];
export type MyEvaluationGradeDTO = Schemas["MyEvaluationGradeDTO"];
export type NoteDTO = Schemas["NoteDTO"];
export type LessonDetailDTO = Schemas["LessonDetailDTO"];
export type NotesAnalysisDTO = Schemas["NotesAnalysisDTO"];
