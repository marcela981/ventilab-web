/*
* Funcionalidad: Student home summary blocks
* Descripción: The blocks of /me, all fed by the single `GET /api/me/summary` read and never computing a metric: learning progress (overall and per section with the section title from the API, bars with the API percentage and lesson counts), active and upcoming evaluations (link to /evaluations/[evaluationId]), latest published grades (grade in es-CO plus "Aprobada"/"No aprobada" from the API `passed`, module when known; link to the attempt result with its feedback), latest notes (excerpt with lesson and page titles; link to the lesson page in the learning viewer when the module is known), latest AI conversations (/assistant/[id]), latest simulation sessions (case title; result and replay of ended sessions, the session itself while active), upcoming ventilator reservations (/lab/reservations) and the unread notifications counter (/notifications). Every block has a Spanish empty state with a next step. Depends on MUI, next/link, the design-system empty state, @shared/lib format, the student space routes, labels and entities, SummaryCard and the student space CSS Module. v1.1 (B2 closure): the backend gaps are closed (section titles, grade attempt result links and modules, note lesson links and titles, session case titles). v1.2 (W8, Bloque 2): shared with the Inicio tab of /learn: ContinueLearningBlock ("Continuar donde quedaste": module and lesson titles, the API module percentage as a bar and a "Continuar" link to /learn/modules/[moduleId], whose resolver opens the resume point) and an optional title on EvaluationsBlock (Inicio shows "Evaluaciones pendientes").
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import LinearProgress from "@mui/material/LinearProgress";
import Link from "next/link";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { cx } from "@shared/lib/class-names";
import { formatDateRange, formatDateTime, formatGrade, formatRelativeAge } from "@shared/lib/format";
import {
  ASSISTANT_HOME_URL,
  buildAttemptResultUrl,
  buildConversationUrl,
  buildEvaluationUrl,
  buildLessonUrl,
  buildModuleUrl,
  buildSectionUrl,
  buildSimulationReplayUrl,
  buildSimulationResultUrl,
  buildSimulationSessionUrl,
  EVALUATIONS_LIST_URL,
  LAB_RESERVATIONS_URL,
  LEARN_HOME_URL,
  MY_GRADES_URL,
  MY_NOTES_URL,
  NOTIFICATIONS_URL,
  SIMULATOR_HOME_URL,
} from "../config/student-space.routes";
import {
  CONVERSATION_SCOPE_LABELS,
  EVALUATION_TYPE_LABELS,
  labelOf,
  SIMULATION_MODE_LABELS,
  SIMULATION_STATUS_LABELS,
} from "../entities/student-space-labels";
import type {
  ContinueLearning,
  ProgressItem,
  SummaryConversation,
  SummaryEvaluation,
  SummaryGrade,
  SummaryNote,
  SummaryReservation,
  SummarySimulationSession,
} from "../entities/student-summary.entity";
import { GradeState } from "./grade-state";
import { SummaryCard } from "./summary-card";
import styles from "../../UI/student-space.module.css";

// TODO(i18n): move to a student-space namespace in src/i18n.
export const SUMMARY_COPY = {
  continueTitle: "Continuar donde quedaste",
  continueAction: "Continuar",
  continueActionAria: (lessonTitle: string) => `Continuar con la lección ${lessonTitle}`,
  continueAria: (moduleTitle: string) => `Progreso del módulo ${moduleTitle}`,
  continueValue: (percent: number) => `${percent} % del módulo`,
  progressTitle: "Mi progreso",
  progressLink: "Ir al aprendizaje",
  overall: "Todo el currículo",
  section: (index: number) => `Sección ${index}`,
  openSection: "Ver sección",
  progressValue: (percentage: number, completed: number, total: number) => `${percentage} % · ${completed} de ${total} lecciones`,
  progressAria: (title: string) => `Progreso de ${title}`,
  progressEmptyTitle: "Aún no hay contenido publicado",
  progressEmptyDescription: "Cuando haya lecciones publicadas verás aquí tu avance por sección.",
  evaluationsTitle: "Evaluaciones",
  evaluationsLink: "Ver evaluaciones",
  active: "Activas",
  upcoming: "Próximas",
  evaluationsEmptyTitle: "No tienes evaluaciones activas ni próximas",
  evaluationsEmptyDescription: "Cuando tu docente asigne una evaluación aparecerá aquí.",
  gradesTitle: "Últimas calificaciones",
  gradesLink: "Ver todas mis calificaciones",
  attempt: (attemptNumber: number) => `Intento ${attemptNumber}`,
  gradeValue: (grade: string) => `Nota ${grade}`,
  openResult: (title: string) => `Ver resultado y retroalimentación de ${title}`,
  gradesEmptyTitle: "Todavía no tienes calificaciones publicadas",
  gradesEmptyDescription: "Tus notas aparecerán aquí cuando el docente las publique.",
  notesTitle: "Últimas notas",
  notesLink: "Ver todas mis notas",
  unknownLesson: "Lección",
  openLesson: (title: string) => `Ir a la lección ${title}`,
  notesEmptyTitle: "Aún no has tomado notas",
  notesEmptyDescription: "Abre una lección y usa la pestaña \"Notas\" para escribir tus apuntes.",
  conversationsTitle: "Conversaciones con el asistente",
  conversationsLink: "Abrir el asistente",
  conversationsEmptyTitle: "No tienes conversaciones con el asistente",
  conversationsEmptyDescription: "Pregúntale al asistente de IA cuando tengas una duda de ventilación mecánica.",
  simulationsTitle: "Simulaciones recientes",
  simulationsLink: "Ir al simulador",
  unknownCase: "Caso clínico",
  score: (value: string) => `Puntaje ${value}`,
  result: "Ver resultado",
  replay: "Ver repetición",
  resume: "Continuar sesión",
  simulationsEmptyTitle: "No has hecho simulaciones",
  simulationsEmptyDescription: "Practica con un caso clínico en el simulador.",
  reservationsTitle: "Próximas reservas del ventilador",
  reservationsLink: "Gestionar reservas",
  groupReservation: "Reserva de grupo",
  reservationsEmptyTitle: "No tienes reservas próximas",
  reservationsEmptyDescription: "Reserva un turno para practicar con el ventilador real.",
  notificationsTitle: "Notificaciones",
  notificationsLink: "Ver notificaciones",
  unread: (count: number) => (count === 1 ? "notificación sin leer" : "notificaciones sin leer"),
} as const;

const scoreFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

function boundedPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function ContinueLearningBlock({ item }: { item: ContinueLearning }) {
  const value = boundedPercent(item.percent);

  return (
    <SummaryCard title={SUMMARY_COPY.continueTitle}>
      <div className={cx(styles.continue)}>
        <span className={cx(styles.itemMeta)}>{item.moduleTitle}</span>
        <span className={cx(styles.itemTitle)}>{item.lessonTitle}</span>
        <LinearProgress
          variant="determinate"
          value={value}
          aria-label={SUMMARY_COPY.continueAria(item.moduleTitle)}
          className={cx(styles.progressBar)}
        />
        <span className={cx(styles.itemMeta)}>{SUMMARY_COPY.continueValue(value)}</span>
        <Link
          href={buildModuleUrl(item.moduleId)}
          aria-label={SUMMARY_COPY.continueActionAria(item.lessonTitle)}
          className={cx(styles.primaryAction)}
        >
          {SUMMARY_COPY.continueAction}
        </Link>
      </div>
    </SummaryCard>
  );
}

function ProgressRow({ title, item, href }: { title: string, item: ProgressItem, href?: string | undefined }) {
  // Display only: the bar takes the API percentage, bounded to its 0–100 range.
  const value = boundedPercent(item.percentage);

  return (
    <li className={cx(styles.progressRow)}>
      <div className={cx(styles.progressHeader)}>
        <span className={cx(styles.itemTitle)}>{title}</span>
        {href ? <Link href={href} className={cx(styles.link)}>{SUMMARY_COPY.openSection}</Link> : null}
      </div>
      <LinearProgress
        variant="determinate"
        value={value}
        aria-label={SUMMARY_COPY.progressAria(title)}
        color={item.completed ? "success" : "primary"}
        className={cx(styles.progressBar)}
      />
      <span className={cx(styles.itemMeta)}>{SUMMARY_COPY.progressValue(value, item.completedLessons, item.totalLessons)}</span>
    </li>
  );
}

export function ProgressBlock({ overall, sections }: { overall: ProgressItem, sections: readonly ProgressItem[] }) {
  return (
    <SummaryCard title={SUMMARY_COPY.progressTitle} link={{ href: LEARN_HOME_URL, label: SUMMARY_COPY.progressLink }} wide>
      {overall.totalLessons === 0 && sections.length === 0 ? (
        <EmptyState title={SUMMARY_COPY.progressEmptyTitle} description={SUMMARY_COPY.progressEmptyDescription} />
      ) : (
        <ul className={cx(styles.progressList)}>
          <ProgressRow title={SUMMARY_COPY.overall} item={overall} />
          {sections.map((section, index) => (
            <ProgressRow
              key={section.id ?? `section-${index}`}
              title={section.title ?? SUMMARY_COPY.section(index + 1)}
              item={section}
              href={section.id ? buildSectionUrl(section.id) : undefined}
            />
          ))}
        </ul>
      )}
    </SummaryCard>
  );
}

function EvaluationList({ title, items }: { title: string, items: readonly SummaryEvaluation[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className={cx(styles.subTitle)}>{title}</h3>
      <ul className={cx(styles.list)}>
        {items.map((evaluation) => (
          <li key={evaluation.assignmentId} className={cx(styles.listItem)}>
            <Link href={buildEvaluationUrl(evaluation.evaluationId)} className={cx(styles.link)}>{evaluation.title}</Link>
            <span className={cx(styles.itemMeta)}>
              {`${labelOf(EVALUATION_TYPE_LABELS, evaluation.type)} · ${formatDateRange(evaluation.startsAt, evaluation.endsAt)}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type EvaluationsBlockProps = {
  active: readonly SummaryEvaluation[]
  upcoming: readonly SummaryEvaluation[]
  title?: string | undefined
};

export function EvaluationsBlock({ active, upcoming, title = SUMMARY_COPY.evaluationsTitle }: EvaluationsBlockProps) {
  return (
    <SummaryCard title={title} link={{ href: EVALUATIONS_LIST_URL, label: SUMMARY_COPY.evaluationsLink }}>
      {active.length === 0 && upcoming.length === 0 ? (
        <EmptyState title={SUMMARY_COPY.evaluationsEmptyTitle} description={SUMMARY_COPY.evaluationsEmptyDescription} />
      ) : (
        <>
          <EvaluationList title={SUMMARY_COPY.active} items={active} />
          <EvaluationList title={SUMMARY_COPY.upcoming} items={upcoming} />
        </>
      )}
    </SummaryCard>
  );
}

export function GradesBlock({ grades }: { grades: readonly SummaryGrade[] }) {
  return (
    <SummaryCard title={SUMMARY_COPY.gradesTitle} link={{ href: MY_GRADES_URL, label: SUMMARY_COPY.gradesLink }}>
      {grades.length === 0 ? (
        <EmptyState title={SUMMARY_COPY.gradesEmptyTitle} description={SUMMARY_COPY.gradesEmptyDescription} />
      ) : (
        <ul className={cx(styles.list)}>
          {grades.map((grade) => (
            <li key={grade.attemptId} className={cx(styles.listItem)}>
              <Link
                href={buildAttemptResultUrl(grade.evaluationId, grade.attemptId)}
                aria-label={SUMMARY_COPY.openResult(grade.title)}
                className={cx(styles.link)}
              >
                {grade.title}
              </Link>
              <span className={cx(styles.itemMeta)}>
                {[
                  grade.moduleTitle,
                  labelOf(EVALUATION_TYPE_LABELS, grade.type),
                  SUMMARY_COPY.attempt(grade.attemptNumber),
                  formatDateTime(grade.publishedAt),
                ].filter(Boolean).join(" · ")}
              </span>
              <span>
                {`${SUMMARY_COPY.gradeValue(formatGrade(grade.grade))} · `}
                <GradeState passed={grade.passed} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </SummaryCard>
  );
}

function NoteLessonLink({ note }: { note: SummaryNote }) {
  const title = [note.lessonTitle ?? SUMMARY_COPY.unknownLesson, note.pageTitle].filter(Boolean).join(" · ");

  return note.moduleId ? (
    <Link
      href={buildLessonUrl(note.moduleId, note.lessonId)}
      aria-label={SUMMARY_COPY.openLesson(note.lessonTitle ?? SUMMARY_COPY.unknownLesson)}
      className={cx(styles.link)}
    >
      {title}
    </Link>
  ) : <span className={cx(styles.itemTitle)}>{title}</span>;
}

export function NotesBlock({ notes, now }: { notes: readonly SummaryNote[], now?: Date | undefined }) {
  return (
    <SummaryCard title={SUMMARY_COPY.notesTitle} link={{ href: MY_NOTES_URL, label: SUMMARY_COPY.notesLink }}>
      {notes.length === 0 ? (
        <EmptyState title={SUMMARY_COPY.notesEmptyTitle} description={SUMMARY_COPY.notesEmptyDescription} />
      ) : (
        <ul className={cx(styles.list)}>
          {notes.map((note) => (
            <li key={note.id} className={cx(styles.listItem)}>
              <NoteLessonLink note={note} />
              <p className={cx(styles.excerpt)}>{note.excerpt}</p>
              <time dateTime={note.updatedAt} className={cx(styles.itemMeta)}>{formatRelativeAge(note.updatedAt, now)}</time>
            </li>
          ))}
        </ul>
      )}
    </SummaryCard>
  );
}

export function ConversationsBlock({ conversations, now }: { conversations: readonly SummaryConversation[], now?: Date | undefined }) {
  return (
    <SummaryCard title={SUMMARY_COPY.conversationsTitle} link={{ href: ASSISTANT_HOME_URL, label: SUMMARY_COPY.conversationsLink }}>
      {conversations.length === 0 ? (
        <EmptyState title={SUMMARY_COPY.conversationsEmptyTitle} description={SUMMARY_COPY.conversationsEmptyDescription} />
      ) : (
        <ul className={cx(styles.list)}>
          {conversations.map((conversation) => (
            <li key={conversation.id} className={cx(styles.listItem)}>
              <Link href={buildConversationUrl(conversation.id)} className={cx(styles.link)}>{conversation.title}</Link>
              <span className={cx(styles.itemMeta)}>
                {`${labelOf(CONVERSATION_SCOPE_LABELS, conversation.scope)} · ${formatRelativeAge(conversation.updatedAt, now)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SummaryCard>
  );
}

function sessionMeta(session: SummarySimulationSession): string {
  const parts = [
    labelOf(SIMULATION_MODE_LABELS, session.mode),
    labelOf(SIMULATION_STATUS_LABELS, session.status),
    formatDateTime(session.startedAt),
  ];

  return session.score === null ? parts.join(" · ") : [...parts, SUMMARY_COPY.score(scoreFormatter.format(session.score))].join(" · ");
}

export function SimulationsBlock({ sessions }: { sessions: readonly SummarySimulationSession[] }) {
  return (
    <SummaryCard title={SUMMARY_COPY.simulationsTitle} link={{ href: SIMULATOR_HOME_URL, label: SUMMARY_COPY.simulationsLink }}>
      {sessions.length === 0 ? (
        <EmptyState title={SUMMARY_COPY.simulationsEmptyTitle} description={SUMMARY_COPY.simulationsEmptyDescription} />
      ) : (
        <ul className={cx(styles.list)}>
          {sessions.map((session) => (
            <li key={session.id} className={cx(styles.listItem)}>
              <span className={cx(styles.itemTitle)}>{session.caseTitle ?? SUMMARY_COPY.unknownCase}</span>
              <span className={cx(styles.itemMeta)}>{sessionMeta(session)}</span>
              <span className={cx(styles.itemLinks)}>
                {session.endedAt === null ? (
                  <Link href={buildSimulationSessionUrl(session.id)} className={cx(styles.link)}>{SUMMARY_COPY.resume}</Link>
                ) : (
                  <>
                    <Link href={buildSimulationResultUrl(session.id)} className={cx(styles.link)}>{SUMMARY_COPY.result}</Link>
                    <Link href={buildSimulationReplayUrl(session.id)} className={cx(styles.link)}>{SUMMARY_COPY.replay}</Link>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SummaryCard>
  );
}

export function ReservationsBlock({ reservations }: { reservations: readonly SummaryReservation[] }) {
  return (
    <SummaryCard title={SUMMARY_COPY.reservationsTitle} link={{ href: LAB_RESERVATIONS_URL, label: SUMMARY_COPY.reservationsLink }}>
      {reservations.length === 0 ? (
        <EmptyState title={SUMMARY_COPY.reservationsEmptyTitle} description={SUMMARY_COPY.reservationsEmptyDescription} />
      ) : (
        <ul className={cx(styles.list)}>
          {reservations.map((reservation) => (
            <li key={reservation.id} className={cx(styles.listItem)}>
              <span className={cx(styles.itemTitle)}>{formatDateRange(reservation.startsAt, reservation.endsAt)}</span>
              {reservation.purpose || reservation.heldByGroup ? (
                <span className={cx(styles.itemMeta)}>
                  {[reservation.heldByGroup ? SUMMARY_COPY.groupReservation : null, reservation.purpose].filter(Boolean).join(" · ")}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </SummaryCard>
  );
}

export function NotificationsBlock({ unread }: { unread: number }) {
  return (
    <SummaryCard title={SUMMARY_COPY.notificationsTitle} link={{ href: NOTIFICATIONS_URL, label: SUMMARY_COPY.notificationsLink }}>
      <p className={cx(styles.counter)}>
        <span className={cx(styles.counterValue)}>{unread}</span>
        <span className={cx(styles.itemMeta)}>{SUMMARY_COPY.unread(unread)}</span>
      </p>
    </SummaryCard>
  );
}
