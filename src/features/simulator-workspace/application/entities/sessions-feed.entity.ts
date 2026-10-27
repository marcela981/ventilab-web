/*
* Funcionalidad: Sessions feed entity
* Descripción: Pure rules of the Mis sesiones tab of /simulador (W9, Bloque 1; DISENO_BLOQUE1 §3 and §2.8): ONE list
*   that merges the simulated sessions (history rows of the simulator) and the real-ventilator recordings (recording
*   rows of the lab), newest first, with the type filter Todas / Simuladas / Equipo real; and the view of the tab owned
*   by the URL: the list, the replay of a simulated session (`?replay=<id>`), its result (`?result=<id>`) or the
*   playback of a recording (`?recording=<id>`), plus the workspace URL of a replay used by other tabs. Depends only on
*   the row types of the simulator history and lab recordings entry points and the workspace tab entity.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { SessionHistoryRow } from "@features/simulator/history.entry";
import type { RecordingRow } from "@features/ventilator-lab/recordings.entry";
import type { WorkspaceTab } from "./workspace-tab.entity";

export const SESSIONS_TAB: WorkspaceTab = "sesiones";

/** Route of the unified simulator workspace. */
export const SIMULATOR_WORKSPACE_PATH = "/simulador";

export const SESSIONS_TYPE_FILTERS = ["all", "simulated", "real"] as const;

export type SessionsTypeFilter = (typeof SESSIONS_TYPE_FILTERS)[number];

// TODO(i18n): move to a simulator namespace in src/i18n.
export const SESSIONS_FILTER_LABELS: Record<SessionsTypeFilter, string> = {
  all: "Todas",
  simulated: "Simuladas",
  real: "Equipo real",
};

export type SimulatedFeedItem = { kind: "simulated", key: string, date: string, session: SessionHistoryRow };

export type RecordingFeedItem = { kind: "recording", key: string, date: string, recording: RecordingRow };

export type SessionsFeedItem = SimulatedFeedItem | RecordingFeedItem;

function toTime(iso: string): number {
  const time = Date.parse(iso);

  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

/** Simulated sessions and recordings in ONE list, newest first (start date), keeping only the filtered type. */
export function buildSessionsFeed(
  sessions: readonly SessionHistoryRow[],
  recordings: readonly RecordingRow[],
  filter: SessionsTypeFilter,
): SessionsFeedItem[] {
  const simulated: SessionsFeedItem[] = filter === "real"
    ? []
    : sessions.map((session) => ({ kind: "simulated", key: `simulated:${session.id}`, date: session.startedAt, session }));
  const real: SessionsFeedItem[] = filter === "simulated"
    ? []
    : recordings.map((recording) => ({ kind: "recording", key: `recording:${recording.id}`, date: recording.startsAt, recording }));

  // A stable order for equal dates: the key breaks the tie.
  return [...simulated, ...real].sort((a, b) => toTime(b.date) - toTime(a.date) || a.key.localeCompare(b.key));
}

export type SessionsView =
  | { kind: "list" }
  | { kind: "replay", sessionId: string }
  | { kind: "result", sessionId: string }
  | { kind: "recording", recordingId: string };

export const SESSIONS_LIST_VIEW: SessionsView = { kind: "list" };

/** Query keys of the tab views (only one is set at a time). */
export const SESSIONS_VIEW_KEYS = ["replay", "result", "recording"] as const;

type Query = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** View of a Next query: replay, then result, then recording; anything else is the list. */
export function parseSessionsView(query: Query): SessionsView {
  const replay = single(query.replay);

  if (replay !== null) {
    return { kind: "replay", sessionId: replay };
  }

  const result = single(query.result);

  if (result !== null) {
    return { kind: "result", sessionId: result };
  }

  const recording = single(query.recording);

  return recording === null ? SESSIONS_LIST_VIEW : { kind: "recording", recordingId: recording };
}

/** The query of a view: the rest of the query without any view key, the sessions tab and the key of `view`. */
export function sessionsViewQuery(query: Query, view: SessionsView): Query {
  const rest = Object.fromEntries(
    Object.entries(query).filter(([key]) => !(SESSIONS_VIEW_KEYS as readonly string[]).includes(key)),
  );
  const next: Query = { ...rest, tab: SESSIONS_TAB };

  if (view.kind === "replay" || view.kind === "result") {
    next[view.kind] = view.sessionId;
  } else if (view.kind === "recording") {
    next.recording = view.recordingId;
  }

  return next;
}

/** /simulador?tab=sesiones&replay=<id>: the replay of a session inside the Mis sesiones tab. */
export function buildWorkspaceReplayUrl(sessionId: string): string {
  return `${SIMULATOR_WORKSPACE_PATH}?tab=${SESSIONS_TAB}&replay=${encodeURIComponent(sessionId)}`;
}
