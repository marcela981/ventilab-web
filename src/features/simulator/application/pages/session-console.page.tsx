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
* Versión: 1.7
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { cx } from "@shared/lib/class-names";
import { VentilatorConsole } from "@shared/ventilator-console";
import { AssistLauncher } from "../components/assist-launcher";
import { CasePanel } from "../components/case-panel";
import { DivergenceDialog } from "../components/divergence-dialog";
import { TimeControls } from "../components/time-controls";
import { EVENT_PENDING_WARNING_COUNT, TIME_AHEAD_REFUSALS_BEFORE_NO_FAST_FORWARD } from "../config/sim-console.config";
import { DEADLINE_FLUSH_TIMEOUT_MS, DEADLINE_WARNING_MS } from "../config/sim-exam.config";
import { simulationModeLabel } from "../entities/simulator.entity";
import type { AssistancePolicyValue, AssistTurn } from "../entities/sim-assist.entity";
import { formatCountdown } from "../entities/sim-exam.entity";
import { checkEngineVersion } from "../entities/sim-session.entity";
import type { SessionBoot, SessionRecord } from "../entities/sim-session.entity";
import type { SimulationMode } from "../config/simulator.config";
import { buildExamAttemptUrl, buildSessionResultUrl, EVALUATIONS_LIST_URL, SIMULATOR_URL } from "../config/simulator.routes";
import { useExamDeadline } from "../hooks/use-exam-deadline";
import { useSessionBootstrap } from "../hooks/use-session-bootstrap";
import { useSimSession } from "../hooks/use-sim-session";
import type { DivergenceCause, SimSessionDeps } from "../hooks/use-sim-session";
import { examReturnStore } from "../session/exam-return-store";
import type { ExamReturnStore } from "../session/exam-return-store";
import type { BootstrapDeps } from "../session/session-bootstrap";
import { sessionTabClaimer } from "../session/session-tab-claim";
import type { TabClaimResult } from "../session/session-tab-claim";
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

type ClaimFn = (sessionId: string) => Promise<TabClaimResult>;

const defaultClaim: ClaimFn = (sessionId) => sessionTabClaimer.claim(sessionId);

const NO_TURNS: readonly AssistTurn[] = [];

type TabClaimState = { sessionId: string, status: "claimed" | "taken" } | null;

/**
 * Claims the session for this tab while the page is mounted; "pending" until the claim resolves. A page that may enter
 * the back/forward cache (`pagehide` with `persisted`) releases the claim, since a held Web Lock blocks the cache, and
 * claims it again when it is restored (`pageshow` with `persisted`); the status stays until that new claim resolves.
 */
function useTabClaim(sessionId: string, claim: ClaimFn): "pending" | "claimed" | "taken" {
  const [state, setState] = useState<TabClaimState>(null);
  const claimRef = useRef(claim);

  useEffect(() => {
    claimRef.current = claim;
  });

  useEffect(() => {
    let active = true;
    // Bumped by every claim and release, so the result of a superseded claim is released at once.
    let generation = 0;
    const held: { release: (() => void) | null } = { release: null };

    const releaseHeld = (): void => {
      generation += 1;
      held.release?.();
      held.release = null;
    };

    const acquire = (): void => {
      const own = generation;

      void claimRef.current(sessionId).then((result) => {
        if (result.status === "claimed") {
          if (!active || own !== generation) {
            result.release();

            return;
          }

          held.release = result.release;
        }

        if (active && own === generation) {
          setState({ sessionId, status: result.status });
        }
      }, () => {
        // A failing claim must not block the student: fail open.
        if (active && own === generation) {
          setState({ sessionId, status: "claimed" });
        }
      });
    };

    const onPageHide = (event: PageTransitionEvent): void => {
      if (event.persisted) {
        releaseHeld();
      }
    };
    const onPageShow = (event: PageTransitionEvent): void => {
      if (event.persisted) {
        releaseHeld();
        acquire();
      }
    };

    acquire();
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      active = false;
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      releaseHeld();
    };
  }, [sessionId]);

  return state?.sessionId === sessionId ? state.status : "pending";
}

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
  deps?: {
    bootstrap?: Partial<BootstrapDeps> | undefined
    session?: SimSessionDeps | undefined
    /** One-tab claim of the session (default: Web Locks with a BroadcastChannel fallback). */
    claimTab?: ClaimFn | undefined
    /** Exam return record fallback of an EXAM session without its exam context. */
    examReturn?: ExamReturnStore | undefined
  } | undefined
};

type RunningProps = Omit<SessionConsolePageProps, "deps"> & {
  boot: SessionBoot
  sessionDeps?: SimSessionDeps | undefined
  examReturn?: ExamReturnStore | undefined
  /** Rebuilds the session from the server (divergence), after the old queue settled. */
  onResync: (cause: DivergenceCause | null) => void
  assistHistory: readonly AssistTurn[]
  onAssistAnswered: (turn: AssistTurn) => void
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

/** Where an ended EXAM session returns: the attempt of its exam context, of the exam return record, or the list. */
export function examReturnUrlOf(record: SessionRecord, store: ExamReturnStore): string {
  if (record.exam) {
    return record.exam.returnUrl;
  }

  const recorded = store.read(record.id);

  return recorded ? buildExamAttemptUrl(recorded.evaluationId, recorded.attemptId) : EVALUATIONS_LIST_URL;
}

function ExamCountdown({ remainingMs }: { remainingMs: number | null }) {
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

function RunningSession({ boot, sessionId, renderAssist, assistancePolicy, onEnded, sessionDeps, examReturn, onResync, assistHistory, onAssistAnswered }: RunningProps) {
  const router = useRouter();
  const { record } = boot;
  const exam = record.mode === "EXAM";
  const version = checkEngineVersion(record.mode, record.engineVersion);
  const blocked = version.status === "blocked";
  const session = useSimSession({ boot, blocked, deps: sessionDeps });
  const [confirming, setConfirming] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const [resyncing, setResyncing] = useState(false);
  const [deadlineReached, setDeadlineReached] = useState(false);
  const leftRef = useRef(false);
  // Read by the student's end after its await (its render closure predates the deadline).
  const deadlineRef = useRef(false);
  const endInFlightRef = useRef<Promise<unknown> | null>(null);
  const paused = session.status === "paused";
  const controllable = (session.status === "running" || session.status === "paused") && !deadlineReached;
  // The assist never pauses the simulation; it closes (and aborts) once the end starts.
  const assistActive = controllable && !session.ending && !session.diverged;
  // A host policy wins; otherwise the one the exam slot stored with the session (unknown = fail safe in EXAM).
  const policy = assistancePolicy !== undefined ? assistancePolicy : record.exam?.assistancePolicy ?? null;

  // One navigation away, whoever ends the session first (the student or the deadline).
  const leave = async(): Promise<void> => {
    if (leftRef.current) {
      return;
    }

    leftRef.current = true;

    if (onEnded) {
      await onEnded(sessionId);

      return;
    }

    const url = exam ? examReturnUrlOf(record, examReturn ?? examReturnStore) : buildSessionResultUrl(sessionId);

    try {
      await router.push(url);
    } catch {
      // A rejected client navigation (aborted, chunk load failure) must not strand the student on an ended session:
      // allow a later leave and fall back to a full page load.
      leftRef.current = false;
      window.location.assign(url);
    }
  };

  // Deadline: stop stepping (pause), flush the pending events within a bound, POST /end, then back to the exam even
  // if the end failed (the attempt is closed by the server anyway). A student end already in flight finishes alone.
  const onDeadline = (): void => {
    deadlineRef.current = true;
    setDeadlineReached(true);
    setConfirming(false);

    // The student's end is in flight: whatever its outcome, leave once it settles. Decided on the ref only: this
    // callback can run from a render closure whose `session.ending` is already stale.
    const inFlight = endInFlightRef.current;

    if (inFlight) {
      void inFlight.finally(() => leave());

      return;
    }

    void session.end({ flushTimeoutMs: DEADLINE_FLUSH_TIMEOUT_MS }).then(() => leave());
  };

  const remainingMs = useExamDeadline({
    deadline: exam ? record.expiresAt : null,
    serverOffsetMs: record.exam?.serverOffsetMs ?? boot.serverOffsetMs,
    onExpire: onDeadline,
  });

  // The new boot reads the outbox: let the old queue settle first.
  const resync = () => {
    if (resyncing) {
      return;
    }

    setResyncing(true);
    void session.settle().finally(() => onResync(session.divergenceCause));
  };

  const finish = async() => {
    setEndError(null);

    const pending = session.end();

    endInFlightRef.current = pending;

    const outcome = await pending.finally(() => {
      endInFlightRef.current = null;
    });

    // Past the deadline the student never stays: the server closes the attempt anyway.
    if (deadlineRef.current) {
      setConfirming(false);
      await leave();

      return;
    }

    if (outcome.status === "error") {
      setEndError(SESSION_PAGE_COPY.endFailed(outcome.message));
      setConfirming(false);

      return;
    }

    if (outcome.status === "ended") {
      setConfirming(false);
      await leave();
    }
  };

  const banners = (
    <>
      {version.status === "warning" ? <p className={cx(styles.banner)} data-tone="warning" role="status">{version.message}</p> : null}
      {deadlineReached ? <p className={cx(styles.banner)} data-tone="warning" role="alert">{SESSION_PAGE_COPY.deadlineReached}</p> : null}
      {session.workerError ? <p className={cx(styles.banner)} data-tone="error" role="alert">{session.workerError}</p> : null}
      {endError ? <p className={cx(styles.banner)} data-tone="error" role="alert">{endError}</p> : null}
      {session.changeError ? (
        <p className={cx(styles.banner)} data-tone="warning" role="alert">
          {session.changeError}
          {" "}
          <button type="button" className={cx(styles.bannerAction)} onClick={session.dismissChangeError}>
            {SESSION_PAGE_COPY.dismiss}
          </button>
        </p>
      ) : null}
    </>
  );

  if (blocked) {
    return (
      <>
        <section className={cx(styles.blocked)} role="alert" aria-label={SESSION_PAGE_COPY.versionBlocked}>
          <h2 className={cx(styles.blockedTitle)}>{SESSION_PAGE_COPY.versionBlocked}</h2>
          <p>{version.message}</p>
          <Link href={SIMULATOR_URL} className={cx(styles.link)}>{SESSION_PAGE_COPY.backToCatalog}</Link>
        </section>
      </>
    );
  }

  return (
    <>
      <div className={cx(styles.sessionBar)}>
        <TimeControls
          mode={record.mode}
          simTimeMs={session.simTimeMs}
          paused={paused}
          disabled={!controllable || session.ending}
          multiplier={session.multiplier}
          multiplierOptions={session.multiplierOptions}
          onMultiplierChange={session.setMultiplier}
          onPause={session.pause}
          onResume={session.resume}
        />
        <ExamCountdown remainingMs={remainingMs} />
        <div className={cx(styles.sessionActions)}>
          <PendingEventsIndicator count={session.pendingEvents} />
          {renderAssist
            ? renderAssist({ sessionId, mode: record.mode, simTimeMs: session.simTimeMs, active: assistActive })
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
            onClick={() => setConfirming(true)}
          >
            {session.ending ? SESSION_PAGE_COPY.ending : SESSION_PAGE_COPY.end}
          </button>
        </div>
      </div>
      {banners}
      <div className={cx(styles.sessionLayout)}>
        <div className={cx(styles.consoleArea)}>
          {session.adapter ? (
            <VentilatorConsole
              adapter={session.adapter}
              variant="live"
              {...(session.applicability ? { applicability: session.applicability } : {})}
            />
          ) : (
            <p className={cx(styles.consoleMuted)}>{session.workerError ?? SESSION_PAGE_COPY.starting}</p>
          )}
          {session.adapter && session.status === "starting" ? <p className={cx(styles.consoleMuted)} role="status">{SESSION_PAGE_COPY.starting}</p> : null}
        </div>
        <CasePanel caseId={record.caseId} engineCase={record.engineCase} objectives={session.objectives} />
      </div>
      <ConfirmDialog
        open={confirming}
        title={SESSION_PAGE_COPY.endTitle}
        description={SESSION_PAGE_COPY.endDescription}
        confirmLabel={SESSION_PAGE_COPY.endConfirm}
        cancelLabel={SESSION_PAGE_COPY.endCancel}
        isPending={session.ending}
        onConfirm={() => void finish()}
        onCancel={() => setConfirming(false)}
      />
      <DivergenceDialog open={session.diverged} detail={session.syncError} onReload={resync} />
    </>
  );
}

export function SessionConsolePage({ sessionId, renderAssist, assistancePolicy, onEnded, deps }: SessionConsolePageProps) {
  const claim = useTabClaim(sessionId, deps?.claimTab ?? defaultClaim);
  // Only the tab that drives the session boots it (a duplicated tab copies its sessionStorage).
  const { state, retry } = useSessionBootstrap(claim === "claimed" ? sessionId : null, { examReturn: deps?.examReturn, ...deps?.bootstrap });
  // Per session (a client-side navigation to another session keeps this component mounted).
  const [refusalState, setRefusalState] = useState({ sessionId, count: 0 });
  const timeAheadRefusals = refusalState.sessionId === sessionId ? refusalState.count : 0;
  // Kept above the remounted console, so the answers survive a resync.
  const [assistState, setAssistState] = useState<{ sessionId: string, turns: readonly AssistTurn[] }>({ sessionId, turns: [] });
  const assistHistory = assistState.sessionId === sessionId ? assistState.turns : NO_TURNS;
  const mode = state.status === "ready" ? state.boot.record.mode : null;

  const onAssistAnswered = useCallback((turn: AssistTurn) => {
    setAssistState((current) => {
      const turns = current.sessionId === sessionId ? current.turns : NO_TURNS;

      return turns.some((item) => item.aiHelpEventId === turn.aiHelpEventId) ? current : { sessionId, turns: [...turns, turn] };
    });
  }, [sessionId]);

  const onResync = (cause: DivergenceCause | null) => {
    const refusals = cause === "time_ahead" ? timeAheadRefusals + 1 : 0;

    setRefusalState({ sessionId, count: refusals });
    // A repeated time-ahead refusal means the fast-forward overshoots the server: resume at the last known time.
    retry({ fastForward: refusals < TIME_AHEAD_REFUSALS_BEFORE_NO_FAST_FORWARD });
  };

  let body: ReactNode;

  if (claim === "taken") {
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
  } else if (claim === "pending") {
    body = <p className={cx(styles.consoleMuted)} role="status">{SESSION_PAGE_COPY.claiming}</p>;
  } else if (state.status === "loading") {
    body = <p className={cx(styles.consoleMuted)} role="status">{SESSION_PAGE_COPY.loading}</p>;
  } else if (state.status === "ended") {
    body = (
      <section className={cx(styles.notice)}>
        <p>{SESSION_PAGE_COPY.ended}</p>
        <Link href={buildSessionResultUrl(sessionId)} className={cx(styles.link)}>{SESSION_PAGE_COPY.viewResult}</Link>
      </section>
    );
  } else if (state.status === "unavailable") {
    body = (
      <section className={cx(styles.notice)} role="alert">
        <h2 className={cx(styles.blockedTitle)}>{state.title}</h2>
        <p>{state.message}</p>
        <div className={cx(styles.noticeActions)}>
          <button type="button" className={cx(styles.timeButton)} onClick={() => retry()}>{SESSION_PAGE_COPY.retry}</button>
          <Link href={buildSessionResultUrl(sessionId)} className={cx(styles.link)}>{SESSION_PAGE_COPY.viewResult}</Link>
          <Link href={SIMULATOR_URL} className={cx(styles.link)}>{SESSION_PAGE_COPY.backToCatalog}</Link>
        </div>
      </section>
    );
  } else {
    body = (
      <RunningSession
        key={state.boot.record.id}
        boot={state.boot}
        sessionId={sessionId}
        renderAssist={renderAssist}
        assistancePolicy={assistancePolicy}
        onEnded={onEnded}
        sessionDeps={deps?.session}
        examReturn={deps?.examReturn}
        onResync={onResync}
        assistHistory={assistHistory}
        onAssistAnswered={onAssistAnswered}
      />
    );
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
