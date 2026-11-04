/*
* Funcionalidad: PlatformStatCards
* Descripción: The statistic cards of the General tab of /teacher (julio GlassStatCard grid, FLUJOS_JULIO §c.3): one link card per statistic (title and value; the whole card opens its destination). While loading without data, four card skeletons; cards whose value is missing never reach this component (the mapper drops them), and nothing renders without cards. Presentational. Depends on next/link, the design-system skeleton, @shared/lib/class-names, the teacher dashboard labels, the teacher general entities and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Link from "next/link";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatCount } from "../../entities/teacher-dashboard-labels";
import type { PlatformStatCard } from "../../entities/teacher-general.entity";
import styles from "../../../UI/teacher-general.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const PLATFORM_STAT_CARDS_COPY = {
  label: "Estadísticas de la plataforma",
  loading: "Cargando estadísticas…",
} as const;

const SKELETON_COUNT = 4;

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
          <Link href={card.href} className={cx(styles.statCard)} data-testid={`stat-card-${card.key}`}>
            <span className={cx(styles.statTitle)}>{card.title}</span>
            <span className={cx(styles.statValue)}>{formatCount(card.value)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
