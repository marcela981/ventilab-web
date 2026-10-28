/*
* Funcionalidad: ActivityCalendar
* Descripción: Activity heatmap of the Mi Progreso tab (W9, Bloque 2; July CalendarCard, extended to the last 12 weeks): one column per week (Monday first) and one cell per day from `GET /api/progress/activity` (America/Bogota days; omitted days have no activity), coloured by the event-count level with a legend. Accessible: the grid is a focusable group whose label (also shown as text) summarises the active days and activities of the range, and every past day is an image labelled with its full date, its activities and its XP; days after today are decorative. Loaded lazily by the tab (retryImport). Depends on the student home SummaryCard, @shared/lib, the activity calendar selectors and the Mi Progreso styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import { SummaryCard } from "@features/student-space/home.entry";
import { cx } from "@shared/lib/class-names";
import type { ActivityDay } from "../../entities/gamification.entity";
import { buildCalendarWeeks, CALENDAR_WEEKS, calendarTotals } from "../../entities/activity-calendar.entity";
import type { CalendarCell, CalendarRange } from "../../entities/activity-calendar.entity";
import styles from "../../../UI/progress.module.css";

// Calendar days are UTC midnights (see progress-insights), so they are formatted in UTC.
const dayFormatter = new Intl.DateTimeFormat("es-CO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });

const activities = (count: number): string => {
  if (count === 0) {
    return "sin actividad";
  }

  return count === 1 ? "1 actividad" : `${count} actividades`;
};

// TODO(i18n): move to a learning namespace in src/i18n.
export const ACTIVITY_CALENDAR_COPY = {
  title: "Calendario de actividad",
  summary: (activeDays: number, events: number, weeks: number) =>
    `${activeDays === 1 ? "1 día" : `${activeDays} días`} con actividad en las últimas ${weeks} semanas · ${activities(events)}`,
  day: (date: string, count: number, xp: number) => {
    const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
    const label = `${dayFormatter.format(new Date(Date.UTC(year, month - 1, day)))}: ${activities(count)}`;

    return xp > 0 ? `${label} · ${xp} XP` : label;
  },
  less: "Menos",
  more: "Más",
} as const;

export type ActivityCalendarProps = {
  days: readonly ActivityDay[]
  range: CalendarRange
};

function DayCell({ cell }: { cell: CalendarCell }) {
  if (cell.future) {
    return <span className={cx(styles.day, styles.dayFuture)} aria-hidden="true" />;
  }

  return (
    <span
      role="img"
      aria-label={ACTIVITY_CALENDAR_COPY.day(cell.date, cell.count, cell.xp)}
      title={ACTIVITY_CALENDAR_COPY.day(cell.date, cell.count, cell.xp)}
      className={cx(styles.day)}
      data-level={cell.level}
    />
  );
}

export function ActivityCalendar({ days, range }: ActivityCalendarProps) {
  const weeks = useMemo(() => buildCalendarWeeks(range, days), [range, days]);
  const totals = calendarTotals(weeks);
  const summary = ACTIVITY_CALENDAR_COPY.summary(totals.activeDays, totals.events, CALENDAR_WEEKS);

  return (
    <SummaryCard title={ACTIVITY_CALENDAR_COPY.title} wide>
      <p className={cx(styles.meta)}>{summary}</p>
      <div className={cx(styles.calendarScroll)}>
        <div role="group" aria-label={summary} tabIndex={0} className={cx(styles.calendar)}>
          {weeks.map((week) => (
            <div key={week[0]?.date} className={cx(styles.week)}>
              {week.map((cell) => <DayCell key={cell.date} cell={cell} />)}
            </div>
          ))}
        </div>
      </div>
      <div className={cx(styles.legend)} aria-hidden="true">
        <span>{ACTIVITY_CALENDAR_COPY.less}</span>
        {[0, 1, 2, 3, 4].map((level) => <span key={level} className={cx(styles.day)} data-level={level} />)}
        <span>{ACTIVITY_CALENDAR_COPY.more}</span>
      </div>
    </SummaryCard>
  );
}
