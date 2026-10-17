/*
* Funcionalidad: Student space service
* Descripción: API path constants of the student space (STUDENT), read with useApiQuery: the home summary (`GET /api/me/summary`, one request for the whole /me page), the published grades (`GET /api/my-evaluations/grades`, full list without pagination), the caller's notes (`GET /api/notes` and `GET /api/notes/modules/{moduleId}`, both paginated with page, limit and sortOrder) and the lesson read that places a note in its module (`GET /api/lessons/{id}`). analyzeModuleNotes runs `POST /api/notes/analyze` with a moduleId (slow AI timeout). Depends on the api-client request helpers and the student space mappers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { apiPost } from "@shared/api-client/api-request";
import type { NotesAnalysis } from "@features/learning";
import { toModuleNotesAnalysis } from "../mappers/my-notes.mapper";

export const ME_SUMMARY_PATH = "/api/me/summary";
export const MY_GRADES_PATH = "/api/my-evaluations/grades";
export const NOTES_PATH = "/api/notes";
export const MODULE_NOTES_PATH = "/api/notes/modules/{moduleId}";
export const LESSON_DETAIL_PATH = "/api/lessons/{id}";

export async function analyzeModuleNotes(moduleId: string): Promise<NotesAnalysis> {
  const result = await apiPost("/api/notes/analyze", { body: { moduleId }, timeout: "slow" });

  return toModuleNotesAnalysis(result.data);
}
