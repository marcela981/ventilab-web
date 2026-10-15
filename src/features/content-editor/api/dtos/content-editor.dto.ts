/*
* Funcionalidad: Content editor DTOs
* Descripción: Backend shapes used by the content editor, taken from the generated OpenAPI schema: sections (GET /api/sections), levels with their sectionId (GET /api/levels), the staff curriculum tree (GET /api/teaching/tree: levels > modules > lessons, no sections and no pages), lesson page summaries (GET /api/pages?lessonId=) and the create/update request bodies of sections, levels, modules, lessons and pages. Depends on @shared/api-client generated types. v1.1 (C3): level prerequisites (GET /api/levels/{id}/prerequisites: prerequisites and dependent levels), module detail (GET /api/modules/{id}: prerequisites and dependent modules) and the replace bodies of both (PUT .../prerequisites). v1.2 (C4): the page with its blocks for the page editor (GET /api/pages/{id}: PageDTO, blocks = `sections` PageSectionDTO[]) and the block request bodies (POST/PUT /api/pages/{id}/blocks[/{blockId}], PUT /api/pages/{id}/blocks/reorder).
* Versión: 1.2 (C4)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { components } from "@shared/api-client/generated/schema";

type Schemas = components["schemas"];

export type SectionDTO = Schemas["SectionDTO"];

export type LevelDTO = Schemas["LevelDTO"];

export type TreeLevelDTO = Schemas["CurriculumTreeLevelDTO"];

export type TreeModuleDTO = Schemas["CurriculumTreeModuleDTO"];

export type TreeLessonDTO = Schemas["CurriculumTreeLessonDTO"];

export type PageSummaryDTO = Schemas["PageSummaryDTO"];

export type ContentStatusDTO = SectionDTO["status"];

export type CreateSectionDTO = Schemas["CreateSectionDTO"];

export type UpdateSectionDTO = Schemas["UpdateSectionDTO"];

export type CreateLevelDTO = Schemas["CreateLevelDTO"];

export type UpdateLevelDTO = Schemas["UpdateLevelDTO"];

export type CreateModuleDTO = Schemas["CreateModuleDTO"];

export type UpdateModuleDTO = Schemas["UpdateModuleDTO"];

export type CreateLessonDTO = Schemas["CreateLessonDTO"];

export type UpdateLessonDTO = Schemas["UpdateLessonDTO"];

export type CreatePageDTO = Schemas["CreatePageDTO"];

export type UpdatePageDTO = Schemas["UpdatePageDTO"];

export type LevelPrerequisitesDTO = Schemas["LevelPrerequisitesDTO"];

export type LevelPrerequisiteItemDTO = Schemas["LevelPrerequisiteItemDTO"];

export type ModuleDetailDTO = Schemas["ModuleDetailDTO"];

export type SetLevelPrerequisitesDTO = Schemas["SetLevelPrerequisitesDTO"];

export type SetModulePrerequisitesDTO = Schemas["SetModulePrerequisitesDTO"];

export type PageDTO = Schemas["PageDTO"];

export type PageBlockDTO = Schemas["PageSectionDTO"];

export type CreatePageBlockDTO = Schemas["CreatePageBlockDTO"];

export type UpdatePageBlockDTO = Schemas["UpdatePageBlockDTO"];

export type ReorderItemsDTO = Schemas["ReorderItemsDTO"];
