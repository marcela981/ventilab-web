/*
* Funcionalidad: Curriculum mapper
* Descripción: Maps the curriculum DTOs to the learning entities: the curriculum tree (sections, levels and modules sorted by `order`, lock state and missing prerequisites as the backend sends them), the lessons of a module and the Pages of a lesson (both sorted by `order`, so a Page's 1-based position is its [pageNumber]). Depends on the curriculum DTOs and entities. v1.1 (L3): toPageContent keeps the active blocks of a Page sorted by order (rendered with the shared ContentBlocks).
* Versión: 1.1
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
import type { LessonPage, LessonSummary, PageContent } from "../../application/entities/lesson.entity";
import type {
  CurriculumTreeDTO,
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
    locked: dto.locked,
    completed: dto.completed,
    missingPrerequisites: toNamedRefs(dto.missingPrerequisites),
    modules: [...dto.modules].sort(byOrder).map(toModule),
  };
}

function toSection(dto: TreeSectionDTO): CurriculumSection {
  return {
    id: dto.id,
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

export function toPageContent(dto: PageDetailDTO): PageContent {
  return {
    id: dto.id,
    title: dto.title,
    lessonId: dto.lessonId,
    moduleId: dto.moduleId,
    blocks: dto.sections
      .filter((section) => section.isActive)
      .sort(byOrder)
      .map(({ id, type, title, content, mediaId, mediaUrl }) => ({ id, type, title, content, mediaId, mediaUrl })),
  };
}
