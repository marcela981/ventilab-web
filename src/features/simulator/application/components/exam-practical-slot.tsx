/*
* Funcionalidad: Exam practical slot
* Descripción: Renderer of the SIMULATION questions of an exam (T9), registered in the evaluations PracticalQuestionSlot
*   and loaded lazily. It shows the clinical case (title, summary, pathology, difficulty) from GET /clinical-cases/{id},
*   the rubric rules when the question exposes them (criteria, weights, thresholds, passing score, assistance policy and
*   its penalty points; a student only gets the rubric once the grade is published, so before that a note says so),
*   the attempt deadline (GET /evaluation-attempts/{id}) and the question points. Actions: "Iniciar parte práctica"
*   (EXAM session → saved answer → console), "Continuar parte práctica" for a linked ACTIVE session and
*   "Parte práctica completada" with a link to its result once the session is over (status from the history `ids`
*   filter). The attempt and evaluation ids come from the attempt route; without an attempt (authoring preview) or in
*   read-only mode no session can be started. No grade is computed here. Depends on next/router, next/link, MUI
*   Button/Alert, the api-client query hook, the simulator services, entities, hooks and CSS Module; the evaluations
*   feature only through its public types.
*   v1.1 (review of eb3c21b): the linked session comes from the player answer, else from `question.answer` (what the
*   attempt stores once the student is back); a settled history lookup that does not list the linked session is an
*   error state with "Reintentar" instead of an endless "Comprobando…".
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "next/link";
import { useRouter } from "next/router";
import { useId } from "react";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { cx } from "@shared/lib/class-names";
import type { PracticalQuestionRendererProps } from "@features/evaluations";
import { CLINICAL_CASE_PATH } from "../../api/services/clinical-cases.service";
import { EXAM_ATTEMPT_PATH } from "../../api/services/exam-attempt.service";
import { SIMULATION_SESSION_HISTORY_PATH, singleSessionQuery } from "../../api/services/simulation-sessions.service";
import { buildExamAttemptUrl, buildSessionResultUrl, EVALUATIONS_LIST_URL } from "../config/simulator.routes";
import { practicalSlotState, readRubricRules } from "../entities/sim-exam.entity";
import type { ExamRubricRules } from "../entities/sim-exam.entity";
import type { AssistancePolicyValue } from "../entities/sim-assist.entity";
import { difficultyLabel, pathologyLabel } from "../entities/simulator.entity";
import { getSimulatorErrorMessage } from "../entities/simulator-error-messages";
import { useExamPractical } from "../hooks/use-exam-practical";
import type { ExamPracticalDeps } from "../hooks/use-exam-practical";
import styles from "../../UI/exam-practical-slot.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const EXAM_SLOT_COPY = {
  title: "Parte práctica en el simulador",
  clinicalCase: "Caso clínico",
  summary: "Resumen",
  pathology: "Patología",
  difficulty: "Dificultad",
  noCase: "Esta pregunta no tiene un caso clínico asociado.",
  caseLoading: "Cargando el caso clínico…",
  caseFailed: "No se pudo cargar el caso clínico.",
  rules: "Reglas de evaluación",
  criterion: "Criterio",
  weight: "Peso",
  threshold: "Umbral",
  penalty: "Penalización",
  passingScore: (score: string) => `Puntaje mínimo para aprobar: ${score}`,
  rulesPending: "Las reglas de la rúbrica de esta parte práctica se muestran cuando se publica la calificación. El servidor calcula el puntaje.",
  policy: "Asesoría IA",
  policyDisabled: "Desactivada en este examen.",
  policyPenalty: (points: string | null) => (points
    ? `Permitida con penalización: cada solicitud descuenta ${points} puntos.`
    : "Permitida con penalización: cada solicitud descuenta puntos."),
  policyUnknown: "No se puede verificar antes de la calificación; durante el examen la asesoría queda desactivada.",
  deadline: "Fecha límite del intento",
  noDeadline: "Sin fecha límite",
  points: "Puntaje de la pregunta",
  start: "Iniciar parte práctica",
  starting: "Iniciando…",
  startHint: "La simulación corre a velocidad fija y sin pausa. Al terminar o al llegar la fecha límite vuelves a este examen.",
  continue: "Continuar parte práctica",
  inProgress: "Parte práctica en curso.",
  completed: "Parte práctica completada",
  viewResult: "Ver resultado de la parte práctica",
  checking: "Comprobando el estado de la parte práctica…",
  statusFailed: "No se pudo comprobar el estado de la parte práctica.",
  sessionNotFound: "No se encontró la sesión vinculada a esta pregunta.",
  retry: "Reintentar",
  noAttempt: "La parte práctica solo se puede iniciar desde un intento en curso.",
} as const;

const numberFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

function formatNumber(value: number | null): string {
  return value === null ? "—" : numberFormat.format(value);
}

function formatDeadline(iso: string | null | undefined): string {
  const ms = iso ? Date.parse(iso) : Number.NaN;

  return Number.isFinite(ms) ? dateFormat.format(new Date(ms)) : EXAM_SLOT_COPY.noDeadline;
}

function policyText(policy: AssistancePolicyValue | null, penaltyPoints: number | null): string {
  if (policy === "DISABLED") {
    return EXAM_SLOT_COPY.policyDisabled;
  }

  return policy === "ALLOWED_WITH_PENALTY"
    ? EXAM_SLOT_COPY.policyPenalty(penaltyPoints === null ? null : formatNumber(penaltyPoints))
    : EXAM_SLOT_COPY.policyUnknown;
}

function queryString(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function CaseFacts({ caseId }: { caseId: string | null }) {
  const caseQuery = useApiQuery(caseId ? CLINICAL_CASE_PATH : null, { params: { caseId: caseId ?? "" } });
  const clinicalCase = caseQuery.data?.data.clinicalCase ?? null;

  if (!caseId) {
    return <p className={cx(styles.muted)}>{EXAM_SLOT_COPY.noCase}</p>;
  }

  if (!clinicalCase) {
    return <p className={cx(styles.muted)} role={caseQuery.error ? "alert" : "status"}>{caseQuery.error ? EXAM_SLOT_COPY.caseFailed : EXAM_SLOT_COPY.caseLoading}</p>;
  }

  return (
    <dl className={cx(styles.facts)}>
      <dt>{EXAM_SLOT_COPY.clinicalCase}</dt>
      <dd>{clinicalCase.title}</dd>
      <dt>{EXAM_SLOT_COPY.summary}</dt>
      <dd>{clinicalCase.description}</dd>
      <dt>{EXAM_SLOT_COPY.pathology}</dt>
      <dd>{pathologyLabel(clinicalCase.pathology)}</dd>
      <dt>{EXAM_SLOT_COPY.difficulty}</dt>
      <dd>{difficultyLabel(clinicalCase.difficulty)}</dd>
    </dl>
  );
}

function RubricRules({ rules, titleId }: { rules: ExamRubricRules | null, titleId: string }) {
  if (!rules) {
    return (
      <>
        <p className={cx(styles.muted)} role="note">{EXAM_SLOT_COPY.rulesPending}</p>
        <dl className={cx(styles.facts)}>
          <dt>{EXAM_SLOT_COPY.policy}</dt>
          <dd>{EXAM_SLOT_COPY.policyUnknown}</dd>
        </dl>
      </>
    );
  }

  return (
    <>
      {rules.criteria.length > 0 ? (
        <div className={cx(styles.tableWrapper)}>
          <table className={cx(styles.table)} aria-labelledby={titleId}>
            <thead>
              <tr>
                <th scope="col">{EXAM_SLOT_COPY.criterion}</th>
                <th scope="col">{EXAM_SLOT_COPY.weight}</th>
                <th scope="col">{EXAM_SLOT_COPY.threshold}</th>
                <th scope="col">{EXAM_SLOT_COPY.penalty}</th>
              </tr>
            </thead>
            <tbody>
              {rules.criteria.map((criterion) => (
                <tr key={criterion.type}>
                  <th scope="row">{criterion.label}</th>
                  <td>{formatNumber(criterion.weight)}</td>
                  <td>{formatNumber(criterion.threshold)}</td>
                  <td>{formatNumber(criterion.penaltyPoints)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {rules.passingScore === null ? null : <p className={cx(styles.muted)}>{EXAM_SLOT_COPY.passingScore(formatNumber(rules.passingScore))}</p>}
      <dl className={cx(styles.facts)}>
        <dt>{EXAM_SLOT_COPY.policy}</dt>
        <dd>{policyText(rules.assistancePolicy, rules.assistPenaltyPoints)}</dd>
      </dl>
    </>
  );
}

export type ExamPracticalSlotProps = PracticalQuestionRendererProps & {
  deps?: ExamPracticalDeps | undefined
};

export function ExamPracticalSlot({ question, answer, onChange, readOnly = false, deps }: ExamPracticalSlotProps) {
  const router = useRouter();
  const titleId = useId();
  const rulesId = useId();
  const attemptId = queryString(router.query.attemptId);
  const evaluationId = queryString(router.query.evaluationId);
  const sessionId = answer?.simulationSessionId ?? question.answer?.simulationSessionId ?? null;
  const rules = readRubricRules(question.rubric);
  const attemptQuery = useApiQuery(attemptId ? EXAM_ATTEMPT_PATH : null, { params: { attemptId: attemptId ?? "" } });
  const sessionQuery = useApiQuery(sessionId ? SIMULATION_SESSION_HISTORY_PATH : null, { query: singleSessionQuery(sessionId ?? "") });
  const sessionStatus = sessionQuery.data?.data.find((item) => item.id === sessionId)?.status ?? null;
  const slot = practicalSlotState(sessionId, sessionStatus);
  const practical = useExamPractical({
    question,
    answer,
    onChange,
    attemptId,
    evaluationId,
    returnUrl: attemptId && evaluationId ? buildExamAttemptUrl(evaluationId, attemptId) : EVALUATIONS_LIST_URL,
    assistancePolicy: rules?.assistancePolicy ?? null,
    deps,
  });
  const canAct = attemptId !== null && !readOnly;

  let status;

  if (slot.status === "completed") {
    status = (
      <div className={cx(styles.actions)}>
        <p className={cx(styles.status)} role="status">{EXAM_SLOT_COPY.completed}</p>
        <Link href={buildSessionResultUrl(slot.sessionId)} className={cx(styles.link)}>{EXAM_SLOT_COPY.viewResult}</Link>
      </div>
    );
  } else if (slot.status === "in_progress") {
    status = (
      <div className={cx(styles.actions)}>
        <p className={cx(styles.status)}>{EXAM_SLOT_COPY.inProgress}</p>
        {canAct ? (
          <Button variant="contained" disabled={practical.busy} onClick={() => void practical.continueSession(slot.sessionId)}>
            {EXAM_SLOT_COPY.continue}
          </Button>
        ) : null}
      </div>
    );
  } else if (slot.status === "checking") {
    // Settled without the linked session (or failed): an error with a retry, never an endless "Comprobando…".
    const failure = sessionQuery.error
      ? `${EXAM_SLOT_COPY.statusFailed} ${getSimulatorErrorMessage(sessionQuery.error)}`
      : sessionQuery.data ? `${EXAM_SLOT_COPY.statusFailed} ${EXAM_SLOT_COPY.sessionNotFound}` : null;

    status = failure ? (
      <div className={cx(styles.actions)}>
        <p className={cx(styles.muted)} role="alert">{failure}</p>
        <Button variant="text" onClick={() => void sessionQuery.mutate()}>{EXAM_SLOT_COPY.retry}</Button>
      </div>
    ) : <p className={cx(styles.muted)} role="status">{EXAM_SLOT_COPY.checking}</p>;
  } else if (canAct) {
    status = (
      <>
        <p className={cx(styles.muted)}>{EXAM_SLOT_COPY.startHint}</p>
        <div className={cx(styles.actions)}>
          <Button variant="contained" disabled={practical.busy} onClick={() => void practical.start()}>
            {practical.busy ? EXAM_SLOT_COPY.starting : EXAM_SLOT_COPY.start}
          </Button>
        </div>
      </>
    );
  } else {
    status = attemptId === null ? <p className={cx(styles.muted)}>{EXAM_SLOT_COPY.noAttempt}</p> : null;
  }

  return (
    <section className={cx(styles.slot)} aria-labelledby={titleId}>
      <h3 id={titleId} className={cx(styles.title)}>{EXAM_SLOT_COPY.title}</h3>
      <CaseFacts caseId={question.clinicalCaseId} />
      <h4 id={rulesId} className={cx(styles.subtitle)}>{EXAM_SLOT_COPY.rules}</h4>
      <RubricRules rules={rules} titleId={rulesId} />
      <dl className={cx(styles.facts)}>
        <dt>{EXAM_SLOT_COPY.deadline}</dt>
        <dd>{attemptId && !attemptQuery.data && !attemptQuery.error ? "…" : formatDeadline(attemptQuery.data?.data.deadlineAt)}</dd>
        <dt>{EXAM_SLOT_COPY.points}</dt>
        <dd>{formatNumber(question.points)}</dd>
      </dl>
      {practical.error ? <Alert severity="error">{practical.error}</Alert> : null}
      {status}
    </section>
  );
}
