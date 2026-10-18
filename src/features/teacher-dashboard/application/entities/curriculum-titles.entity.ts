/*
* Funcionalidad: Curriculum titles and progress tree
* Descripción: Titles and curriculum order of sections, levels and modules (read from `GET /api/curriculum/tree`, whose progress flags are ignored) used to label the progress items of the analytics and progress endpoints, which carry ids only. buildProgressTree nests the learning progress summary of one student (sections → levels → modules, linked by the sectionId / levelId the API returns) in curriculum order with the API percentages untouched; items missing from the tree keep a generic title and go last. toModuleProgressSeries lists one student's module percentages in curriculum order for the chart. v1.1 (O3 review): modules without a level (levelId null) or whose level is not in the summary are no longer dropped; they go to a last "Módulos sin nivel" bucket (a SectionNode with direct modules). v1.2 (closure B2): toGroupModuleSeries lists the group's API module averages (moduleSummary) in curriculum order for the group chart. Depends on nothing at runtime.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ModuleSummary, ProgressItem } from "./teacher-dashboard.entity";

export type CurriculumEntry = {
  title: string
  rank: number
};

export type CurriculumTitles = {
  sections: ReadonlyMap<string, CurriculumEntry>
  levels: ReadonlyMap<string, CurriculumEntry>
  modules: ReadonlyMap<string, CurriculumEntry>
};

export const EMPTY_CURRICULUM_TITLES: CurriculumTitles = { sections: new Map(), levels: new Map(), modules: new Map() };

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const UNTITLED = {
  section: "Sección sin título",
  level: "Nivel sin título",
  module: "Módulo sin título",
  unsectioned: "Niveles sin sección",
  unleveled: "Módulos sin nivel",
} as const;

export type ProgressValues = Omit<ProgressItem, "id">;

export type SummaryModule = ProgressValues & { moduleId: string, levelId: string | null };
export type SummaryLevel = ProgressValues & { levelId: string, sectionId: string | null };
export type SummarySection = ProgressValues & { sectionId: string };

export type LearningSummary = {
  overall: ProgressValues
  sections: SummarySection[]
  levels: SummaryLevel[]
  modules: SummaryModule[]
};

export type ModuleNode = ProgressValues & { id: string, title: string };
export type LevelNode = ProgressValues & { id: string, title: string, modules: ModuleNode[] };
export type SectionNode = { id: string | null, title: string, progress: ProgressValues | null, levels: LevelNode[], modules: ModuleNode[] };

export type ModuleProgressPoint = {
  moduleId: string
  title: string
  percentage: number
};

const LAST = Number.MAX_SAFE_INTEGER;

function rankOf(map: ReadonlyMap<string, CurriculumEntry>, id: string | null): number {
  return id === null ? LAST : (map.get(id)?.rank ?? LAST);
}

function byRank<T>(map: ReadonlyMap<string, CurriculumEntry>, idOf: (item: T) => string | null) {
  return (a: T, b: T) => rankOf(map, idOf(a)) - rankOf(map, idOf(b));
}

function values(item: ProgressValues): ProgressValues {
  return { percentage: item.percentage, completedLessons: item.completedLessons, totalLessons: item.totalLessons, completed: item.completed };
}

export function moduleTitle(titles: CurriculumTitles, moduleId: string | null): string {
  return (moduleId ? titles.modules.get(moduleId)?.title : undefined) ?? UNTITLED.module;
}

export function sectionTitle(titles: CurriculumTitles, sectionId: string | null): string {
  return (sectionId ? titles.sections.get(sectionId)?.title : undefined) ?? UNTITLED.section;
}

export function levelTitle(titles: CurriculumTitles, levelId: string | null): string {
  return (levelId ? titles.levels.get(levelId)?.title : undefined) ?? UNTITLED.level;
}

export function buildProgressTree(summary: LearningSummary, titles: CurriculumTitles): SectionNode[] {
  const modulesByLevel = new Map<string, ModuleNode[]>();

  for (const item of [...summary.modules].sort(byRank(titles.modules, (entry: SummaryModule) => entry.moduleId))) {
    const key = item.levelId ?? "";
    const list = modulesByLevel.get(key) ?? [];

    list.push({ id: item.moduleId, title: moduleTitle(titles, item.moduleId), ...values(item) });
    modulesByLevel.set(key, list);
  }

  const levelsBySection = new Map<string, LevelNode[]>();

  for (const level of [...summary.levels].sort(byRank(titles.levels, (item: SummaryLevel) => item.levelId))) {
    const key = level.sectionId ?? "";
    const list = levelsBySection.get(key) ?? [];

    list.push({ id: level.levelId, title: levelTitle(titles, level.levelId), ...values(level), modules: modulesByLevel.get(level.levelId) ?? [] });
    levelsBySection.set(key, list);
  }

  const sections: SectionNode[] = [...summary.sections]
    .sort(byRank(titles.sections, (item: SummarySection) => item.sectionId))
    .map((section) => ({
      id: section.sectionId,
      title: sectionTitle(titles, section.sectionId),
      progress: values(section),
      levels: levelsBySection.get(section.sectionId) ?? [],
      modules: [],
    }));
  const unsectioned = levelsBySection.get("") ?? [];
  const knownLevels = new Set(summary.levels.map((level) => level.levelId));
  const unleveled = [...modulesByLevel.entries()]
    .filter(([levelId]) => !knownLevels.has(levelId))
    .flatMap(([, modules]) => modules)
    .sort(byRank(titles.modules, (entry: ModuleNode) => entry.id));
  const tree: SectionNode[] = unsectioned.length > 0
    ? [...sections, { id: null, title: UNTITLED.unsectioned, progress: null, levels: unsectioned, modules: [] }]
    : sections;

  return unleveled.length > 0 ? [...tree, { id: null, title: UNTITLED.unleveled, progress: null, levels: [], modules: unleveled }] : tree;
}

/** The group's average module progress computed by the API (`moduleSummary`), in curriculum order; the API title wins over the tree title. */
export function toGroupModuleSeries(summary: readonly ModuleSummary[], titles: CurriculumTitles): ModuleProgressPoint[] {
  return [...summary]
    .sort(byRank(titles.modules, (item: ModuleSummary) => item.moduleId))
    .map((item) => ({ moduleId: item.moduleId, title: item.moduleTitle ?? moduleTitle(titles, item.moduleId), percentage: item.averageProgressPct }));
}

/** One student's module percentages exactly as the API returns them, in curriculum order (no aggregation). */
export function toModuleProgressSeries(modules: readonly ProgressItem[], titles: CurriculumTitles): ModuleProgressPoint[] {
  return modules
    .filter((item): item is ProgressItem & { id: string } => item.id !== null)
    .sort(byRank(titles.modules, (item: ProgressItem) => item.id))
    .map((item) => ({ moduleId: item.id, title: moduleTitle(titles, item.id), percentage: item.percentage }));
}
