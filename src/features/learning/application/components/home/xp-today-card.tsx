/*
* Funcionalidad: XpTodayCard
* Descripción: "XP Hoy" card of the Inicio tab (W8, Bloque 2; July DashboardOverviewCard): the XP earned today and the current level, exactly as `GET /api/progress/gamification` returns them (no XP is computed on the client), with a link to the Mi Progreso tab. Depends on the student home SummaryCard, @shared/lib, the gamification entity, the Inicio selectors and the Inicio styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { SummaryCard } from "@features/student-space/home.entry";
import { cx } from "@shared/lib/class-names";
import type { GamificationStats } from "../../entities/gamification.entity";
import { LEARN_PROGRESS_TAB_URL } from "../../entities/home-activity.entity";
import styles from "../../../UI/home.module.css";

const xpFormatter = new Intl.NumberFormat("es-CO");

// TODO(i18n): move to a learning namespace in src/i18n. Texts from July DashboardOverviewCard.
export const XP_TODAY_COPY = {
  title: "XP Hoy",
  link: "Ver mi progreso",
  value: (xp: number) => `${xpFormatter.format(xp)} XP`,
  level: (level: number, xpTotal: number) => `Nivel ${level} · ${xpFormatter.format(xpTotal)} XP en total`,
} as const;

export function XpTodayCard({ stats }: { stats: GamificationStats }) {
  return (
    <SummaryCard title={XP_TODAY_COPY.title} link={{ href: LEARN_PROGRESS_TAB_URL, label: XP_TODAY_COPY.link }}>
      <p className={cx(styles.stat)}>
        <span className={cx(styles.statValue)}>{XP_TODAY_COPY.value(stats.xpToday)}</span>
        <span className={cx(styles.meta)}>{XP_TODAY_COPY.level(stats.level, stats.xpTotal)}</span>
      </p>
    </SummaryCard>
  );
}
