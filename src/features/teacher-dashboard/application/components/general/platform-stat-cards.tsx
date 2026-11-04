/*
* Funcionalidad: PlatformStatCards
* Descripción: The statistic cards of the General tab of /teacher (julio GlassStatCard grid, FLUJOS_JULIO §c.3): one link card per statistic (title and value; the whole card opens its destination). While loading without data, four card skeletons; cards whose value is missing never reach this component (the mapper drops them), and nothing renders without cards. Presentational. Depends on next/link, the design-system skeleton, @shared/lib/class-names, the teacher dashboard labels, the teacher general entities and CSS Module. vX.x (Bloque 5): July GlassStatCard look: a decorative accent icon per stat (People, School, Article, TrendingUp; data-accent), the value shown over its label by the grid (the DOM order and the link name are unchanged).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ArticleIcon from "@mui/icons-material/Article";
import PeopleIcon from "@mui/icons-material/People";
import SchoolIcon from "@mui/icons-material/School";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import Link from "next/link";
import type { ReactNode } from "react";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatCount } from "../../entities/teacher-dashboard-labels";
import type { PlatformStatCard, PlatformStatKey } from "../../entities/teacher-general.entity";
import styles from "../../../UI/teacher-general.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const PLATFORM_STAT_CARDS_COPY = {
  label: "Estadísticas de la plataforma",
  loading: "Cargando estadísticas…",
} as const;

const SKELETON_COUNT = 4;

// July GlassStatCard icon and accent of each stat (decorative).
const STAT_VISUALS: Record<PlatformStatKey, { icon: ReactNode, accent: "cyan" | "green" | "violet" | "orange" }> = {
  activeStudents: { icon: <PeopleIcon aria-hidden="true" />, accent: "cyan" },
  publishedModules: { icon: <SchoolIcon aria-hidden="true" />, accent: "green" },
  totalLessons: { icon: <ArticleIcon aria-hidden="true" />, accent: "violet" },
  completionsToday: { icon: <TrendingUpIcon aria-hidden="true" />, accent: "orange" },
};

export type PlatformStatCardsProps = {
  cards: PlatformStatCard[] | null
  isLoading: boolean
};

export function PlatformStatCards({ cards, isLoading }: PlatformStatCardsProps) {
  if (cards === null) {
    return isLoading ? (
      <div className={cx(styles.statGrid)}>
        {Array.from({ length: SKELETON_COUNT }, (_, index) => <CardSkeleton key={index} label={PLATFORM_STAT_CARDS_COPY.loading} />)}
      </div>
    ) : null;
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <ul aria-label={PLATFORM_STAT_CARDS_COPY.label} className={cx(styles.statGrid)}>
      {cards.map((card) => (
        <li key={card.key} className={cx(styles.statItem)}>
          <Link href={card.href} className={cx(styles.statCard)} data-accent={STAT_VISUALS[card.key].accent} data-testid={`stat-card-${card.key}`}>
            <span className={cx(styles.statIcon)}>{STAT_VISUALS[card.key].icon}</span>
            <span className={cx(styles.statTitle)}>{card.title}</span>
            <span className={cx(styles.statValue)}>{formatCount(card.value)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
