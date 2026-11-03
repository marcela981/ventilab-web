/*
* Funcionalidad: TeamRecordings
* Descripción: "Grabaciones del equipo real" of the Simulador tab of /teacher/students/[userId]: the reservations with recorded telemetry of the student or their groups (`GET /api/ventilator/telemetry/recordings?userId`, last 90 days, newest first): date range, holder (individual or group), status and a link to the playback (/lab/recordings/[reservationId]). The section is rendered only when the list is non-empty: nothing while loading, on error or without recordings (DISENO_BLOQUE4 §2.4). Depends on next/link, @shared/lib, the student detail hook, entity and routes, the teacher dashboard labels and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Link from "next/link";
import { cx } from "@shared/lib/class-names";
import { formatDateRange } from "@shared/lib/format";
import { buildRecordingPlaybackUrl } from "../../config/student-detail.routes";
import type { TeamRecording } from "../../entities/student-detail.entity";
import { labelOf, STATUS_LABELS } from "../../entities/teacher-dashboard-labels";
import { useStudentRecordings } from "../../hooks/use-student-recordings";
import styles from "../../../UI/teacher-dashboard.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n.
export const TEAM_RECORDINGS_COPY = {
  title: "Grabaciones del equipo real",
  holder: { USER: "Reserva individual", GROUP: "Reserva del grupo" } satisfies Record<TeamRecording["holderType"], string>,
  play: "Ver grabación",
} as const;

export function TeamRecordings({ userId }: { userId: string }) {
  const { recordings } = useStudentRecordings(userId);

  if (!recordings || recordings.length === 0) {
    return null;
  }

  return (
    <section aria-label={TEAM_RECORDINGS_COPY.title} className={cx(styles.section)}>
      <h2 className={cx(styles.sectionTitle)}>{TEAM_RECORDINGS_COPY.title}</h2>
      <ul className={cx(styles.list)}>
        {recordings.map((recording) => (
          <li key={recording.reservationId} className={cx(styles.timelineItem)}>
            <span className={cx(styles.itemTitle)}>{formatDateRange(recording.startsAt, recording.endsAt)}</span>
            <span className={cx(styles.itemMeta)}>{TEAM_RECORDINGS_COPY.holder[recording.holderType]}</span>
            <span className={cx(styles.itemMeta)}>{labelOf(STATUS_LABELS, recording.status)}</span>
            <Link href={buildRecordingPlaybackUrl(recording.reservationId)} className={cx(styles.link)}>{TEAM_RECORDINGS_COPY.play}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
