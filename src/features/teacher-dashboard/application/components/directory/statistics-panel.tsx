/*
* Funcionalidad: StatisticsPanel
* Descripción: Estadísticas tab of /teacher/students (July's "Estadísticas Globales"): the four global cards of `GET /api/admin/statistics`: "Estudiantes activos" (last 30 days; July showed the total by mistake), "Módulos publicados", "Lecciones totales" (published) and "Completados hoy" (lessons, Bogotá day). A card without a number is hidden. States: skeleton, error with retry. Depends on React, the design-system states, the directory statistics hook, the students directory entity and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { getDirectoryErrorMessage } from "../../entities/students-directory.entity";
import type { DirectoryStatisticKey } from "../../entities/students-directory.entity";
import { useDirectoryStatistics } from "../../hooks/use-directory-statistics";
import styles from "../../../UI/students-directory.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const STATISTICS_PANEL_COPY = {
  label: "Estadísticas globales",
  loading: "Cargando estadísticas…",
  loadErrorTitle: "No se pudieron cargar las estadísticas",
  emptyTitle: "No hay estadísticas disponibles",
  cards: {
    activeStudents: { title: "Estudiantes activos", hint: "Con actividad en los últimos 30 días" },
    publishedModules: { title: "Módulos publicados", hint: "Visibles para los estudiantes" },
    totalLessons: { title: "Lecciones totales", hint: "Lecciones publicadas" },
    completionsToday: { title: "Completados hoy", hint: "Lecciones completadas hoy" },
  } satisfies Record<DirectoryStatisticKey, { title: string, hint: string }>,
} as const;

const formatCount = (value: number): string => value.toLocaleString("es-CO");

export function StatisticsPanel() {
  const { cards, error, reload } = useDirectoryStatistics();

  if (error) {
    return (
      <ErrorState
        title={STATISTICS_PANEL_COPY.loadErrorTitle}
        description={getDirectoryErrorMessage(error)}
        onRetry={() => void reload()}
      />
    );
  }

  if (!cards) {
    return <CardSkeleton label={STATISTICS_PANEL_COPY.loading} />;
  }

  if (cards.length === 0) {
    return <EmptyState title={STATISTICS_PANEL_COPY.emptyTitle} />;
  }

  return (
    <ul className={cx(styles.cards)} aria-label={STATISTICS_PANEL_COPY.label}>
      {cards.map((card) => {
        const copy = STATISTICS_PANEL_COPY.cards[card.key];

        return (
          <li key={card.key} className={cx(styles.card)} data-testid={`directory-stat-${card.key}`}>
            <h2 className={cx(styles.cardTitle)}>{copy.title}</h2>
            <p className={cx(styles.cardValue)}>{formatCount(card.value)}</p>
            <p className={cx(styles.cardHint)}>{copy.hint}</p>
          </li>
        );
      })}
    </ul>
  );
}
