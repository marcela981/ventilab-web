/*
* Funcionalidad: Progress DTOs
* Descripción: Response types of the learning progress endpoints, taken from the generated OpenAPI schema: summary (`GET /api/progress/summary`), section (`/api/progress/sections/{sectionId}`), level (`/api/progress/levels/{levelId}`), module (`/api/progress/modules/{moduleId}`, with per-lesson viewedPages / totalPages / completedByPages) and the page-view result (`POST /api/progress/pages/{pageId}/view`). Types only.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type ProgressSummaryDTO = Schemas["LearningProgressSummaryDTO"];

export type SectionProgressDTO = Schemas["SectionLearningProgressDTO"];

export type LevelProgressDTO = Schemas["LevelLearningProgressDTO"];

export type ModuleProgressDTO = Schemas["ModuleLearningProgressDTO"];

export type LessonPageProgressDTO = Schemas["LessonPageProgressDTO"];

export type PageViewResultDTO = Schemas["PageViewResultDTO"];
