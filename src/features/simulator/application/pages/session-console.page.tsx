/*
* Funcionalidad: Simulation session console page
* Descripción: /simulator/sessions/[sessionId]: the running simulation on the full-width dark console. It boots the
*   session (store record or server replay + state), checks the engine version (FREE: warning banner; EXAM: blocked
*   before the worker starts, with the reason), runs it through useSimSession and renders the shared
*   VentilatorConsole (live variant), the time controls, the collapsible case panel and "Finalizar sesión" with a
*   confirmation (pause → flush events → POST /end → result page; an error is shown and the session continues).
*   States: loading, ended (link to the result), unavailable ("No se puede reanudar esta sesión en este navegador"
*   with retry, result and catalog links). Extension points: `renderAssist` is the slot for the AI assist (T7) and
*   `onEnded` replaces the navigation to the result (T9 returns to the exam); the mode and deadline come from the
*   session. Dependencies are injectable for tests. Depends on next/router, the design system, the ventilator
*   console, the simulator hooks, components and CSS. v1.1: a refused event opens the blocking divergence dialog
*   ("Recargar sesión" re-runs the bootstrap, which resumes from the server) instead of a banner, and the session bar
*   shows "N eventos pendientes de envío" while events wait for the server (with a connection hint above the
*   warning threshold). v1.2 (T7): the session bar renders the built-in "Asesoría IA" launcher (lazy side panel)
*   unless `renderAssist` replaces it; `assistancePolicy` lets the host pass the rubric policy (unknown = fail safe);
*   the assist is active only while the session runs or is paused and not ending or diverged.
*   v1.3 (review of 524aedf + bc8a596): the page first claims the session for this tab (Web Locks, BroadcastChannel
*   fallback); a tab that cannot claim it shows "Esta sesión ya está abierta en otra pestaña" and never boots, starts
*   the worker or sends events. "Recargar sesión" first settles the old event queue (the new boot reads a settled
*   outbox) and, after TIME_AHEAD_REFUSALS_BEFORE_NO_FAST_FORWARD consecutive time-ahead refusals, rebuilds without
*   fast-forward, so it cannot loop. The assist answers live in the page, so they survive a resync.
*   v1.4 (T9 EXAM flow): an EXAM session shows a countdown to the attempt deadline on the server clock (offset stored
*   by the exam slot); at the deadline it stops stepping, flushes the pending events within DEADLINE_FLUSH_TIMEOUT_MS,
*   posts /end and returns to the exam attempt (also when the end fails). "Finalizar sesión" in EXAM returns to the
*   exam the same way (record exam context, else the exam return record, else the evaluations list); `onEnded` still
*   overrides it. The assistance policy comes from the host prop or the record exam context (unknown = fail safe).
*   v1.5 (review of 180a0a1): the tab claim is released on a `pagehide` that may enter the back/forward cache
*   (`persisted`), because a held Web Lock makes the page ineligible for it, and claimed again on the `pageshow` that
*   restores it (another tab that took the session meanwhile turns this one read-only).
*   v1.6 (review of eb3c21b): a deadline that fires while the student's end is in flight waits for that end and then
*   leaves, and once the deadline is reached the student's end leaves on ANY outcome (error or busy included), so a
*   failed end can no longer strand the student; the countdown offset of an EXAM rebuilt without its exam context
*   (continue path) comes from the bootstrap (attempt `serverNow`), and the exam return record reaches the bootstrap.
*   v1.7 (review of e45841f): the deadline decides on the end-in-flight ref only (never a stale `session.ending`); a
*   rejected router.push resets the leave guard and falls back to `window.location.assign(url)`.
*   v1.8 (final review): a cancelled router.push (the Pages Router resolves `false`) takes the same fallback.
*   v1.9 (O1 notifications): focus mode (useFocusMode of the design system) while an EXAM session is on screen, so notification toasts do not interrupt the exam.
*   v2.0 (W2, Bloque 1): the session lifecycle (tab claim, bootstrap, useSimSession, assist history, end flow, EXAM
*   deadline, divergence resync) moved unchanged to SimSessionHost, which this page wraps around its view
*   (useSimSessionHost). The console receives the stable store adapter; the clock, the live objectives and a host
*   assist slot read their own slice of the session store and the countdown runs its own ticker, so the page does
*   not re-render per tick or per second.
* Versión: 2.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Head from "next/head";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { useFocusMode } from "@shared/design-system/components/use-focus-mode";
import { cx } from "@shared/lib/class-names";
import { VentilatorConsole } from "@shared/ventilator-console";
import { AssistLauncher } from "../components/assist-launcher";
import { DivergenceDialog } from "../components/divergence-dialog";
import { LiveCasePanel, SessionAssistSlot, SessionTimeControls } from "../components/live-session-widgets";
import { SimSessionHost, useSimSessionHost } from "../components/sim-session-host";
import type { SimSessionHostDeps, SimSessionRunning } from "../components/sim-session-host";
import { EVENT_PENDING_WARNING_COUNT } from "../config/sim-console.config";
import { DEADLINE_WARNING_MS } from "../config/sim-exam.config";
import { simulationModeLabel } from "../entities/simulator.entity";
import type { AssistancePolicyValue } from "../entities/sim-assist.entity";
import { formatCountdown } from "../entities/sim-exam.entity";
import type { SessionBoot } from "../entities/sim-session.entity";
import type { SimulationMode } from "../config/simulator.config";
import { buildSessionResultUrl, SIMULATOR_URL } from "../config/simulator.routes";
import { useExamDeadline } from "../hooks/use-exam-deadline";
import styles from "../../UI/session-console.module.css";

export { examReturnUrlOf } from "../components/sim-session-host";

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

export type SessionConsolePageProps = {
  sessionId: string
  /** Replaces the built-in AI assist launcher (T7); a function returning null hides it. */
  renderAssist?: ((context: AssistSlotContext) => ReactNode) | undefined
  /** Rubric assistance policy when the host knows it (T9 exam flow); unknown = fail safe (EXAM disabled). */
  assistancePolicy?: AssistancePolicyValue | null | undefined
  /** Replaces the navigation to the result after a successful end (T9: return to the exam). */
  onEnded?: ((sessionId: string) => void | Promise<void>) | undefined
  deps?: SimSessionHostDeps | undefined
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

type RunningViewProps = {
  running: SimSessionRunning
  sessionId: string
  renderAssist: SessionConsolePageProps["renderAssist"]
  assistancePolicy: SessionConsolePageProps["assistancePolicy"]
};

function RunningSessionView({ running, sessionId, renderAssist, assistancePolicy }: RunningViewProps) {
  const { assistHistory, onAssistAnswered } = useSimSessionHost();
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
        {store ? <LiveCasePanel store={store} caseId={record.caseId} engineCase={record.engineCase} /> : null}
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

type SessionConsoleViewProps = Pick<SessionConsolePageProps, "renderAssist" | "assistancePolicy">;

function SessionConsoleView({ renderAssist, assistancePolicy }: SessionConsoleViewProps) {
  const host = useSimSessionHost();
  const { sessionId, phase, mode, running } = host;

  useFocusMode(mode === "EXAM");

  let body: ReactNode;

  if (phase === "taken") {
    body = (
      <section className={cx(styles.notice)} role="alert">
        <h2 className={cx(styles.blockedTitle)}>{SESSION_PAGE_COPY.otherTab}</h2>
        <p>{SESSION_PAGE_COPY.otherTabHint}</p>
        <div className={cx(styles.noticeActions)}>
          <Link href={buildSessionResultUrl(sessionId)} className={cx(styles.link)}>{SESSION_PAGE_COPY.viewResult}</Link>
          <Link href={SIMULATOR_URL} className={cx(styles.link)}>{SESSION_PAGE_COPY.backToCatalog}</Link>
        </div>
      </section>
    );
  } else if (phase === "claiming") {
    body = <p className={cx(styles.consoleMuted)} role="status">{SESSION_PAGE_COPY.claiming}</p>;
  } else if (phase === "ended") {
    body = (
      <section className={cx(styles.notice)}>
        <p>{SESSION_PAGE_COPY.ended}</p>
        <Link href={buildSessionResultUrl(sessionId)} className={cx(styles.link)}>{SESSION_PAGE_COPY.viewResult}</Link>
      </section>
    );
  } else if (phase === "unavailable" && host.unavailable) {
    body = (
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
  } else if (phase === "ready" && running) {
    body = <RunningSessionView running={running} sessionId={sessionId} renderAssist={renderAssist} assistancePolicy={assistancePolicy} />;
  } else {
    body = <p className={cx(styles.consoleMuted)} role="status">{SESSION_PAGE_COPY.loading}</p>;
  }

  return (
    <div className={cx(styles.sessionPage)}>
      <Head>
        <title>{SESSION_PAGE_COPY.documentTitle}</title>
      </Head>
      <header className={cx(styles.sessionHeader)}>
        <h1 className={cx(styles.sessionTitle)}>{SESSION_PAGE_COPY.title}</h1>
        {mode ? <span className={cx(styles.modeTag)} data-mode={mode}>{simulationModeLabel(mode)}</span> : null}
      </header>
      {body}
    </div>
  );
}

export function SessionConsolePage({ sessionId, renderAssist, assistancePolicy, onEnded, deps }: SessionConsolePageProps) {
  return (
    <SimSessionHost sessionId={sessionId} onEnded={onEnded} deps={deps}>
      <SessionConsoleView renderAssist={renderAssist} assistancePolicy={assistancePolicy} />
    </SimSessionHost>
  );
}
