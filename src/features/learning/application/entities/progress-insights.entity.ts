/*
* Funcionalidad: Mi Progreso selectors
* Descripción: Pure selectors of the Mi Progreso tab of /learn (W9, Bloque 2; DISENO_BLOQUE2 §2.11 and decision 4 of §7b). (1) levelBar: the bar of the current level from the server stats only: the span of a level comes from the documented formula (level = ⌊xp/500⌋ + 1, so nextLevelXp − (level − 1) × 500 = 500; ventylab-server docs/bloque2/reglas-gamificacion.md §3) and the percentage is xpIntoLevel / span; no XP is computed. (2) Milestones and the skill tree, DERIVED from the curriculum tree and the progress summary (no static endpoint, no XP): a milestone is a published level with lessons (achieved when the level is complete, percentage from the summary); the skill tree groups the published levels into the three July branches of the Currículo tab (VentyLab, Prerequisitos, Mecánica respiratoria), each level with its completion and state and each branch with its lesson-weighted completion. The activity calendar selectors live in activity-calendar.entity (the workspace warm-up needs them without the curriculum code). Depends on the curriculum, curriculum view, progress and gamification entities.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { CurriculumLevel, CurriculumTree } from "./curriculum.entity";
import { CURRICULUM_ACCORDIONS, groupLevelsIntoAccordions } from "./curriculum-view.entity";
import type { CurriculumAccordionKey } from "./curriculum-view.entity";
import type { GamificationStats } from "./gamification.entity";
import type { ProgressSummary, ProgressValue } from "./progress.entity";

// XP per level of the server formula (level = ⌊xp / 500⌋ + 1).
export const LEVEL_XP_SPAN = 500;

export type LevelBar = {
  level: number
  nextLevel: number
  xpIntoLevel: number
  span: number
  percent: number
};

function boundedPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function levelBar(stats: GamificationStats): LevelBar {
  // nextLevelXp is the total XP where the next level starts (level × 500), so this is the span of the current level.
  const span = stats.nextLevelXp - (stats.level - 1) * LEVEL_XP_SPAN;

  return {
    level: stats.level,
    nextLevel: stats.level + 1,
    xpIntoLevel: stats.xpIntoLevel,
    span,
    percent: span > 0 ? boundedPercent((stats.xpIntoLevel / span) * 100) : 0,
  };
}

export type Milestone = {
  id: string
  title: string
  percentage: number
  completedLessons: number
  totalLessons: number
  achieved: boolean
};

// Published levels in the order of the Currículo branches (VentyLab, Prerequisitos, Mecánica respiratoria).
function branchLevels(tree: CurriculumTree): Array<{ key: CurriculumAccordionKey, levels: CurriculumLevel[] }> {
  const groups = groupLevelsIntoAccordions(tree, false);

  return CURRICULUM_ACCORDIONS.map((key) => ({ key, levels: groups[key] }));
}

function levelCompleted(level: CurriculumLevel, value: ProgressValue | undefined): boolean {
  return level.completed || value?.completed === true;
}

export function deriveMilestones(tree: CurriculumTree, progress: ProgressSummary | null): Milestone[] {
  return branchLevels(tree).flatMap(({ levels }) => levels).flatMap((level) => {
    const value = progress?.levels.get(level.id);

    if (!value || value.totalLessons === 0) {
      return [];
    }

    const achieved = levelCompleted(level, value);

    return [{
      id: level.id,
      title: level.title,
      percentage: achieved ? 100 : boundedPercent(value.percentage),
      completedLessons: value.completedLessons,
      totalLessons: value.totalLessons,
      achieved,
    }];
  });
}

export type SkillState = "completed" | "in-progress" | "locked" | "not-started";

export type SkillLevel = {
  id: string
  title: string
  percentage: number
  state: SkillState
};

export type SkillBranch = {
  key: CurriculumAccordionKey
  percentage: number
  levels: SkillLevel[]
};

function skillLevel(level: CurriculumLevel, value: ProgressValue | undefined): SkillLevel {
  const completed = levelCompleted(level, value);
  let state: SkillState = "not-started";

  if (completed) {
    state = "completed";
  } else if (level.locked) {
    state = "locked";
  } else if ((value?.completedLessons ?? 0) > 0) {
    state = "in-progress";
  }

  return { id: level.id, title: level.title, percentage: completed ? 100 : boundedPercent(value?.percentage ?? 0), state };
}

export function deriveSkillTree(tree: CurriculumTree, progress: ProgressSummary | null): SkillBranch[] {
  return branchLevels(tree)
    .filter(({ levels }) => levels.length > 0)
    .map(({ key, levels }) => {
      const values = levels.map((level) => progress?.levels.get(level.id));
      const total = values.reduce((sum, value) => sum + (value?.totalLessons ?? 0), 0);
      const completed = values.reduce((sum, value) => sum + (value?.completedLessons ?? 0), 0);

      return {
        key,
        percentage: total > 0 ? boundedPercent((completed / total) * 100) : 0,
        levels: levels.map((level, index) => skillLevel(level, values[index])),
      };
    });
}
