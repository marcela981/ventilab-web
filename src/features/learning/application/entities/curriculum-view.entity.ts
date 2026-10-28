/*
* Funcionalidad: Curriculum view selectors
* Descripción: Pure selectors of the Currículo tab of /learn (W4, Bloque 2; DISENO_BLOQUE2 §2.4, §2.5 and decisions 2 and 3 of §7b). (1) The three July accordions, split in the client and in the July order VentyLab, Prerequisitos (optional) and Mecánica respiratoria (open by default): the level `level-prerequisitos` goes to Prerequisitos, levels whose track is `ventylab` to VentyLab and every other level (track `mecanica` or unknown) to Mecánica, so no level is ever lost; levels keep the curriculum order (sections by order, then levels without section). Students only see published levels and modules; staff also see drafts (archived content is never shown). (2) The accordion that `?section=` opens: an accordion key (also July's `prerequisitos`), a track, a level id (the accordion that holds it) or a section id or slug (its slug when it names an accordion, otherwise the accordion of its first visible level); anything else gives null (the default accordion). (3) The card state of a module: coming_soon (published module whose lessonCount is 0; the backend counts only published lessons with published pages), completed, locked (module or its level), in-progress (some lessons completed) or available; staff are never locked nor coming_soon (they preview everything). (4) The lock text of a level: "Completa el nivel anterior para desbloquear" when what is missing is the previous level of the same accordion (or the backend names nothing), otherwise the missing prerequisites by name. (5) The module progress of a level (completed / total visible modules, the percentage from the backend summary when known). Depends on the curriculum and progress entities.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { CurriculumLevel, CurriculumModule, CurriculumTree } from "./curriculum.entity";
import type { ProgressValue } from "./progress.entity";

export const CURRICULUM_ACCORDIONS = ["ventylab", "prerrequisitos", "mecanica"] as const;

export type CurriculumAccordionKey = (typeof CURRICULUM_ACCORDIONS)[number];

export const DEFAULT_OPEN_ACCORDION: CurriculumAccordionKey = "mecanica";

export const PREREQUISITES_LEVEL_ID = "level-prerequisitos";

const VENTYLAB_TRACK = "ventylab";

// Other spellings accepted in ?section= (July used "prerequisitos").
const ACCORDION_ALIASES: Record<string, CurriculumAccordionKey> = {
  ventylab: "ventylab",
  prerrequisitos: "prerrequisitos",
  prerequisitos: "prerrequisitos",
  mecanica: "mecanica",
};

export type CurriculumAccordions = Record<CurriculumAccordionKey, CurriculumLevel[]>;

export function accordionOfLevel(level: CurriculumLevel): CurriculumAccordionKey {
  if (level.id === PREREQUISITES_LEVEL_ID) {
    return "prerrequisitos";
  }

  return level.track === VENTYLAB_TRACK ? "ventylab" : "mecanica";
}

function isVisible(status: CurriculumLevel["status"], isStaff: boolean): boolean {
  return status === "PUBLISHED" || (isStaff && status === "DRAFT");
}

// Levels in curriculum order with only the content the viewer may see.
function visibleLevels(tree: CurriculumTree, isStaff: boolean): CurriculumLevel[] {
  return [...tree.sections.flatMap((section) => section.levels), ...tree.unsectionedLevels]
    .filter((level) => isVisible(level.status, isStaff))
    .map((level) => ({ ...level, modules: level.modules.filter((module) => isVisible(module.status, isStaff)) }));
}

export function groupLevelsIntoAccordions(tree: CurriculumTree, isStaff: boolean): CurriculumAccordions {
  const groups: CurriculumAccordions = { ventylab: [], prerrequisitos: [], mecanica: [] };

  for (const level of visibleLevels(tree, isStaff)) {
    groups[accordionOfLevel(level)].push(level);
  }

  return groups;
}

export function resolveAccordionKey(value: unknown, tree: CurriculumTree | null): CurriculumAccordionKey | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  const alias = ACCORDION_ALIASES[value.toLowerCase()];

  if (alias) {
    return alias;
  }

  if (!tree) {
    return null;
  }

  const levels = [...tree.sections.flatMap((section) => section.levels), ...tree.unsectionedLevels];
  const level = levels.find((item) => item.id === value);

  if (level) {
    return accordionOfLevel(level);
  }

  const section = tree.sections.find((item) => item.id === value || item.slug === value);

  if (!section) {
    return null;
  }

  const bySlug = ACCORDION_ALIASES[section.slug.toLowerCase()];
  const firstLevel = section.levels.find((item) => item.id !== PREREQUISITES_LEVEL_ID) ?? section.levels[0];

  return bySlug ?? (firstLevel ? accordionOfLevel(firstLevel) : null);
}

export type ModuleCardState = "completed" | "in-progress" | "available" | "locked" | "coming_soon";

export function isComingSoon(module: CurriculumModule): boolean {
  return module.status === "PUBLISHED" && module.lessonCount === 0;
}

export function isDraft(item: { status: CurriculumModule["status"] }): boolean {
  return item.status === "DRAFT";
}

export type ModuleCardStateInput = {
  module: CurriculumModule
  levelLocked: boolean
  progress: ProgressValue | null
  isStaff: boolean
};

export function moduleCardState({ module, levelLocked, progress, isStaff }: ModuleCardStateInput): ModuleCardState {
  if (!isStaff && isComingSoon(module)) {
    return "coming_soon";
  }

  if (module.completed || progress?.completed === true) {
    return "completed";
  }

  if (!isStaff && (module.locked || levelLocked)) {
    return "locked";
  }

  return (progress?.completedLessons ?? 0) > 0 ? "in-progress" : "available";
}

/** Whether the card button navigates (only the button does; locked and coming-soon cards cannot be opened). */
export function canOpenModule(state: ModuleCardState): boolean {
  return state !== "locked" && state !== "coming_soon";
}

// TODO(i18n): move to a learning namespace in src/i18n.
export const LEVEL_LOCK_COPY = {
  previousLevel: "Completa el nivel anterior para desbloquear",
  missing: (titles: string[]) => `Para desbloquear este nivel, completa: ${titles.join(", ")}`,
} as const;

/** Lock text of a level for a student, or null when it is not locked. `previous` is the level before it in its accordion. */
export function levelLockText(level: CurriculumLevel, previous: CurriculumLevel | null): string | null {
  if (!level.locked) {
    return null;
  }

  const missing = level.missingPrerequisites;
  const onlyPrevious = missing.length === 1 && previous !== null && missing[0]?.id === previous.id;

  return missing.length === 0 || onlyPrevious ? LEVEL_LOCK_COPY.previousLevel : LEVEL_LOCK_COPY.missing(missing.map(({ title }) => title));
}

export type LevelModuleProgress = {
  completedModules: number
  totalModules: number
  percentage: number
};

/**
 * Completed / total modules of a level over the modules the viewer sees (coming-soon modules count: they are part of
 * the level). The percentage is the backend lesson-weighted one when the summary has the level; otherwise the share
 * of completed modules.
 */
export function levelModuleProgress(level: CurriculumLevel, summary: ProgressValue | null, moduleCompleted: (module: CurriculumModule) => boolean): LevelModuleProgress {
  const totalModules = level.modules.length;
  const completedModules = level.modules.filter(moduleCompleted).length;
  const fallback = totalModules > 0 ? Math.floor((completedModules / totalModules) * 100) : 0;
  const percentage = Math.min(100, Math.max(0, Math.round(summary?.percentage ?? fallback)));

  return { completedModules, totalModules, percentage };
}

export type LevelStatus = "completed" | "in-progress" | "not-started" | "locked";

export function levelStatus(level: CurriculumLevel, progress: LevelModuleProgress, isStaff: boolean): LevelStatus {
  if (level.locked && !isStaff) {
    return "locked";
  }

  if (level.completed || (progress.totalModules > 0 && progress.completedModules === progress.totalModules)) {
    return "completed";
  }

  return progress.percentage > 0 || progress.completedModules > 0 ? "in-progress" : "not-started";
}
