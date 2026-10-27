/*
* Funcionalidad: Sessions feed entity tests
* Descripción: Pure rules of the Mis sesiones tab of /simulador (W9, Bloque 1): simulated sessions and recordings
*   merged into one list sorted by start date (newest first, stable on ties), the type filter (Todas / Simuladas /
*   Equipo real), the view read from the query (replay before result before recording, empty or repeated values
*   ignored), the query of a view (keeps the other keys, drops the previous view, forces the sessions tab) and the
*   workspace replay URL. Depends on vitest and the sessions feed entity.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { SessionHistoryRow } from "@features/simulator/history.entry";
import type { RecordingRow } from "@features/ventilator-lab/recordings.entry";
import {
  buildSessionsFeed,
  buildWorkspaceReplayUrl,
  parseSessionsView,
  SESSIONS_LIST_VIEW,
  sessionsViewQuery,
} from "./sessions-feed.entity";

function session(id: string, startedAt: string): SessionHistoryRow {
  return {
    id,
    caseId: "case-1",
    mode: "FREE",
    status: "ENDED",
    startedAt,
    endedAt: startedAt,
    durationMs: 0,
    score: 0.8,
    patient: null,
    caseTitle: "Neumonía grave",
  };
}

function recording(id: string, startsAt: string): RecordingRow {
  return {
    id,
    startsAt,
    endsAt: startsAt,
    durationMs: 1_800_000,
    holderText: null,
    inProgress: false,
    statusLabel: "Finalizada",
    note: null,
    url: `/lab/recordings/${id}`,
  };
}

const SESSIONS = [session("s-old", "2026-10-01T10:00:00.000Z"), session("s-new", "2026-10-20T10:00:00.000Z")];
const RECORDINGS = [recording("r-mid", "2026-10-10T10:00:00.000Z"), recording("r-newest", "2026-10-25T08:00:00.000Z")];

describe("buildSessionsFeed", () => {
  it("merges simulated sessions and recordings newest first", () => {
    const feed = buildSessionsFeed(SESSIONS, RECORDINGS, "all");

    expect(feed.map((item) => item.key)).toEqual(["recording:r-newest", "simulated:s-new", "recording:r-mid", "simulated:s-old"]);
    expect(feed[1]).toMatchObject({ kind: "simulated", date: "2026-10-20T10:00:00.000Z", session: { id: "s-new" } });
    expect(feed[0]).toMatchObject({ kind: "recording", date: "2026-10-25T08:00:00.000Z", recording: { id: "r-newest" } });
  });

  it("keeps only the filtered type", () => {
    expect(buildSessionsFeed(SESSIONS, RECORDINGS, "simulated").map((item) => item.key)).toEqual(["simulated:s-new", "simulated:s-old"]);
    expect(buildSessionsFeed(SESSIONS, RECORDINGS, "real").map((item) => item.key)).toEqual(["recording:r-newest", "recording:r-mid"]);
  });

  it("orders equal dates by key and puts an unreadable date last", () => {
    const sameDate = "2026-10-05T10:00:00.000Z";
    const feed = buildSessionsFeed([session("b", sameDate), session("bad", "not a date")], [recording("a", sameDate)], "all");

    expect(feed.map((item) => item.key)).toEqual(["recording:a", "simulated:b", "simulated:bad"]);
  });

  it("gives an empty list without rows", () => {
    expect(buildSessionsFeed([], [], "all")).toEqual([]);
  });
});

describe("sessions view", () => {
  it("reads the view from the query", () => {
    expect(parseSessionsView({ tab: "sesiones" })).toEqual(SESSIONS_LIST_VIEW);
    expect(parseSessionsView({ tab: "sesiones", replay: "s1" })).toEqual({ kind: "replay", sessionId: "s1" });
    expect(parseSessionsView({ result: "s2" })).toEqual({ kind: "result", sessionId: "s2" });
    expect(parseSessionsView({ recording: "r1" })).toEqual({ kind: "recording", recordingId: "r1" });
    expect(parseSessionsView({ replay: "s1", result: "s2", recording: "r1" })).toEqual({ kind: "replay", sessionId: "s1" });
    expect(parseSessionsView({ replay: "", recording: ["r1", "r2"] })).toEqual(SESSIONS_LIST_VIEW);
  });

  it("builds the query of a view keeping the other keys", () => {
    const query = { tab: "monitoreo", session: "live-1", replay: "old" };

    expect(sessionsViewQuery(query, { kind: "result", sessionId: "s1" })).toEqual({ tab: "sesiones", session: "live-1", result: "s1" });
    expect(sessionsViewQuery(query, { kind: "recording", recordingId: "r1" })).toEqual({ tab: "sesiones", session: "live-1", recording: "r1" });
    expect(sessionsViewQuery(query, SESSIONS_LIST_VIEW)).toEqual({ tab: "sesiones", session: "live-1" });
  });

  it("links the replay of a session inside Mis sesiones", () => {
    expect(buildWorkspaceReplayUrl("s 1/2")).toBe("/simulador?tab=sesiones&replay=s%201%2F2");
  });
});
