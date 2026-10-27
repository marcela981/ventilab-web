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
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Link from "next/link";
import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { cx } from "@shared/lib/class-names";
import { VentilatorConsole } from "@shared/ventilator-console";
import { EVENT_PENDING_WARNING_COUNT } from "../config/sim-console.config";
import { DEADLINE_WARNING_MS } from "../config/sim-exam.config";
import { buildSessionResultUrl, SIMULATOR_URL } from "../config/simulator.routes";
import type { SimulationMode } from "../config/simulator.config";
import type { AssistancePolicyValue } from "../entities/sim-assist.entity";
import { formatCountdown } from "../entities/sim-exam.entity";
import type { SessionBoot } from "../entities/sim-session.entity";
import { useExamDeadline } from "../hooks/use-exam-deadline";
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
  /** Extra content of the side column, below the case panel (the workspace shows the own patient). */
  aside?: ReactNode
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

type RunningViewProps = Omit<SessionMonitorProps, "host"> & {
  host: SimSessionHostValue
  running: SimSessionRunning
};

function RunningSessionView({ host, running, renderAssist, assistancePolicy, aside }: RunningViewProps) {
  const { sessionId, assistHistory, onAssistAnswered } = host;
  const { boot, version, session, controllable, deadlineReached, endError } = running;
  const { record } = boot;
  const paused = session.status === "paused";
  // The assist never pauses the simulation; it closes (and aborts) once the end starts.
  const assistActive = controllable && !session.ending && !session.diverged;
  // A host policy wins; otherwise the one the exam slot stored with the session (unknown = fail safe in EXAM).
  const policy = assistancePolicy !== undefined ? assistancePolicy : record.exam?.assistancePolicy ?? null;
  const renderHostAssist = useCallback(
    (simTimeMs: number) => renderAssist?.({ sessionId, mode: record.mode, simTimeMs, active: assistActive }) ?? null,
    [assistActive, record.mode, renderAssist, sessionId],
  );
  const applicability = useMemo(() => (session.applicability ? { applicability: session.applicability } : {}), [session.applicability]);

  if (version.status === "blocked") {
    return (
      <section className={cx(styles.blocked)} role="alert" aria-label={SESSION_PAGE_COPY.versionBlocked}>
        <h2 className={cx(styles.blockedTitle)}>{SESSION_PAGE_COPY.versionBlocked}</h2>
        <p>{version.message}</p>
        <Link href={SIMULATOR_URL} className={cx(styles.link)}>{SESSION_PAGE_COPY.backToCatalog}</Link>
      </section>
    );
  }

  const { store } = session;
  const casePanel = store ? <LiveCasePanel store={store} caseId={record.caseId} engineCase={record.engineCase} /> : null;

  return (
    <>
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
        <div className={cx(styles.sessionActions)}>
          <PendingEventsIndicator count={session.pendingEvents} />
          {renderAssist
            ? (store ? <SessionAssistSlot store={store} render={renderHostAssist} /> : null)
            : (
              <AssistLauncher
                sessionId={sessionId}
                mode={record.mode}
                policy={policy}
                active={assistActive}
                history={assistHistory}
                onAnswered={onAssistAnswered}
              />
            )}
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
      <div className={cx(styles.sessionLayout)}>
        <div className={cx(styles.consoleArea)}>
          {session.adapter ? (
            <VentilatorConsole adapter={session.adapter} variant="live" {...applicability} />
          ) : (
            <p className={cx(styles.consoleMuted)}>{session.workerError ?? SESSION_PAGE_COPY.starting}</p>
          )}
          {session.adapter && session.status === "starting" ? <p className={cx(styles.consoleMuted)} role="status">{SESSION_PAGE_COPY.starting}</p> : null}
        </div>
        {aside ? <div className={cx(styles.sideColumn)}>{casePanel}{aside}</div> : casePanel}
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

export function SessionMonitor({ host, renderAssist, assistancePolicy, aside }: SessionMonitorProps) {
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
      <RunningSessionView host={host} running={running} renderAssist={renderAssist} assistancePolicy={assistancePolicy} aside={aside} />
    );
  }

  return <p className={cx(styles.consoleMuted)} role="status">{SESSION_PAGE_COPY.loading}</p>;
}
