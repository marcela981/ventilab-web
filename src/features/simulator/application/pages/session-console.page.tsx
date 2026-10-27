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
*   v2.1 (W6, Bloque 1): the session view (phase notices, session bar, console, case panel, end and divergence
*   dialogs) moved unchanged to SessionMonitor, which the /simulador Monitoreo tab reuses; this page keeps the EXAM and
*   direct-link host: SimSessionHost, the heading with the mode tag, the document title and the EXAM focus mode.
* Versión: 2.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Head from "next/head";
import { useFocusMode } from "@shared/design-system/components/use-focus-mode";
import { cx } from "@shared/lib/class-names";
import { SESSION_PAGE_COPY, SessionMonitor } from "../components/session-monitor";
import type { SessionMonitorProps } from "../components/session-monitor";
import { SimSessionHost, useSimSessionHost } from "../components/sim-session-host";
import type { SimSessionHostDeps } from "../components/sim-session-host";
import { simulationModeLabel } from "../entities/simulator.entity";
import styles from "../../UI/session-console.module.css";

export { examReturnUrlOf } from "../components/sim-session-host";
export { SESSION_PAGE_COPY } from "../components/session-monitor";
export type { AssistSlotContext } from "../components/session-monitor";

export type SessionConsolePageProps = Pick<SessionMonitorProps, "renderAssist" | "assistancePolicy"> & {
  sessionId: string
  /** Replaces the navigation to the result after a successful end (T9: return to the exam). */
  onEnded?: ((sessionId: string) => void | Promise<void>) | undefined
  deps?: SimSessionHostDeps | undefined
};

type SessionConsoleViewProps = Pick<SessionConsolePageProps, "renderAssist" | "assistancePolicy">;

function SessionConsoleView({ renderAssist, assistancePolicy }: SessionConsoleViewProps) {
  const host = useSimSessionHost();
  const { mode } = host;

  useFocusMode(mode === "EXAM");

  return (
    <div className={cx(styles.sessionPage)}>
      <Head>
        <title>{SESSION_PAGE_COPY.documentTitle}</title>
      </Head>
      <header className={cx(styles.sessionHeader)}>
        <h1 className={cx(styles.sessionTitle)}>{SESSION_PAGE_COPY.title}</h1>
        {mode ? <span className={cx(styles.modeTag)} data-mode={mode}>{simulationModeLabel(mode)}</span> : null}
      </header>
      <SessionMonitor host={host} renderAssist={renderAssist} assistancePolicy={assistancePolicy} />
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
