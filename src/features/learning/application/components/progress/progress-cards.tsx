/*
* Funcionalidad: Mi Progreso cards
* Descripción: Cards of the Mi Progreso tab (W9, Bloque 2; July XpLevelCard, StreakCard, Achievements, Milestones and SkillTree, with real data): "Nivel {n}" with the total XP and the bar of the current level (levelBar: xpIntoLevel over the level span of the documented formula, labelled with both values and the next level); "Racha consecutiva" with the current and longest streak from the server ("Activa" while the streak runs); "Logros (n)" with the unlocked achievements only (the backend exposes no locked catalog), each with its icon, description, unlock date and XP reward; "Hitos" (published levels with lessons: completion bar, "Alcanzado" when complete) and "Árbol de Habilidades" (the three Currículo branches with their completion and each level with its bar and state), both derived from the curriculum. Every list card has a July empty state. Nothing is computed beyond formatting server values. Depends on MUI, the student home SummaryCard, the design-system empty state, @shared/lib, the gamification entity, the Mi Progreso selectors, the Currículo copy and the Mi Progreso styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import StarIcon from "@mui/icons-material/Star";
import LinearProgress from "@mui/material/LinearProgress";
import { SummaryCard } from "@features/student-space/home.entry";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { cx } from "@shared/lib/class-names";
import { formatDate } from "@shared/lib/format";
import type { CurriculumAccordionKey } from "../../entities/curriculum-view.entity";
import type { Achievement, GamificationStats } from "../../entities/gamification.entity";
import { levelBar } from "../../entities/progress-insights.entity";
import type { Milestone, SkillBranch, SkillState } from "../../entities/progress-insights.entity";
import styles from "../../../UI/progress.module.css";

const numberFormatter = new Intl.NumberFormat("es-CO");
const days = (count: number): string => (count === 1 ? "1 día" : `${count} días`);

// TODO(i18n): move to a learning namespace in src/i18n. Texts from the July progress cards.
export const PROGRESS_CARDS_COPY = {
  level: (level: number) => `Nivel ${level}`,
  xpTotal: (xp: number) => `${numberFormatter.format(xp)} XP`,
  levelAria: (percent: number) => `Progreso al siguiente nivel: ${percent}%`,
  levelSpan: (into: number, span: number, nextLevel: number) =>
    `${numberFormatter.format(into)} / ${numberFormatter.format(span)} XP para el nivel ${nextLevel}`,
  streakTitle: "Racha consecutiva",
  streakValue: days,
  streakActive: "Activa",
  longestStreak: (count: number) => `Racha más larga: ${days(count)}`,
  achievementsTitle: (count: number) => `Logros (${count})`,
  achievementsEmptyTitle: "Aún no has obtenido logros",
  achievementsEmptyDescription: "Los logros aparecerán conforme avances en tu aprendizaje.",
  unlockedAt: (date: string) => `Obtenido el ${date}`,
  reward: (xp: number) => `+${numberFormatter.format(xp)} XP`,
  milestonesTitle: "Hitos",
  milestonesEmptyTitle: "Aún no hay hitos",
  milestonesEmptyDescription: "Completa lecciones para alcanzar hitos.",
  milestoneAria: (title: string) => `Progreso del hito ${title}`,
  milestoneValue: (percent: number, completed: number, total: number) => `${percent} % · ${completed} de ${total} lecciones`,
  milestoneAchieved: "Alcanzado",
  skillTreeTitle: "Árbol de Habilidades",
  skillTreeEmptyTitle: "Aún no has desbloqueado habilidades",
  skillTreeEmptyDescription: "Cuando haya niveles publicados verás aquí tu avance por rama.",
  branchValue: (percent: number) => `${percent} %`,
  skillAria: (title: string) => `Progreso de la habilidad ${title}`,
  skillStates: {
    completed: "Completado",
    "in-progress": "En progreso",
    locked: "Bloqueado",
    "not-started": "Por empezar",
  } satisfies Record<SkillState, string>,
} as const;

export function XpLevelCard({ stats }: { stats: GamificationStats }) {
  const bar = levelBar(stats);

  return (
    <SummaryCard title={PROGRESS_CARDS_COPY.level(bar.level)}>
      <div className={cx(styles.statRow)}>
        <StarIcon className={cx(styles.statIcon)} aria-hidden="true" />
        <span className={cx(styles.statValue)}>{PROGRESS_CARDS_COPY.xpTotal(stats.xpTotal)}</span>
        <span className={cx(styles.meta)}>{`${bar.percent}%`}</span>
      </div>
      <LinearProgress
        variant="determinate"
        value={bar.percent}
        aria-label={PROGRESS_CARDS_COPY.levelAria(bar.percent)}
        className={cx(styles.bar)}
      />
      <span className={cx(styles.meta)}>{PROGRESS_CARDS_COPY.levelSpan(bar.xpIntoLevel, bar.span, bar.nextLevel)}</span>
    </SummaryCard>
  );
}

export function StreakCard({ stats }: { stats: GamificationStats }) {
  return (
    <SummaryCard title={PROGRESS_CARDS_COPY.streakTitle}>
      <div className={cx(styles.statRow)}>
        <LocalFireDepartmentIcon className={cx(styles.statIcon)} aria-hidden="true" />
        <span className={cx(styles.statValue)}>{PROGRESS_CARDS_COPY.streakValue(stats.streakDays)}</span>
        {stats.streakDays > 0 ? <span className={cx(styles.chip)}>{PROGRESS_CARDS_COPY.streakActive}</span> : null}
      </div>
      <span className={cx(styles.meta)}>{PROGRESS_CARDS_COPY.longestStreak(stats.longestStreak)}</span>
    </SummaryCard>
  );
}

export function AchievementsCard({ achievements }: { achievements: readonly Achievement[] }) {
  return (
    <SummaryCard title={PROGRESS_CARDS_COPY.achievementsTitle(achievements.length)} wide>
      {achievements.length === 0 ? (
        <EmptyState title={PROGRESS_CARDS_COPY.achievementsEmptyTitle} description={PROGRESS_CARDS_COPY.achievementsEmptyDescription} />
      ) : (
        <ul className={cx(styles.achievements)}>
          {achievements.map((achievement) => (
            <li key={achievement.id} className={cx(styles.achievement)} data-achievement-code={achievement.code}>
              {achievement.icon ? <span className={cx(styles.achievementIcon)} aria-hidden="true">{achievement.icon}</span> : null}
              <span className={cx(styles.itemTitle)}>{achievement.title}</span>
              {achievement.description ? <span className={cx(styles.meta)}>{achievement.description}</span> : null}
              <span className={cx(styles.meta)}>
                {[
                  PROGRESS_CARDS_COPY.unlockedAt(formatDate(achievement.unlockedAt)),
                  achievement.xpReward > 0 ? PROGRESS_CARDS_COPY.reward(achievement.xpReward) : null,
                ].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SummaryCard>
  );
}

export function MilestonesCard({ milestones }: { milestones: readonly Milestone[] }) {
  return (
    <SummaryCard title={PROGRESS_CARDS_COPY.milestonesTitle}>
      {milestones.length === 0 ? (
        <EmptyState title={PROGRESS_CARDS_COPY.milestonesEmptyTitle} description={PROGRESS_CARDS_COPY.milestonesEmptyDescription} />
      ) : (
        <ul className={cx(styles.list)}>
          {milestones.map((milestone) => (
            <li key={milestone.id} className={cx(styles.row)}>
              <div className={cx(styles.rowHeader)}>
                <span className={cx(styles.itemTitle)}>{milestone.title}</span>
                {milestone.achieved ? (
                  <span className={cx(styles.achieved)}>
                    <CheckCircleIcon fontSize="small" aria-hidden="true" />
                    {PROGRESS_CARDS_COPY.milestoneAchieved}
                  </span>
                ) : null}
              </div>
              <LinearProgress
                variant="determinate"
                value={milestone.percentage}
                color={milestone.achieved ? "success" : "primary"}
                aria-label={PROGRESS_CARDS_COPY.milestoneAria(milestone.title)}
                className={cx(styles.bar)}
              />
              <span className={cx(styles.meta)}>
                {PROGRESS_CARDS_COPY.milestoneValue(milestone.percentage, milestone.completedLessons, milestone.totalLessons)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SummaryCard>
  );
}

export type SkillTreeCardProps = {
  branches: readonly SkillBranch[]
  branchTitles: Record<CurriculumAccordionKey, string>
};

export function SkillTreeCard({ branches, branchTitles }: SkillTreeCardProps) {
  return (
    <SummaryCard title={PROGRESS_CARDS_COPY.skillTreeTitle}>
      {branches.length === 0 ? (
        <EmptyState title={PROGRESS_CARDS_COPY.skillTreeEmptyTitle} description={PROGRESS_CARDS_COPY.skillTreeEmptyDescription} />
      ) : (
        <div className={cx(styles.branches)}>
          {branches.map((branch) => (
            <section key={branch.key} aria-label={branchTitles[branch.key]} className={cx(styles.branch)}>
              <div className={cx(styles.rowHeader)}>
                <h3 className={cx(styles.branchTitle)}>{branchTitles[branch.key]}</h3>
                <span className={cx(styles.meta)}>{PROGRESS_CARDS_COPY.branchValue(branch.percentage)}</span>
              </div>
              <ul className={cx(styles.list)}>
                {branch.levels.map((level) => (
                  <li key={level.id} className={cx(styles.row)} data-skill-state={level.state}>
                    <div className={cx(styles.rowHeader)}>
                      <span className={cx(styles.itemTitle)}>{level.title}</span>
                      <span className={cx(styles.meta)}>{PROGRESS_CARDS_COPY.skillStates[level.state]}</span>
                    </div>
                    <LinearProgress
                      variant="determinate"
                      value={level.percentage}
                      color={level.state === "completed" ? "success" : "primary"}
                      aria-label={PROGRESS_CARDS_COPY.skillAria(level.title)}
                      className={cx(styles.bar)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </SummaryCard>
  );
}
