/*
* Funcionalidad: Progress mapper
* Descripción: Maps the progress DTOs to the progress entities, keeping the backend values as sent (no recalculation): summary and section progress indexed by id, level progress with its modules, module progress with per-lesson page progress (completed = completedByPages or completed). Depends on the progress DTOs and entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type {
  LessonProgress,
  LevelProgress,
  ModuleProgress,
  ProgressSummary,
  ProgressValue,
  SectionProgress,
} from "../../application/entities/progress.entity";
import type {
  LessonPageProgressDTO,
  LevelProgressDTO,
  ModuleProgressDTO,
  ProgressSummaryDTO,
  SectionProgressDTO,
} from "../dtos/progress.dto";

export function toProgressValue({ percentage, completedLessons, totalLessons, completed }: ProgressValue): ProgressValue {
  return { percentage, completedLessons, totalLessons, completed };
}

function indexBy<T extends ProgressValue>(items: T[], idOf: (item: T) => string): Map<string, ProgressValue> {
  return new Map(items.map((item) => [idOf(item), toProgressValue(item)]));
}

export function toProgressSummary(dto: ProgressSummaryDTO): ProgressSummary {
  return {
    overall: toProgressValue(dto),
    sections: indexBy(dto.sections, (item) => item.sectionId),
    levels: indexBy(dto.levels, (item) => item.levelId),
    modules: indexBy(dto.modules, (item) => item.moduleId),
  };
}

export function toSectionProgress(dto: SectionProgressDTO): SectionProgress {
  return { overall: toProgressValue(dto), levels: indexBy(dto.levels, (item) => item.levelId) };
}

export function toLevelProgress(dto: LevelProgressDTO): LevelProgress {
  return { overall: toProgressValue(dto), modules: indexBy(dto.modules, (item) => item.moduleId) };
}

function toLessonProgress(dto: LessonPageProgressDTO): LessonProgress {
  return {
    lessonId: dto.lessonId,
    viewedPages: dto.viewedPages,
    totalPages: dto.totalPages,
    completed: dto.completedByPages || dto.completed,
  };
}

export function toModuleProgress(dto: ModuleProgressDTO): ModuleProgress {
  return { overall: toProgressValue(dto), lessons: dto.lessons.map(toLessonProgress) };
}
