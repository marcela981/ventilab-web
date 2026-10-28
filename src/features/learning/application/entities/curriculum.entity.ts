/*
* Funcionalidad: Curriculum entity
* Descripción: Frontend model of the student curriculum tree (sections -> levels -> modules, plus levels without section) with the backend lock state (locked, missingPrerequisites, completed), and pure helpers: locate a section, level or module with its parents (breadcrumb and locks), resolve the links of missing prerequisites (level -> its section anchor, module -> its page; references the tree does not know get no link) and pick the module for "Continuar donde quedé" (first unlocked, not completed module in curriculum order; preview mode ignores locks). v1.1 (L3): findNextModule takes excludeModuleId, so the module completion screen never proposes the module just completed while the backend tree still reports it as not completed. Depends on learning-urls. v1.2 (W3, Bloque 2): level prerequisite links open the Currículo tab at the level (buildLevelUrl without section).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { buildLevelUrl, buildModuleUrl } from "./learning-urls";

export type NamedRef = {
  id: string
  title: string
};

export type PrerequisiteLink = NamedRef & {
  href: string | null
};

export type CurriculumModule = {
  id: string
  title: string
  description: string | null
  order: number
  lessonCount: number
  locked: boolean
  completed: boolean
  missingPrerequisites: NamedRef[]
};

export type CurriculumLevel = {
  id: string
  title: string
  description: string | null
  order: number
  sectionId: string | null
  locked: boolean
  completed: boolean
  missingPrerequisites: NamedRef[]
  modules: CurriculumModule[]
};

export type CurriculumSection = {
  id: string
  title: string
  description: string | null
  order: number
  levels: CurriculumLevel[]
};

export type CurriculumTree = {
  sections: CurriculumSection[]
  unsectionedLevels: CurriculumLevel[]
};

export type LevelLocation = {
  section: CurriculumSection | null
  level: CurriculumLevel
};

export type ModuleLocation = LevelLocation & {
  module: CurriculumModule
};

export function findSection(tree: CurriculumTree, sectionId: string): CurriculumSection | null {
  return tree.sections.find((section) => section.id === sectionId) ?? null;
}

// Every level in curriculum order: sectioned levels first, then the levels without section.
function levelLocations(tree: CurriculumTree): LevelLocation[] {
  return [
    ...tree.sections.flatMap((section) => section.levels.map((level) => ({ section, level }))),
    ...tree.unsectionedLevels.map((level) => ({ section: null, level })),
  ];
}

export function locateLevel(tree: CurriculumTree, levelId: string): LevelLocation | null {
  return levelLocations(tree).find(({ level }) => level.id === levelId) ?? null;
}

export function locateModule(tree: CurriculumTree, moduleId: string): ModuleLocation | null {
  for (const location of levelLocations(tree)) {
    const found = location.level.modules.find((module) => module.id === moduleId);

    if (found) {
      return { ...location, module: found };
    }
  }

  return null;
}

export function levelPrerequisiteLinks(tree: CurriculumTree, prerequisites: NamedRef[]): PrerequisiteLink[] {
  return prerequisites.map((prerequisite) => {
    const known = locateLevel(tree, prerequisite.id) !== null;

    return { ...prerequisite, href: known ? buildLevelUrl(prerequisite.id) : null };
  });
}

export function modulePrerequisiteLinks(tree: CurriculumTree, prerequisites: NamedRef[]): PrerequisiteLink[] {
  return prerequisites.map((prerequisite) => ({
    ...prerequisite,
    href: locateModule(tree, prerequisite.id) ? buildModuleUrl(prerequisite.id) : null,
  }));
}

export type FindNextModuleOptions = {
  ignoreLocks: boolean
  excludeModuleId?: string
};

export function findNextModule(tree: CurriculumTree, { ignoreLocks, excludeModuleId }: FindNextModuleOptions): CurriculumModule | null {
  for (const { level } of levelLocations(tree)) {
    if (level.locked && !ignoreLocks) {
      continue;
    }

    const next = level.modules.find((module) => module.id !== excludeModuleId && !module.completed && (ignoreLocks || !module.locked));

    if (next) {
      return next;
    }
  }

  return null;
}
