/*
* Funcionalidad: Sessions panel
* Descripción: Mis sesiones tab of /simulador (W9, Bloque 1; DISENO_BLOQUE1 §3 and §2.8), replacing the temporary
*   panel: the unified list of simulated sessions and real-ventilator recordings and, INSIDE the panel, the view the
*   URL names: the replay of a simulated session (`?tab=sesiones&replay=<id>`: the simulator replay in the read-only
*   console, lazy loaded, store-fed and throttled to 250 ms by useReplaySession, so no React commit per frame), its
*   result (`&result=<id>`: the simulator result summary, lazy loaded) or the playback of a recording
*   (`&recording=<id>`). Every view has "Volver a la lista", which drops its key from the URL. The list stays mounted
*   (hidden) under a view, so its filter and window survive. Depends on React.lazy, @shared/lib/retry-import, the
*   design-system loading state, the simulator replay and result entry points, the sessions list, the recording
*   view, the sessions view hook and the sessions styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
import type { SessionsView } from "../../entities/sessions-feed.entity";
import { useSessionsView } from "../../hooks/use-sessions-view";
import { RecordingView } from "./recording-view";
import { SESSIONS_LIST_COPY, SessionsList } from "./sessions-list";
import styles from "../../../UI/sessions/sessions-panel.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const SESSIONS_PANEL_COPY = {
  back: "Volver a la lista",
  readOnly: "Solo lectura",
  replayTitle: "Repetición de la sesión",
  resultTitle: "Resultado de la sesión",
  loadingReplay: "Cargando la repetición…",
  loadingResult: "Cargando el resultado de la sesión…",
  viewResult: "Ver resultado",
  viewReplay: "Ver repetición",
} as const;

const SessionReplayView = lazy(() =>
  retryImport(() => import("@features/simulator/replay.entry")).then((module) => ({ default: module.SessionReplayView })),
);

const SessionResultSummary = lazy(() =>
  retryImport(() => import("@features/simulator/result.entry")).then((module) => ({ default: module.SessionResultSummary })),
);

type DetailProps = {
  title: string
  tone: "console" | "surface"
  onBack: () => void
  actions?: ReactNode
  children: ReactNode
};

function Detail({ title, tone, onBack, actions, children }: DetailProps) {
  return (
    <section className={cx(styles.detail)} data-tone={tone} aria-label={title}>
      <header className={cx(styles.detailHeader)}>
        <button type="button" className={cx(styles.backButton)} onClick={onBack}>{SESSIONS_PANEL_COPY.back}</button>
        <h3 className={cx(styles.detailTitle)}>{title}</h3>
        {tone === "console" ? <span className={cx(styles.readOnlyTag)}>{SESSIONS_PANEL_COPY.readOnly}</span> : null}
        {actions ? <div className={cx(styles.detailActions)}>{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

function ViewDetail({ view, open, back }: { view: Exclude<SessionsView, { kind: "list" }>, open: (view: SessionsView) => void, back: () => void }) {
  if (view.kind === "replay") {
    const toResult = (
      <button type="button" className={cx(styles.linkButton)} onClick={() => open({ kind: "result", sessionId: view.sessionId })}>
        {SESSIONS_PANEL_COPY.viewResult}
      </button>
    );

    return (
      <Detail title={SESSIONS_PANEL_COPY.replayTitle} tone="console" onBack={back} actions={toResult}>
        <Suspense fallback={<LoadingState label={SESSIONS_PANEL_COPY.loadingReplay} />}>
          {/* Keyed by session: another replay never reuses the previous player. */}
          <SessionReplayView key={view.sessionId} sessionId={view.sessionId} />
        </Suspense>
      </Detail>
    );
  }

  if (view.kind === "result") {
    const toReplay = (
      <button type="button" className={cx(styles.linkButton)} onClick={() => open({ kind: "replay", sessionId: view.sessionId })}>
        {SESSIONS_PANEL_COPY.viewReplay}
      </button>
    );

    return (
      <Detail title={SESSIONS_PANEL_COPY.resultTitle} tone="surface" onBack={back} actions={toReplay}>
        <Suspense fallback={<LoadingState label={SESSIONS_PANEL_COPY.loadingResult} />}>
          <SessionResultSummary key={view.sessionId} sessionId={view.sessionId} />
        </Suspense>
      </Detail>
    );
  }

  return (
    <Detail title={SESSIONS_LIST_COPY.realTag} tone="console" onBack={back}>
      <RecordingView key={view.recordingId} recordingId={view.recordingId} />
    </Detail>
  );
}

export function SessionsPanel() {
  const { view, open, back } = useSessionsView();

  return (
    <section className={cx(styles.panel)} aria-labelledby="workspace-sesiones-title">
      <h2 id="workspace-sesiones-title" className={cx(styles.panelTitle)}>{SESSIONS_LIST_COPY.title}</h2>
      <div hidden={view.kind !== "list"}>
        <SessionsList onOpen={open} />
      </div>
      {view.kind === "list" ? null : <ViewDetail view={view} open={open} back={back} />}
    </section>
  );
}
