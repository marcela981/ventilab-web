/*
* Funcionalidad: Student space DTOs
* Descripción: Backend contracts read by the student space (STUDENT): the home summary (`GET /api/me/summary` → MySummaryDTO with progress, grades, evaluations, notes, conversations, simulation sessions, reservations and the unread notifications count), the published grades (`GET /api/my-evaluations/grades` → MyEvaluationGradeDTO[]), the caller's notes (`GET /api/notes` → NoteDTO[] with moduleId, lessonTitle and pageTitle) and the notes analysis (`POST /api/notes/analyze` → NotesAnalysisDTO). All aliases of the generated OpenAPI schema. v1.2 (B3.10): unused aliases removed (MyProgressDTO). Depends on @shared/api-client. v1.1 (B2 closure): LessonDetailDTO removed (no lesson read places a note anymore). v1.3 (W8, Bloque 2): MyContinueLearningDTO (the summary continueLearning).
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type MySummaryDTO = Schemas["MySummaryDTO"];
export type MyContinueLearningDTO = Schemas["MyContinueLearningDTO"];
export type ProgressItemDTO = Schemas["ProgressItemDTO"];
export type MyGradeDTO = Schemas["MyGradeDTO"];
export type SummaryEvaluationDTO = Schemas["AnalyticsEvaluationDTO"];
export type MyNoteDTO = Schemas["MyNoteDTO"];
export type MyConversationDTO = Schemas["MyConversationDTO"];
export type MySimulationSessionDTO = Schemas["MySimulationSessionDTO"];
export type MyReservationDTO = Schemas["MyReservationDTO"];
export type MyEvaluationGradeDTO = Schemas["MyEvaluationGradeDTO"];
export type NoteDTO = Schemas["NoteDTO"];
export type NotesAnalysisDTO = Schemas["NotesAnalysisDTO"];
