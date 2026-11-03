/*
* Funcionalidad: StudentGamification
* Descripción: Gamificación tab of /teacher/students/[userId], read-only (DISENO_BLOQUE4 §2.4, S4): "Nivel {n}" with the total XP and the bar of the current level, today's XP, the current and longest streak (America/Bogota days) from `GET /api/progress/users/{userId}/gamification`, and the unlocked achievements (icon, title, description, unlock date, XP reward) from `GET /api/progress/users/{userId}/achievements`. Both reads run in parallel; each block shows its own skeleton, error (with retry) and empty state. Texts follow the July progress cards in third person. Nothing is computed beyond formatting the server values. Depends on MUI, @shared/lib, the design-system skeleton and empty state, the student detail hook and entity, the teacher dashboard error messages and the CSS Modules.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { CardSkeleton, ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDate } from "@shared/lib/format";
import { levelPercent } from "../../entities/student-detail.entity";
import type { StudentAchievement, StudentGamification as GamificationStats } from "../../entities/student-detail.entity";
import { getTeacherDashboardErrorMessage } from "../../entities/teacher-dashboard-error-messages";
import { useStudentGamification } from "../../hooks/use-student-gamification";
import detailStyles from "../../../UI/student-detail.module.css";
import styles from "../../../UI/teacher-dashboard.module.css";

const numberFormatter = new Intl.NumberFormat("es-CO");
const days = (count: number): string => (count === 1 ? "1 día" : `${count} días`);

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n. Texts of the July progress cards.
export const STUDENT_GAMIFICATION_COPY = {
  statsTitle: "Experiencia y racha",
  level: (level: number) => `Nivel ${level}`,
  xp: (xp: number) => `${numberFormatter.format(xp)} XP`,
  levelAria: (percent: number) => `Progreso al siguiente nivel: ${percent}%`,
  levelSpan: (into: number, nextLevelXp: number) => `${numberFormatter.format(into)} XP en el nivel · siguiente nivel con ${numberFormatter.format(nextLevelXp)} XP`,
  xpToday: "XP de hoy",
  streakTitle: "Racha consecutiva",
  streakValue: days,
  longestStreak: (count: number) => `Racha más larga: ${days(count)}`,
  achievementsTitle: (count: number) => `Logros (${count})`,
  achievementsFallbackTitle: "Logros",
  achievementsEmptyTitle: "Aún no ha obtenido logros",
  achievementsEmptyDescription: "Los logros aparecerán conforme avance en su aprendizaje.",
  unlockedAt: (date: string) => `Obtenido el ${date}`,
  reward: (xp: number) => `+${numberFormatter.format(xp)} XP`,
  loadingStats: "Cargando la experiencia…",
  loadingAchievements: "Cargando los logros…",
  retry: "Reintentar",
} as const;

function StatsBlock({ stats }: { stats: GamificationStats }) {
  const percent = levelPercent(stats);

  return (
    <ul className={cx(detailStyles.statsRow)}>
      <li className={cx(detailStyles.statCard)}>
        <span className={cx(detailStyles.statLabel)}>{STUDENT_GAMIFICATION_COPY.level(stats.level)}</span>
        <span className={cx(detailStyles.statValue)}>{STUDENT_GAMIFICATION_COPY.xp(stats.xpTotal)}</span>
        <LinearProgress variant="determinate" value={percent} aria-label={STUDENT_GAMIFICATION_COPY.levelAria(percent)} />
        <span className={cx(styles.itemMeta)}>{STUDENT_GAMIFICATION_COPY.levelSpan(stats.xpIntoLevel, stats.nextLevelXp)}</span>
      </li>
      <li className={cx(detailStyles.statCard)}>
        <span className={cx(detailStyles.statLabel)}>{STUDENT_GAMIFICATION_COPY.xpToday}</span>
        <span className={cx(detailStyles.statValue)}>{STUDENT_GAMIFICATION_COPY.xp(stats.xpToday)}</span>
      </li>
      <li className={cx(detailStyles.statCard)}>
        <span className={cx(detailStyles.statLabel)}>{STUDENT_GAMIFICATION_COPY.streakTitle}</span>
        <span className={cx(detailStyles.statValue)}>{STUDENT_GAMIFICATION_COPY.streakValue(stats.streakDays)}</span>
        <span className={cx(styles.itemMeta)}>{STUDENT_GAMIFICATION_COPY.longestStreak(stats.longestStreak)}</span>
      </li>
    </ul>
  );
}

function AchievementsList({ achievements }: { achievements: readonly StudentAchievement[] }) {
  if (achievements.length === 0) {
    return (
      <EmptyState
        title={STUDENT_GAMIFICATION_COPY.achievementsEmptyTitle}
        description={STUDENT_GAMIFICATION_COPY.achievementsEmptyDescription}
      />
    );
  }

  return (
    <ul className={cx(detailStyles.achievements)}>
      {achievements.map((achievement) => (
        <li key={achievement.id} className={cx(detailStyles.achievement)}>
          {achievement.icon ? <span className={cx(detailStyles.achievementIcon)} aria-hidden="true">{achievement.icon}</span> : null}
          <span className={cx(styles.itemTitle)}>{achievement.title}</span>
          {achievement.description ? <span className={cx(styles.itemMeta)}>{achievement.description}</span> : null}
          <span className={cx(styles.itemMeta)}>
            {[
              STUDENT_GAMIFICATION_COPY.unlockedAt(formatDate(achievement.unlockedAt)),
              achievement.xpReward > 0 ? STUDENT_GAMIFICATION_COPY.reward(achievement.xpReward) : null,
            ].filter(Boolean).join(" · ")}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StudentGamification({ userId }: { userId: string }) {
  const gamification = useStudentGamification(userId);
  const retry = <Button color="inherit" size="small" onClick={() => void gamification.reload()}>{STUDENT_GAMIFICATION_COPY.retry}</Button>;
  const { stats, achievements } = gamification;

  return (
    <>
      <section aria-label={STUDENT_GAMIFICATION_COPY.statsTitle} className={cx(styles.section)}>
        <h2 className={cx(styles.sectionTitle)}>{STUDENT_GAMIFICATION_COPY.statsTitle}</h2>
        {stats ? <StatsBlock stats={stats} /> : null}
        {!stats && gamification.statsLoading ? <CardSkeleton label={STUDENT_GAMIFICATION_COPY.loadingStats} /> : null}
        {!stats && gamification.statsError ? (
          <Alert severity="error" action={retry}>{getTeacherDashboardErrorMessage(gamification.statsError)}</Alert>
        ) : null}
      </section>
      <section aria-label={STUDENT_GAMIFICATION_COPY.achievementsFallbackTitle} className={cx(styles.section)}>
        <h2 className={cx(styles.sectionTitle)}>
          {achievements ? STUDENT_GAMIFICATION_COPY.achievementsTitle(achievements.length) : STUDENT_GAMIFICATION_COPY.achievementsFallbackTitle}
        </h2>
        {achievements ? <AchievementsList achievements={achievements} /> : null}
        {!achievements && gamification.achievementsLoading ? <ListSkeleton rows={2} label={STUDENT_GAMIFICATION_COPY.loadingAchievements} /> : null}
        {!achievements && gamification.achievementsError ? (
          <Alert severity="error" action={retry}>{getTeacherDashboardErrorMessage(gamification.achievementsError)}</Alert>
        ) : null}
      </section>
    </>
  );
}
