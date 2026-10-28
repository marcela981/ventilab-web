/*
* Funcionalidad: RecentActivityBlock
* Descripción: "Actividad Reciente" card of the Inicio tab (W8, Bloque 2; July ActivityFeed): the merged items of mergeHomeActivity, newest first, each with its title (a link when the item has a page; a generic label when the API sends no title), what happened, how long ago and the server XP of a ledger fact ("+50 XP"). Rendered only with at least one item (the tab hides it otherwise). Depends on next/link, @shared/lib, the student home SummaryCard, the Inicio selectors and the Inicio styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Link from "next/link";
import { SummaryCard } from "@features/student-space/home.entry";
import { cx } from "@shared/lib/class-names";
import { formatRelativeAge } from "@shared/lib/format";
import type { HomeActivityItem, HomeActivityKind } from "../../entities/home-activity.entity";
import styles from "../../../UI/home.module.css";

// TODO(i18n): move to a learning namespace in src/i18n. Title from July ActivityFeed.
export const RECENT_ACTIVITY_COPY = {
  title: "Actividad Reciente",
  kinds: {
    LESSON_COMPLETED: "Lección completada",
    MODULE_COMPLETED: "Módulo completado",
    EVALUATION_PASSED: "Evaluación aprobada",
    ACHIEVEMENT_UNLOCKED: "Logro desbloqueado",
    NOTE: "Nota actualizada",
    CONVERSATION: "Conversación con el asistente",
    SIMULATION: "Simulación",
    GRADE: "Calificación publicada",
  } satisfies Record<HomeActivityKind, string>,
  untitled: {
    LESSON_COMPLETED: "Lección",
    MODULE_COMPLETED: "Módulo",
    EVALUATION_PASSED: "Evaluación",
    ACHIEVEMENT_UNLOCKED: "Logro",
    NOTE: "Lección",
    CONVERSATION: "Conversación",
    SIMULATION: "Caso clínico",
    GRADE: "Evaluación",
  } satisfies Record<HomeActivityKind, string>,
  xp: (xp: number) => `+${xp} XP`,
} as const;

export type RecentActivityBlockProps = {
  items: readonly HomeActivityItem[]
  // Reference instant of the relative times; tests pin it.
  now?: Date | undefined
};

function ActivityRow({ item, now }: { item: HomeActivityItem, now?: Date | undefined }) {
  const title = item.title ?? RECENT_ACTIVITY_COPY.untitled[item.kind];
  const meta = [
    RECENT_ACTIVITY_COPY.kinds[item.kind],
    formatRelativeAge(item.occurredAt, now),
    item.xp !== null && item.xp > 0 ? RECENT_ACTIVITY_COPY.xp(item.xp) : null,
  ].filter(Boolean).join(" · ");

  return (
    <li className={cx(styles.item)} data-activity-kind={item.kind}>
      {item.href ? <Link href={item.href} className={cx(styles.link)}>{title}</Link> : <span className={cx(styles.itemTitle)}>{title}</span>}
      <span className={cx(styles.meta)}>{meta}</span>
    </li>
  );
}

export function RecentActivityBlock({ items, now }: RecentActivityBlockProps) {
  return (
    <SummaryCard title={RECENT_ACTIVITY_COPY.title}>
      <ul className={cx(styles.list)}>
        {items.map((item) => <ActivityRow key={item.key} item={item} now={now} />)}
      </ul>
    </SummaryCard>
  );
}
