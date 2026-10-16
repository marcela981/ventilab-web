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
*   warning threshold).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import type { ReactNode } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { cx } from "@shared/lib/class-names";
import { VentilatorConsole } from "@shared/ventilator-console";
import { CasePanel } from "../components/case-panel";
import { DivergenceDialog } from "../components/divergence-dialog";
import { TimeControls } from "../components/time-controls";
import { EVENT_PENDING_WARNING_COUNT } from "../config/sim-console.config";
import { simulationModeLabel } from "../entities/simulator.entity";
import { checkEngineVersion } from "../entities/sim-session.entity";
import type { SessionBoot } from "../entities/sim-session.entity";
import type { SimulationMode } from "../config/simulator.config";
import { buildSessionResultUrl, SIMULATOR_URL } from "../config/simulator.routes";
import { useSessionBootstrap } from "../hooks/use-session-bootstrap";
import { useSimSession } from "../hooks/use-sim-session";
import type { SimSessionDeps } from "../hooks/use-sim-session";
import type { BootstrapDeps } from "../session/session-bootstrap";
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
} as const;

export type AssistSlotContext = {
  sessionId: string
  mode: SimulationMode
  simTimeMs: number
};

export type SessionConsolePageProps = {
  sessionId: string
  /** Slot for the AI assist (T7); nothing is rendered without it. */
  renderAssist?: ((context: AssistSlotContext) => ReactNode) | undefined
  /** Replaces the navigation to the result after a successful end (T9: return to the exam). */
  onEnded?: ((sessionId: string) => void | Promise<void>) | undefined
  deps?: { bootstrap?: Partial<BootstrapDeps> | undefined, session?: SimSessionDeps | undefined } | undefined
};

type RunningProps = Omit<SessionConsolePageProps, "deps"> & {
  boot: SessionBoot
  sessionDeps?: SimSessionDeps | undefined
  /** Rebuilds the session from the server (divergence). */
  onResync: () => void
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

function RunningSession({ boot, sessionId, renderAssist, onEnded, sessionDeps, onResync }: RunningProps) {
  const router = useRouter();
  const { record } = boot;
  const version = checkEngineVersion(record.mode, record.engineVersion);
  const blocked = version.status === "blocked";
  const session = useSimSession({ boot, blocked, deps: sessionDeps });
  const [confirming, setConfirming] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const paused = session.status === "paused";
  const controllable = session.status === "running" || session.status === "paused";

  const finish = async() => {
    setEndError(null);

    const outcome = await session.end();

    if (outcome.status === "error") {
      setEndError(SESSION_PAGE_COPY.endFailed(outcome.message));
      setConfirming(false);

      return;
    }

    if (outcome.status === "ended") {
      setConfirming(false);

      if (onEnded) {
        await onEnded(sessionId);
      } else {
        await router.push(buildSessionResultUrl(sessionId));
      }
    }
  };

  const banners = (
    <>
      {version.status === "warning" ? <p className={cx(styles.banner)} data-tone="warning" role="status">{version.message}</p> : null}
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
        <div className={cx(styles.sessionActions)}>
          <PendingEventsIndicator count={session.pendingEvents} />
          {renderAssist ? renderAssist({ sessionId, mode: record.mode, simTimeMs: session.simTimeMs }) : null}
          <button
            type="button"
            className={cx(styles.endButton)}
            disabled={!controllable || session.ending}
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
      <DivergenceDialog open={session.diverged} detail={session.syncError} onReload={onResync} />
    </>
  );
}

export function SessionConsolePage({ sessionId, renderAssist, onEnded, deps }: SessionConsolePageProps) {
  const { state, retry } = useSessionBootstrap(sessionId, deps?.bootstrap);
  const mode = state.status === "ready" ? state.boot.record.mode : null;

  let body: ReactNode;

  if (state.status === "loading") {
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
          <button type="button" className={cx(styles.timeButton)} onClick={retry}>{SESSION_PAGE_COPY.retry}</button>
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
        onEnded={onEnded}
        sessionDeps={deps?.session}
        onResync={retry}
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
