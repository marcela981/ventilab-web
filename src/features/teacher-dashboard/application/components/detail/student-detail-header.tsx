/*
* Funcionalidad: StudentDetailHeader
* Descripción: Header of /teacher/students/[userId] (DISENO_BLOQUE4 §2.4, July PanelStudentDetail): avatar (the profile image, initials while there is none), name, email, student code and active group chips (only when the directory row was found), last access and the overall lesson-weighted progress; then the summary cards "Módulos completados", "Evaluaciones aprobadas" x/y (hidden when the student has no published grade) and "Sesiones de simulador". A card without real data is not rendered: "Tiempo de estudio" is never shown (no real data). Presentational. Depends on MUI, @shared/lib, the student detail entity, the teacher dashboard labels and the student detail CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Avatar from "@mui/material/Avatar";
import LinearProgress from "@mui/material/LinearProgress";
import { cx } from "@shared/lib/class-names";
import { formatDateTime } from "@shared/lib/format";
import { initialsOf } from "../../entities/student-detail.entity";
import type { CompletedModules, PassedEvaluations, StudentDirectoryFacts, StudentProfile } from "../../entities/student-detail.entity";
import { formatPercent } from "../../entities/teacher-dashboard-labels";
import styles from "../../../UI/student-detail.module.css";

// TODO(i18n): move to a teacher-dashboard namespace in src/i18n. Card titles from the July PanelStudentDetail.
export const STUDENT_HEADER_COPY = {
  code: (code: string) => `Código: ${code}`,
  groupsLabel: "Grupos",
  lastAccess: (date: string) => `Último acceso: ${date}`,
  neverAccessed: "Sin accesos registrados",
  overall: "Progreso global",
  overallAria: "Progreso global del estudiante",
  cardsLabel: "Resumen del estudiante",
  modules: "Módulos completados",
  evaluations: "Evaluaciones aprobadas",
  sessions: "Sesiones de simulador",
  ratio: (value: number, total: number) => `${value}/${total}`,
} as const;

export type StudentDetailHeaderProps = {
  student: StudentProfile
  directory: StudentDirectoryFacts | null
  /** 0–100 API percentage; null while the summary is not available. */
  overallProgress: number | null
  modules: CompletedModules | null
  evaluations: PassedEvaluations | null
  sessions: number | null
};

function StatCard({ label, value }: { label: string, value: string }) {
  return (
    <li className={cx(styles.statCard)}>
      <span className={cx(styles.statLabel)}>{label}</span>
      <span className={cx(styles.statValue)}>{value}</span>
    </li>
  );
}

export function StudentDetailHeader({ student, directory, overallProgress, modules, evaluations, sessions }: StudentDetailHeaderProps) {
  const displayName = student.name?.trim() ? student.name : student.email;
  const showEvaluations = evaluations !== null && evaluations.total > 0;

  return (
    <>
      <section aria-label={displayName} className={cx(styles.profile)}>
        <Avatar {...(student.image ? { src: student.image } : {})} alt="" className={cx(styles.avatar)}>
          {initialsOf(student.name, student.email)}
        </Avatar>
        <div className={cx(styles.identity)}>
          <p className={cx(styles.identityLine)}>{student.email}</p>
          {directory?.studentCode ? <p className={cx(styles.identityLine)}>{STUDENT_HEADER_COPY.code(directory.studentCode)}</p> : null}
          <p className={cx(styles.identityLine)}>
            {student.lastAccess ? STUDENT_HEADER_COPY.lastAccess(formatDateTime(student.lastAccess)) : STUDENT_HEADER_COPY.neverAccessed}
          </p>
          {directory && directory.groups.length > 0 ? (
            <ul aria-label={STUDENT_HEADER_COPY.groupsLabel} className={cx(styles.chips)}>
              {directory.groups.map((group) => <li key={group.id} className={cx(styles.chip)}>{group.name}</li>)}
            </ul>
          ) : null}
        </div>
        {overallProgress !== null ? (
          <div className={cx(styles.overall)}>
            <span className={cx(styles.statLabel)}>{STUDENT_HEADER_COPY.overall}</span>
            <p className={cx(styles.overallValue)}>{formatPercent(overallProgress)}</p>
            <LinearProgress
              variant="determinate"
              // Display only: the API percentage bounded to the 0–100 range of the bar.
              value={Math.min(100, Math.max(0, overallProgress))}
              aria-label={STUDENT_HEADER_COPY.overallAria}
            />
          </div>
        ) : null}
      </section>
      <ul aria-label={STUDENT_HEADER_COPY.cardsLabel} className={cx(styles.cards)}>
        {modules ? <StatCard label={STUDENT_HEADER_COPY.modules} value={STUDENT_HEADER_COPY.ratio(modules.completed, modules.total)} /> : null}
        {showEvaluations ? <StatCard label={STUDENT_HEADER_COPY.evaluations} value={STUDENT_HEADER_COPY.ratio(evaluations.passed, evaluations.total)} /> : null}
        {sessions !== null ? <StatCard label={STUDENT_HEADER_COPY.sessions} value={String(sessions)} /> : null}
      </ul>
    </>
  );
}
