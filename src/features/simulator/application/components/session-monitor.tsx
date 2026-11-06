/*
* Funcionalidad: SessionMonitor
* Descripción: The view of one running simulation session, shared by the session console page
*   (/simulator/sessions/[id]: EXAM and direct links) and the Monitoreo tab of the /simulador workspace (W6, Bloque 1;
*   moved unchanged from the session console page v2.0). It renders the session host value it receives: the phase
*   notices (claiming, open in another tab, ended with the result link, unavailable with retry), and while running the
*   session bar (time controls: clock, multiplier and pause in FREE, fixed speed in EXAM; the EXAM countdown; pending
*   events; "Asesoría IA" or a host assist slot; "Finalizar sesión"), the version, deadline, worker, end and change
*   banners, the store-fed VentilatorConsole (live variant; the simulator adapter declares no alarm limits, so the
*   alarm limits panel never shows here), the live case panel with its objectives, an optional `aside` below it (the
*   workspace shows the own patient there), the end confirmation and the divergence dialog. The host decides where an
*   ended session goes (`onEnded` of SimSessionHost). Depends on next/link, the design system, the ventilator console,
*   the simulator components, config, entities and the session console CSS.
*   v0.2 (Bloque 5, C6): July layout (DISENO_BLOQUE5 §6.2, §6.6) for Monitoreo and EXAM alike: the console uses
*   layout="july"; the session strip (time controls, EXAM countdown, pending events, "Mostrar caso clínico",
*   "Finalizar sesión") and the banners go in its header; "Asesoría IA" (or the host assist slot) next to the mode
*   toggle; the clinical case (with the `aside` block) in a drawer; the left column shows the host `leftTop` and the
*   patient status ("Paciente activo"). The value cards use the host `cards` preference; in EXAM "Ajustar" is locked
*   ("Disponible fuera del examen", D29) while the saved preference applies; speed and pause stay hidden in EXAM
*   (TimeControls), Confirmar / Cancelar / Enter / Escape and the mode toggle stay enabled and the assist follows the
*   assistance policy. `curvesToolbarStart` is the host seam for the signal chip. The replay keeps the classic layout
*   (D28).
*   v0.3 (Bloque A): the patient status area also shows the engine patient status and severity ("Inestable ·
*   gravedad 45 %", "Paciente fallecido") from the session store (re-rendered only when the text changes, no extra
*   sampling), and in EXAM the case drawer leaves out the live objectives (they reveal the correction). Every alarm of
*   the console opens "¿Cómo estabilizar?" (rules + AI suggestion of POST /simulation/sessions/{id}/alarm-help) under
*   the assistance policy of the session (EXAM DISABLED or unknown: only the alarm description, no request).
*   v0.4 (fix sim-assist-current-state): "Asesoría IA" and "¿Cómo estabilizar?" send the console context of the session
*   (session.helpContext: bounded flush of the pending events, current simulated time and snapshot).
* Versión: 0.4
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Link from "next/link";
import { memo, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { cx } from "@shared/lib/class-names";
import { VentilatorConsole } from "@shared/ventilator-console";
import type { ConsoleAlarmHelpTarget, MonitorCardsController } from "@shared/ventilator-console";
import { sessionAlarmHelpRequest } from "../../api/services/simulation-alarm-help.service";
import { CLINICAL_CASE_PATH } from "../../api/services/clinical-cases.service";
import { EVENT_PENDING_WARNING_COUNT } from "../config/sim-console.config";
import { DEADLINE_WARNING_MS } from "../config/sim-exam.config";
import { buildSessionResultUrl, SIMULATOR_URL } from "../config/simulator.routes";
import type { SimulationMode } from "../config/simulator.config";
import { alarmHelpAvailability } from "../entities/sim-alarm-help.entity";
import { resolveAssistPolicy } from "../entities/sim-assist.entity";
import type { AssistancePolicyValue } from "../entities/sim-assist.entity";
import { formatCountdown } from "../entities/sim-exam.entity";
import { patientConditionText } from "../entities/sim-debrief.entity";
import type { SessionPatient } from "../entities/sim-patient.entity";
import type { SessionBoot } from "../entities/sim-session.entity";
import { useExamDeadline } from "../hooks/use-exam-deadline";
import { useSimSessionSlice } from "../hooks/use-sim-session";
import type { SimSessionSnapshot, SimSessionStore } from "../hooks/use-sim-session";
import { AlarmHelpPanel } from "./lazy-alarm-help-panel";
import { AssistLauncher } from "./assist-launcher";
import { DivergenceDialog } from "./divergence-dialog";
import { LiveCasePanel, SessionAssistSlot, SessionTimeControls } from "./live-session-widgets";
import type { SimSessionHostValue, SimSessionRunning } from "./sim-session-host";
import styles from "../../UI/session-console.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const SESSION_PAGE_COPY = {
  documentTitle: "Sesión de simulación | VentyLab",
  title: "Sesión de simulación",
  loading: "Preparando la sesión de simulación…",
  starting: "Iniciando el simulador…",
  ended: "Esta sesión ya terminó.",
  viewResult: "Ver resultado",
  backToCatalog: "Volver al simulador",
  retry: "Reintentar",
  end: "Finalizar sesión",
  ending: "Finalizando…",
  endTitle: "¿Finalizar la sesión?",
  endDescription: "Se detendrá la simulación, se enviarán tus cambios y el servidor calculará el resultado. No podrás continuar esta sesión.",
  endConfirm: "Finalizar",
  endCancel: "Seguir simulando",
  endFailed: (detail: string) => `No se pudo finalizar la sesión: ${detail} La sesión sigue activa; inténtalo de nuevo.`,
  versionBlocked: "Examen bloqueado",
  dismiss: "Cerrar",
  pendingEvents: (count: number) => (count === 1 ? "1 evento pendiente de envío" : `${count} eventos pendientes de envío`),
  pendingEventsWarning: "Revisa tu conexión: los cambios se guardan aquí y se enviarán al recuperarla.",
  otherTab: "Esta sesión ya está abierta en otra pestaña",
  otherTabHint: "Continúa en la otra pestaña. Esta queda en solo lectura: no ejecuta la simulación ni envía cambios.",
  claiming: "Comprobando si la sesión está abierta en otra pestaña…",
  examTimeLeft: "Tiempo restante del examen",
  deadlineReached: "Se alcanzó la fecha límite del examen. Guardando la parte práctica y volviendo al examen…",
  patientStatus: "Paciente activo",
  patientCondition: "Estado del paciente",
  patientName: (name: string) => `Paciente: ${name}`,
  unnamedPatient: "Paciente simulado",
  caseFallback: "caso clínico",
  cardsLocked: "Disponible fuera del examen",
} as const;

export type AssistSlotContext = {
  sessionId: string
  mode: SimulationMode
  simTimeMs: number
  /** false while the session is starting, ending or ended. */
  active: boolean
};

export type SessionMonitorProps = {
  /** The session host value (useSimSessionHost below a SimSessionHost, or lifted above the tabs by the workspace). */
  host: SimSessionHostValue
  /** Replaces the built-in AI assist launcher (T7); a function returning null hides it. */
  renderAssist?: ((context: AssistSlotContext) => ReactNode) | undefined
  /** Rubric assistance policy when the host knows it (T9 exam flow); unknown = fail safe (EXAM disabled). */
  assistancePolicy?: AssistancePolicyValue | null | undefined
  /** Extra content of the case drawer, below the objectives (the workspace shows the own patient). */
  aside?: ReactNode
  /** v0.2: top of the July left column, before the patient status (the workspace monitor mode selector). */
  leftTop?: ReactNode
  /** v0.2: first item of the curves toolbar (the workspace signal chip). */
  curvesToolbarStart?: ReactNode
  /** v0.2: the value cards preference of the user (stable identity); omitted, one in memory. */
  cards?: MonitorCardsController | undefined
};

function PendingEventsIndicator({ count }: { count: number }) {
  if (count === 0) {
    return null;
  }

  const warn = count >= EVENT_PENDING_WARNING_COUNT;

  return (
    <p className={cx(styles.pendingEvents)} data-tone={warn ? "warning" : "info"} role="status">
      {SESSION_PAGE_COPY.pendingEvents(count)}
      {warn ? ` — ${SESSION_PAGE_COPY.pendingEventsWarning}` : null}
    </p>
  );
}

const NO_EXPIRY = (): void => undefined;

/** Display-only countdown with its own ticker (the host owns the expiry), so only this element follows the seconds. */
function ExamCountdown({ boot }: { boot: SessionBoot }) {
  const { record } = boot;
  const remainingMs = useExamDeadline({
    deadline: record.mode === "EXAM" ? record.expiresAt : null,
    serverOffsetMs: record.exam?.serverOffsetMs ?? boot.serverOffsetMs,
    onExpire: NO_EXPIRY,
  });

  if (remainingMs === null) {
    return null;
  }

  return (
    <p className={cx(styles.countdown)} data-tone={remainingMs <= DEADLINE_WARNING_MS ? "warning" : "info"} role="timer">
      <span className={cx(styles.clockLabel)}>{SESSION_PAGE_COPY.examTimeLeft}</span>
      <span className={cx(styles.clockValue)}>{formatCountdown(remainingMs)}</span>
    </p>
  );
}

/** The status chip text: only a change of status or of the rounded severity re-renders it. */
const selectCondition = (snapshot: SimSessionSnapshot): string | null => {
  const patient = snapshot.metrics?.patient ?? null;

  return patient ? patientConditionText(patient.status, patient.severity) : null;
};
const selectPatientStatus = (snapshot: SimSessionSnapshot): string | null => snapshot.metrics?.patient?.status ?? null;

/** Engine patient status (engine 2.0.0 with evolution); nothing for cases without evolution. */
const PatientCondition = memo(function PatientCondition({ store }: { store: SimSessionStore }) {
  const text = useSimSessionSlice(store, selectCondition);
  const status = useSimSessionSlice(store, selectPatientStatus);

  if (text === null || status === null) {
    return null;
  }

  return (
    <p className={cx(styles.patientCondition)} data-status={status} role="status" aria-label={SESSION_PAGE_COPY.patientCondition}>
      {text}
    </p>
  );
});

type PatientStatusProps = { caseId: string, patient: SessionPatient | null };

/** "Paciente: <nombre>" of the own patient, else the case title (the case query is shared with the case drawer). */
const PatientStatus = memo(function PatientStatus({ caseId, patient }: PatientStatusProps) {
  const { data } = useApiQuery(CLINICAL_CASE_PATH, { params: { caseId } });
  const caseTitle = data?.data.clinicalCase.title ?? SESSION_PAGE_COPY.caseFallback;
  const name = patient ? patient.displayName ?? SESSION_PAGE_COPY.unnamedPatient : caseTitle;

  return (
    <p className={cx(styles.patientStatus)} role="status" aria-label={SESSION_PAGE_COPY.patientStatus}>
      <CheckCircleIcon className={cx(styles.patientStatusIcon)} aria-hidden="true" />
      <span className={cx(styles.patientStatusText)}>{SESSION_PAGE_COPY.patientName(name)}</span>
    </p>
  );
});

type RunningViewProps = Omit<SessionMonitorProps, "host"> & {
  host: SimSessionHostValue
  running: SimSessionRunning
};

function RunningSessionView({ host, running, renderAssist, assistancePolicy, aside, leftTop, curvesToolbarStart, cards }: RunningViewProps) {
  const { sessionId, assistHistory, onAssistAnswered } = host;
  const { boot, version, session, controllable, deadlineReached, endError } = running;
  const { record } = boot;
  const { store, helpContext } = session;
  const paused = session.status === "paused";
  const exam = record.mode === "EXAM";
  const patient = record.patient ?? null;
  // The assist never pauses the simulation; it closes (and aborts) once the end starts.
  const assistActive = controllable && !session.ending && !session.diverged;
  // A host policy wins; otherwise the one the exam slot stored with the session (unknown = fail safe in EXAM).
  const policy = assistancePolicy !== undefined ? assistancePolicy : record.exam?.assistancePolicy ?? null;
  const renderHostAssist = useCallback(
    (simTimeMs: number) => renderAssist?.({ sessionId, mode: record.mode, simTimeMs, active: assistActive }) ?? null,
    [assistActive, record.mode, renderAssist, sessionId],
  );
  const applicability = useMemo(() => (session.applicability ? { applicability: session.applicability } : {}), [session.applicability]);
  // Stable slot nodes: the console shell re-renders only when what they show changes.
  const assist = useMemo(() => {
    if (renderAssist) {
      return store ? <SessionAssistSlot store={store} render={renderHostAssist} /> : null;
    }

    return (
      <AssistLauncher
        sessionId={sessionId}
        mode={record.mode}
        policy={policy}
        active={assistActive}
        helpContext={helpContext}
        history={assistHistory}
        onAnswered={onAssistAnswered}
      />
    );
  }, [assistActive, assistHistory, onAssistAnswered, policy, record.mode, renderAssist, renderHostAssist, helpContext, sessionId, store]);
  // "¿Cómo estabilizar?": the alarm help follows the same assistance policy as "Asesoría IA" (A-9).
  const alarmHelp = useMemo(() => alarmHelpAvailability(resolveAssistPolicy(record.mode, policy)), [policy, record.mode]);
  const renderAlarmHelp = useCallback((target: ConsoleAlarmHelpTarget) => (
    <AlarmHelpPanel
      target={target}
      availability={alarmHelp}
      buildRequest={alarmHelp.status === "unavailable"
        ? null
        : async () => sessionAlarmHelpRequest(sessionId, target.code, await helpContext().catch(() => null))}
    />
  ), [alarmHelp, helpContext, sessionId]);
  const left = useMemo(() => (
    <>
      {leftTop}
      <PatientStatus caseId={record.caseId} patient={patient} />
      {store ? <PatientCondition store={store} /> : null}
    </>
  ), [leftTop, patient, record.caseId, store]);

  if (version.status === "blocked") {
    return (
      <section className={cx(styles.blocked)} role="alert" aria-label={SESSION_PAGE_COPY.versionBlocked}>
        <h2 className={cx(styles.blockedTitle)}>{SESSION_PAGE_COPY.versionBlocked}</h2>
        <p>{version.message}</p>
        <Link href={SIMULATOR_URL} className={cx(styles.link)}>{SESSION_PAGE_COPY.backToCatalog}</Link>
      </section>
    );
  }

  const strip = (
    <div className={cx(styles.stripZone)}>
      <div className={cx(styles.sessionBar)}>
        {store ? (
          <SessionTimeControls
            store={store}
            mode={record.mode}
            paused={paused}
            disabled={!controllable || session.ending}
            multiplier={session.multiplier}
            multiplierOptions={session.multiplierOptions}
            onMultiplierChange={session.setMultiplier}
            onPause={session.pause}
            onResume={session.resume}
          />
        ) : null}
        <ExamCountdown boot={boot} />
        <PendingEventsIndicator count={session.pendingEvents} />
        <div className={cx(styles.sessionActions)}>
          {store ? <LiveCasePanel store={store} caseId={record.caseId} engineCase={record.engineCase} extra={aside} hideObjectives={exam} /> : null}
          <button
            type="button"
            className={cx(styles.endButton)}
            disabled={!controllable || session.ending || deadlineReached}
            onClick={running.requestEnd}
          >
            {session.ending ? SESSION_PAGE_COPY.ending : SESSION_PAGE_COPY.end}
          </button>
        </div>
      </div>
      {version.status === "warning" ? <p className={cx(styles.banner)} data-tone="warning" role="status">{version.message}</p> : null}
      {deadlineReached ? <p className={cx(styles.banner)} data-tone="warning" role="alert">{SESSION_PAGE_COPY.deadlineReached}</p> : null}
      {session.workerError ? <p className={cx(styles.banner)} data-tone="error" role="alert">{session.workerError}</p> : null}
      {endError ? <p className={cx(styles.banner)} data-tone="error" role="alert">{SESSION_PAGE_COPY.endFailed(endError)}</p> : null}
      {session.changeError ? (
        <p className={cx(styles.banner)} data-tone="warning" role="alert">
          {session.changeError}
          {" "}
          <button type="button" className={cx(styles.bannerAction)} onClick={session.dismissChangeError}>
            {SESSION_PAGE_COPY.dismiss}
          </button>
        </p>
      ) : null}
      {session.adapter && session.status === "starting" ? <p className={cx(styles.consoleMuted)} role="status">{SESSION_PAGE_COPY.starting}</p> : null}
    </div>
  );

  return (
    <>
      <div className={cx(styles.consoleArea)} data-layout="july">
        {session.adapter ? (
          <VentilatorConsole
            adapter={session.adapter}
            variant="live"
            layout="july"
            header={strip}
            leftTop={left}
            assistSlot={assist}
            curvesToolbarStart={curvesToolbarStart}
            cards={cards}
            renderAlarmHelp={renderAlarmHelp}
            {...(exam ? { cardsLockedReason: SESSION_PAGE_COPY.cardsLocked } : {})}
            {...applicability}
          />
        ) : (
          <>
            {strip}
            <p className={cx(styles.consoleMuted)}>{session.workerError ?? SESSION_PAGE_COPY.starting}</p>
          </>
        )}
      </div>
      <ConfirmDialog
        open={running.confirming}
        title={SESSION_PAGE_COPY.endTitle}
        description={SESSION_PAGE_COPY.endDescription}
        confirmLabel={SESSION_PAGE_COPY.endConfirm}
        cancelLabel={SESSION_PAGE_COPY.endCancel}
        isPending={session.ending}
        onConfirm={() => void running.finish()}
        onCancel={running.cancelEnd}
      />
      <DivergenceDialog open={session.diverged} detail={session.syncError} onReload={running.resync} />
    </>
  );
}

export function SessionMonitor({ host, renderAssist, assistancePolicy, aside, leftTop, curvesToolbarStart, cards }: SessionMonitorProps) {
  const { sessionId, phase, running } = host;

  if (phase === "taken") {
    return (
      <section className={cx(styles.notice)} role="alert">
        <h2 className={cx(styles.blockedTitle)}>{SESSION_PAGE_COPY.otherTab}</h2>
        <p>{SESSION_PAGE_COPY.otherTabHint}</p>
        <div className={cx(styles.noticeActions)}>
          <Link href={buildSessionResultUrl(sessionId)} className={cx(styles.link)}>{SESSION_PAGE_COPY.viewResult}</Link>
          <Link href={SIMULATOR_URL} className={cx(styles.link)}>{SESSION_PAGE_COPY.backToCatalog}</Link>
        </div>
      </section>
    );
  }

  if (phase === "claiming") {
    return <p className={cx(styles.consoleMuted)} role="status">{SESSION_PAGE_COPY.claiming}</p>;
  }

  if (phase === "ended") {
    return (
      <section className={cx(styles.notice)}>
        <p>{SESSION_PAGE_COPY.ended}</p>
        <Link href={buildSessionResultUrl(sessionId)} className={cx(styles.link)}>{SESSION_PAGE_COPY.viewResult}</Link>
      </section>
    );
  }

  if (phase === "unavailable" && host.unavailable) {
    return (
      <section className={cx(styles.notice)} role="alert">
        <h2 className={cx(styles.blockedTitle)}>{host.unavailable.title}</h2>
        <p>{host.unavailable.message}</p>
        <div className={cx(styles.noticeActions)}>
          <button type="button" className={cx(styles.timeButton)} onClick={host.retry}>{SESSION_PAGE_COPY.retry}</button>
          <Link href={buildSessionResultUrl(sessionId)} className={cx(styles.link)}>{SESSION_PAGE_COPY.viewResult}</Link>
          <Link href={SIMULATOR_URL} className={cx(styles.link)}>{SESSION_PAGE_COPY.backToCatalog}</Link>
        </div>
      </section>
    );
  }

  if (phase === "ready" && running) {
    return (
      <RunningSessionView
        host={host}
        running={running}
        renderAssist={renderAssist}
        assistancePolicy={assistancePolicy}
        aside={aside}
        leftTop={leftTop}
        curvesToolbarStart={curvesToolbarStart}
        cards={cards}
      />
    );
  }

  return <p className={cx(styles.consoleMuted)} role="status">{SESSION_PAGE_COPY.loading}</p>;
}
