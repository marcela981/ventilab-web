/*
* Funcionalidad: Curriculum mapper
* Descripción: Maps the curriculum DTOs to the learning entities: the curriculum tree (sections, levels and modules sorted by `order`, lock state and missing prerequisites as the backend sends them), the lessons of a module and the Pages of a lesson (both sorted by `order`, so a Page's 1-based position is its [pageNumber]). Depends on the curriculum DTOs and entities. v1.1 (L3): toPageContent keeps the active blocks of a Page sorted by order (rendered with the shared ContentBlocks). v1.2 (W4, Bloque 2): keeps the level track, the section slug and the status of sections, levels and modules (they were dropped). v1.3 (W5, Bloque 2): toPageContent keeps the module title and level id of the Page; toLessonLock maps the lesson access response (null when allowed).
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type {
  CurriculumLevel,
  CurriculumModule,
  CurriculumSection,
  CurriculumTree,
  NamedRef,
} from "../../application/entities/curriculum.entity";
import type { LessonLock, LessonPage, LessonSummary, PageContent } from "../../application/entities/lesson.entity";
import type {
  CurriculumTreeDTO,
  LessonAccessDTO,
  ModuleLessonDTO,
  NamedReferenceDTO,
  PageDetailDTO,
  PageSummaryDTO,
  TreeLevelDTO,
  TreeModuleDTO,
  TreeSectionDTO,
} from "../dtos/curriculum.dto";

const byOrder = (a: { order: number }, b: { order: number }): number => a.order - b.order;

const toNamedRefs = (refs: NamedReferenceDTO[]): NamedRef[] => refs.map(({ id, title }) => ({ id, title }));

function toModule(dto: TreeModuleDTO): CurriculumModule {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    order: dto.order,
    lessonCount: dto.lessonCount,
    status: dto.status,
    locked: dto.locked,
    completed: dto.completed,
    missingPrerequisites: toNamedRefs(dto.missingPrerequisites),
  };
}

function toLevel(dto: TreeLevelDTO): CurriculumLevel {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    order: dto.order,
    sectionId: dto.sectionId,
    track: dto.track,
    status: dto.status,
    locked: dto.locked,
    completed: dto.completed,
    missingPrerequisites: toNamedRefs(dto.missingPrerequisites),
    modules: [...dto.modules].sort(byOrder).map(toModule),
  };
}

function toSection(dto: TreeSectionDTO): CurriculumSection {
  return {
    id: dto.id,
    slug: dto.slug,
    status: dto.status,
    title: dto.title,
    description: dto.description,
    order: dto.order,
    levels: [...dto.levels].sort(byOrder).map(toLevel),
  };
}

export function toCurriculumTree(dto: CurriculumTreeDTO): CurriculumTree {
  return {
    sections: [...dto.sections].sort(byOrder).map(toSection),
    unsectionedLevels: [...dto.unsectionedLevels].sort(byOrder).map(toLevel),
  };
}

export function toLessonSummaries(dtos: ModuleLessonDTO[]): LessonSummary[] {
  return [...dtos].sort(byOrder).map(({ id, title, order, pageCount }) => ({ id, title, order, pageCount }));
}

export function toLessonPages(dtos: PageSummaryDTO[]): LessonPage[] {
  return [...dtos].sort(byOrder).map(({ id, title, order }) => ({ id, title, order }));
}

// Null when the student may open the lesson; an unknown reason is read as "previous lessons missing".
export function toLessonLock(dto: LessonAccessDTO): LessonLock | null {
  if (dto.allowed) {
    return null;
  }

  return {
    reason: dto.reason === "module_locked" ? "module_locked" : "previous_lesson_incomplete",
    missing: dto.missing.map(({ lessonId, title }) => ({ lessonId, title })),
  };
}

export function toPageContent(dto: PageDetailDTO): PageContent {
  return {
    id: dto.id,
    title: dto.title,
    lessonId: dto.lessonId,
    moduleId: dto.moduleId,
    moduleTitle: dto.module.title,
    levelId: dto.module.levelId,
    blocks: dto.sections
      .filter((section) => section.isActive)
      .sort(byOrder)
      .map(({ id, type, title, content, mediaId, mediaUrl }) => ({ id, type, title, content, mediaId, mediaUrl })),
  };
}
