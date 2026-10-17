/*
* Funcionalidad: DashboardCards
* Descripción: Summary cards of /teacher for the selected group, each with its own loading and error state: attempts waiting for review (envelope total of the grading queue, link to /grading), active evaluations (envelope total plus the first rows with their window and pending reviews, linked to the evaluation results page) and upcoming ventilator reservations of the group in the next 30 days (window and purpose). Numbers are shown as the API returns them. Depends on MUI, next/link, @shared/lib/format, the design-system skeleton, the teacher dashboard hooks, entities, routes and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Link from "next/link";
import type { ReactNode } from "react";
import { useId } from "react";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDateRange } from "@shared/lib/format";
import { buildEvaluationResultsUrl, GRADING_URL } from "../config/teacher-dashboard.routes";
import { getTeacherDashboardErrorMessage } from "../entities/teacher-dashboard-error-messages";
import { formatCount, MISSING } from "../entities/teacher-dashboard-labels";
import type { CardState, GroupCards } from "../hooks/use-group-cards";
import styles from "../../UI/teacher-dashboard.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const DASHBOARD_CARDS_COPY = {
  pendingTitle: "Intentos por calificar",
  pendingLink: "Ir a calificar",
  activeTitle: "Evaluaciones activas",
  activeEmpty: "No hay evaluaciones activas en este grupo.",
  pendingReview: (count: number) => `${formatCount(count)} por calificar`,
  reservationsTitle: "Próximas reservas del ventilador",
  reservationsEmpty: "El grupo no tiene reservas en los próximos 30 días.",
  noPurpose: "Sin propósito indicado",
  loading: (title: string) => `Cargando ${title.toLowerCase()}…`,
} as const;

type CardProps<T> = {
  title: string
  state: CardState<T>
  render: (value: T) => ReactNode
};

function SummaryCard<T>({ title, state, render }: CardProps<T>) {
  const titleId = useId();

  if (state.value === null && state.isLoading) {
    return <CardSkeleton label={DASHBOARD_CARDS_COPY.loading(title)} />;
  }

  return (
    <section aria-labelledby={titleId} className={cx(styles.card)}>
      <h2 id={titleId} className={cx(styles.cardTitle)}>{title}</h2>
      {state.value === null && state.error ? <Alert severity="error">{getTeacherDashboardErrorMessage(state.error)}</Alert> : null}
      {state.value !== null ? render(state.value) : null}
    </section>
  );
}

export function DashboardCards({ cards }: { cards: GroupCards }) {
  return (
    <div className={cx(styles.grid)}>
      <SummaryCard
        title={DASHBOARD_CARDS_COPY.pendingTitle}
        state={cards.pendingGrading}
        render={(total) => (
          <>
            <p className={cx(styles.bigNumber)}>{formatCount(total)}</p>
            <Link href={GRADING_URL} className={cx(styles.link)}>{DASHBOARD_CARDS_COPY.pendingLink}</Link>
          </>
        )}
      />
      <SummaryCard
        title={DASHBOARD_CARDS_COPY.activeTitle}
        state={cards.activeEvaluations}
        render={({ total, items }) => (
          <>
            <p className={cx(styles.bigNumber)}>{total === null ? MISSING : formatCount(total)}</p>
            {items.length === 0 ? <p className={cx(styles.emptyText)}>{DASHBOARD_CARDS_COPY.activeEmpty}</p> : (
              <ul className={cx(styles.list)}>
                {items.map((assignment) => (
                  <li key={assignment.id} className={cx(styles.listItem)}>
                    <Link href={buildEvaluationResultsUrl(assignment.evaluationId)} className={cx(styles.link)}>
                      {assignment.evaluationTitle}
                    </Link>
                    <span className={cx(styles.itemMeta)}>
                      {formatDateRange(assignment.startsAt, assignment.endsAt)} · {DASHBOARD_CARDS_COPY.pendingReview(assignment.pendingReview)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      />
      <SummaryCard
        title={DASHBOARD_CARDS_COPY.reservationsTitle}
        state={cards.reservations}
        render={(reservations) => (reservations.length === 0 ? (
          <p className={cx(styles.emptyText)}>{DASHBOARD_CARDS_COPY.reservationsEmpty}</p>
        ) : (
          <ul className={cx(styles.list)}>
            {reservations.map((reservation) => (
              <li key={reservation.id} className={cx(styles.listItem)}>
                <span className={cx(styles.itemTitle)}>{formatDateRange(reservation.startsAt, reservation.endsAt)}</span>
                <span className={cx(styles.itemMeta)}>{reservation.purpose ?? DASHBOARD_CARDS_COPY.noPurpose}</span>
              </li>
            ))}
          </ul>
        ))}
      />
    </div>
  );
}
