/*
* Funcionalidad: Curriculum DTOs
* Descripción: Response types of the curriculum read endpoints used by the learning feature, taken from the generated OpenAPI schema: the student curriculum tree (`GET /api/curriculum/tree` -> sections -> levels -> modules with locked / missingPrerequisites / completed, plus unsectionedLevels), the lessons of a module (`GET /api/modules/{id}/lessons`) the Pages of a lesson (`GET /api/pages?lessonId=`) and, v1.1 (L3), one Page with its blocks (`GET /api/pages/{id}`: PageDTO with `sections` = PageSectionDTO[]). Types only.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type CurriculumTreeDTO = Schemas["StudentCurriculumTreeDTO"];

export type TreeSectionDTO = Schemas["StudentTreeSectionDTO"];

export type TreeLevelDTO = Schemas["StudentTreeLevelDTO"];

export type TreeModuleDTO = Schemas["StudentTreeModuleDTO"];

export type NamedReferenceDTO = Schemas["NamedReferenceDTO"];

export type ModuleLessonDTO = Schemas["ModuleLessonDTO"];

export type PageSummaryDTO = Schemas["PageSummaryDTO"];

export type PageDetailDTO = Schemas["PageDTO"];

export type PageSectionDTO = Schemas["PageSectionDTO"];
