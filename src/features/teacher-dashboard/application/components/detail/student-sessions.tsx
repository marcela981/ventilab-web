/*
* Funcionalidad: StudentSessions
* Descripción: Simulation sessions of one student in the Simulador tab of /teacher/students/[userId]: `GET /api/simulation/sessions/history?userId` (newest first, paged with the API pagination): case title, start date, mode, status, the result (score) when there is one and the replay link (/simulator/sessions/[id]/replay). Moved out of StudentActivity in v1.0 (W4 Bloque 4) when the detail got its tabs; same texts and behaviour. Depends on MUI, next/link, @shared/lib, the teacher dashboard hooks, entities, routes and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Pagination from "@mui/material/Pagination";
import Link from "next/link";
import { useState } from "react";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDateTime } from "@shared/lib/format";
import { buildSimulationReplayUrl } from "../../config/teacher-dashboard.routes";
import { getTeacherDashboardErrorMessage } from "../../entities/teacher-dashboard-error-messages";
import { formatScore, labelOf, SIMULATION_MODE_LABELS, STATUS_LABELS } from "../../entities/teacher-dashboard-labels";
import { useStudentSessions } from "../../hooks/use-student-sessions";
import styles from "../../../UI/teacher-dashboard.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const STUDENT_SESSIONS_COPY = {
  title: "Sesiones de simulación",
  empty: "Sin sesiones de simulador",
  unknownCase: "Caso sin título",
  replay: "Ver repetición",
  score: (value: string) => `Puntaje ${value}`,
  loading: "Cargando sesiones…",
  pagination: "Páginas de sesiones de simulación",
} as const;

export function StudentSessions({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const { sessions, pages, isLoading, error } = useStudentSessions(userId, page);

  return (
    <section aria-label={STUDENT_SESSIONS_COPY.title} className={cx(styles.section)} aria-busy={isLoading}>
      <h2 className={cx(styles.sectionTitle)}>{STUDENT_SESSIONS_COPY.title}</h2>
      {!sessions && isLoading ? <ListSkeleton rows={3} label={STUDENT_SESSIONS_COPY.loading} /> : null}
      {!sessions && error ? <Alert severity="error">{getTeacherDashboardErrorMessage(error)}</Alert> : null}
      {sessions && sessions.length === 0 ? <p className={cx(styles.emptyText)}>{STUDENT_SESSIONS_COPY.empty}</p> : null}
      {sessions && sessions.length > 0 ? (
        <ul className={cx(styles.list)}>
          {sessions.map((session) => (
            <li key={session.id} className={cx(styles.timelineItem)}>
              <span className={cx(styles.itemTitle)}>{session.caseTitle ?? STUDENT_SESSIONS_COPY.unknownCase}</span>
              <span className={cx(styles.itemMeta)}>{formatDateTime(session.startedAt)}</span>
              <span className={cx(styles.itemMeta)}>{labelOf(SIMULATION_MODE_LABELS, session.mode)}</span>
              <span className={cx(styles.itemMeta)}>{labelOf(STATUS_LABELS, session.status)}</span>
              {session.score !== null ? <span className={cx(styles.itemMeta)}>{STUDENT_SESSIONS_COPY.score(formatScore(session.score))}</span> : null}
              <Link href={buildSimulationReplayUrl(session.id)} className={cx(styles.link)}>{STUDENT_SESSIONS_COPY.replay}</Link>
            </li>
          ))}
        </ul>
      ) : null}
      {pages > 1 ? (
        <Pagination
          size="small"
          count={pages}
          page={Math.min(page, pages)}
          onChange={(_event, next) => setPage(next)}
          aria-label={STUDENT_SESSIONS_COPY.pagination}
        />
      ) : null}
    </section>
  );
}
