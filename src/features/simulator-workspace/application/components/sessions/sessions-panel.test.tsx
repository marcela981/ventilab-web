/*
* Funcionalidad: Sessions panel tests
* Descripción: The Mis sesiones tab of /simulador (W9, Bloque 1) inside the real workspace (stateful router mock, the
*   history and recordings hooks of the entry points mocked, the lazy replay, result and recording player stubbed):
*   one list of simulated sessions and recordings newest first with the own patient name, the case title, mode,
*   status and score; the type filter; "Ver repetición" setting `?tab=sesiones&replay=<id>` (shallow, other keys kept)
*   and showing the replay in the panel, a `?replay=` URL opening it directly and "Volver a la lista" clearing it;
*   "Ver resultado" showing the result summary and its link to the replay; "Reproducir" playing a recording in the
*   panel; "Continuar" of a running FREE session opening it in Monitoreo; loading, empty, partial and full error states.
*   Depends on vitest, Testing Library and the workspace test helpers.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { configure, fireEvent, render, screen, within } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionHistoryRow, UseSessionHistoryRangeResult } from "@features/simulator/history.entry";
import type { RecordingResult, RecordingRow, RecordingsListResult } from "@features/ventilator-lab/recordings.entry";
import { ApiError } from "@shared/api-client/api-error";
import { SimulatorWorkspacePage } from "../../pages/simulator-workspace.page";
import { createSessionHarness, routerStore } from "../../workspace-test-helpers";

const mocks = vi.hoisted(() => ({
  history: null as unknown as UseSessionHistoryRangeResult,
  recordings: null as unknown as RecordingsListResult,
  recording: null as unknown as RecordingResult,
  recordingIds: [] as string[],
}));

vi.mock("next/router", async() => (await import("../../workspace-test-helpers")).nextRouterMock);
vi.mock("@features/simulator/history.entry", async(importOriginal) => ({
  ...await importOriginal<typeof import("@features/simulator/history.entry")>(),
  useSessionHistoryRange: () => mocks.history,
}));
vi.mock("@features/ventilator-lab/recordings.entry", async(importOriginal) => ({
  ...await importOriginal<typeof import("@features/ventilator-lab/recordings.entry")>(),
  useRecordingsList: () => mocks.recordings,
  useRecording: (id: string) => {
    mocks.recordingIds.push(id);

    return mocks.recording;
  },
  LazyRecordingPlayer: ({ index }: { index: { reservationId: string } }) => <p>{`recording player of ${index.reservationId}`}</p>,
}));
vi.mock("@features/simulator/replay.entry", () => ({
  SessionReplayView: ({ sessionId }: { sessionId: string }) => <p>{`replay of ${sessionId}`}</p>,
}));
vi.mock("@features/simulator/result.entry", () => ({
  SessionResultSummary: ({ sessionId }: { sessionId: string }) => <p>{`result summary of ${sessionId}`}</p>,
}));

vi.setConfig({ testTimeout: 20_000 });

beforeAll(() => {
  configure({ asyncUtilTimeout: 4000 });
});

afterAll(() => {
  configure({ asyncUtilTimeout: 1000 });
});

const API_ERROR = new ApiError({ status: 500, code: "internal", message: "boom" });

function sessionRow(overrides: Partial<SessionHistoryRow>): SessionHistoryRow {
  return {
    id: "s1",
    caseId: "case-1",
    mode: "FREE",
    status: "ENDED",
    startedAt: "2026-10-20T10:00:00.000Z",
    endedAt: "2026-10-20T10:10:00.000Z",
    durationMs: 600_000,
    score: 0.8,
    patient: null,
    caseTitle: "Neumonía grave",
    ...overrides,
  };
}

const RECORDING: RecordingRow = {
  id: "r1",
  startsAt: "2026-10-22T09:00:00.000Z",
  endsAt: "2026-10-22T09:30:00.000Z",
  durationMs: 1_800_000,
  holderText: null,
  inProgress: false,
  statusLabel: "Finalizada",
  note: null,
  url: "/lab/recordings/r1",
};

const OWN_PATIENT = sessionRow({
  id: "s2",
  startedAt: "2026-10-24T10:00:00.000Z",
  score: null,
  patient: {
    displayName: "María José",
    ageYears: 60,
    sex: "FEMALE",
    weightKg: 70,
    heightCm: 165,
    condition: "PNEUMONIA",
    difficulty: "INTERMEDIATE",
    diagnosis: null,
    allergies: [],
    history: [],
    vitals: { respiratoryRateBpm: 24, spo2Percent: 88, heartRateBpm: null, temperatureC: null, systolicMmHg: null, diastolicMmHg: null, glasgow: null, breathingPattern: null },
  } as unknown as SessionHistoryRow["patient"],
});

function historyOf(sessions: SessionHistoryRow[] | null, error: ApiError | null = null): UseSessionHistoryRangeResult {
  return {
    sessions,
    total: sessions?.length ?? null,
    isLoading: sessions === null && error === null,
    error,
    reload: vi.fn(() => Promise.resolve()),
    titlesLoading: false,
    titlesError: null,
    reloadTitles: vi.fn(() => Promise.resolve()),
  };
}

function recordingsOf(rows: RecordingRow[] | null, error: ApiError | null = null): RecordingsListResult {
  return {
    rows,
    range: { from: new Date("2026-09-25T00:00:00.000Z"), to: new Date("2026-10-26T00:00:00.000Z") },
    staff: false,
    isLoading: rows === null && error === null,
    error,
    reload: vi.fn(() => Promise.resolve()),
  };
}

beforeEach(() => {
  mocks.history = historyOf([sessionRow({}), OWN_PATIENT]);
  mocks.recordings = recordingsOf([RECORDING]);
  mocks.recording = {
    state: { status: "ready", index: { reservationId: "r1", count: 10, startServerTs: null, durationMs: 60_000, gaps: [] } },
    reload: vi.fn(),
  } as unknown as RecordingResult;
  mocks.recordingIds = [];
  routerStore.reset({ tab: "sesiones" });
});

function renderWorkspace(): void {
  render(<SimulatorWorkspacePage deps={createSessionHarness().deps} />);
}

async function findList(): Promise<HTMLElement> {
  return screen.findByRole("list", { name: "Sesiones, de la más reciente a la más antigua" });
}

function itemTexts(list: HTMLElement): string[] {
  return within(list).getAllByRole("listitem").map((item) => item.textContent ?? "");
}

describe("SessionsPanel", () => {
  it("lists simulated sessions and recordings in one list, newest first", async() => {
    renderWorkspace();

    const texts = itemTexts(await findList());

    expect(texts).toHaveLength(3);
    expect(texts[0]).toContain("María José");
    expect(texts[0]).toContain("Simulada");
    expect(texts[1]).toContain("Equipo real");
    expect(texts[1]).toContain("Duración: 30 min");
    expect(texts[2]).toContain("Neumonía grave");
    expect(texts[2]).toContain("Puntaje: 80");
  });

  it("filters by type", async() => {
    renderWorkspace();
    await findList();

    fireEvent.click(screen.getByRole("button", { name: "Equipo real" }));
    expect(itemTexts(await findList())).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Equipo real" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Simuladas" }));
    expect(itemTexts(await findList()).every((text) => text.includes("Simulada"))).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Todas" }));
    expect(itemTexts(await findList())).toHaveLength(3);
  });

  it("opens the replay in the panel and goes back to the list", async() => {
    routerStore.reset({ tab: "sesiones", session: "live-1" });
    renderWorkspace();
    await findList();

    fireEvent.click(screen.getByRole("button", { name: /^Ver repetición: Neumonía grave/ }));

    expect(routerStore.replace).toHaveBeenLastCalledWith(
      { pathname: "/simulador", query: { tab: "sesiones", session: "live-1", replay: "s1" } },
      undefined,
      { shallow: true },
    );
    expect(await screen.findByText("replay of s1")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Repetición de la sesión" })).toBeInTheDocument();
    expect(screen.getByText("Solo lectura")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Sesiones, de la más reciente a la más antigua" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Volver a la lista" }));

    expect(routerStore.query).toEqual({ tab: "sesiones", session: "live-1" });
    expect(screen.queryByText("replay of s1")).not.toBeInTheDocument();
    expect(await findList()).toBeVisible();
  });

  it("opens the replay named by the URL", async() => {
    routerStore.reset({ tab: "sesiones", replay: "s9" });
    renderWorkspace();

    expect(await screen.findByText("replay of s9")).toBeInTheDocument();
  });

  it("shows the result of a finished session with a link to its replay", async() => {
    renderWorkspace();
    await findList();

    fireEvent.click(screen.getByRole("button", { name: /^Ver resultado: Neumonía grave/ }));

    expect(routerStore.query).toEqual({ tab: "sesiones", result: "s1" });
    expect(await screen.findByText("result summary of s1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver repetición" }));

    expect(routerStore.query).toEqual({ tab: "sesiones", replay: "s1" });
    expect(await screen.findByText("replay of s1")).toBeInTheDocument();
  });

  it("plays a recording in the panel", async() => {
    renderWorkspace();
    await findList();

    fireEvent.click(screen.getByRole("button", { name: /^Reproducir: Ventilador físico/ }));

    expect(routerStore.query).toEqual({ tab: "sesiones", recording: "r1" });
    expect(await screen.findByText("recording player of r1")).toBeInTheDocument();
    expect(mocks.recordingIds).toContain("r1");
    expect(screen.getByText("Duración: 01:00")).toBeInTheDocument();
  });

  it("opens a running FREE session in Monitoreo", async() => {
    mocks.history = historyOf([sessionRow({ id: "s5", status: "ACTIVE", endedAt: null, score: null })]);
    renderWorkspace();
    await findList();

    fireEvent.click(screen.getByRole("button", { name: /^Continuar: Neumonía grave/ }));

    expect(routerStore.query).toEqual({ tab: "monitoreo", session: "s5" });
  });

  it("links a running EXAM session to its own console", async() => {
    mocks.history = historyOf([sessionRow({ id: "e1", mode: "EXAM", status: "ACTIVE", endedAt: null, score: null })]);
    renderWorkspace();

    expect(within(await findList()).getByRole("link", { name: /^Continuar/ })).toHaveAttribute("href", "/simulator/sessions/e1");
  });

  it("shows the loading, empty and error states", async() => {
    mocks.history = historyOf(null);
    mocks.recordings = recordingsOf(null);
    const { rerender } = render(<SimulatorWorkspacePage deps={createSessionHarness().deps} />);

    expect(await screen.findByRole("status", { name: "Cargando tus sesiones…" })).toBeInTheDocument();

    mocks.history = historyOf([]);
    mocks.recordings = recordingsOf([]);
    rerender(<SimulatorWorkspacePage deps={createSessionHarness().deps} />);
    expect(await screen.findByText("No tienes sesiones en este periodo.")).toBeInTheDocument();

    mocks.history = historyOf(null, API_ERROR);
    mocks.recordings = recordingsOf(null, API_ERROR);
    rerender(<SimulatorWorkspacePage deps={createSessionHarness().deps} />);
    expect(await screen.findByText("No se pudieron cargar tus sesiones")).toBeInTheDocument();
  });

  it("keeps the recordings when only the simulated sessions fail", async() => {
    mocks.history = historyOf(null, API_ERROR);
    renderWorkspace();

    expect(itemTexts(await findList())).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar las sesiones simuladas.");

    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Reintentar" }));
    expect(mocks.history.reload).toHaveBeenCalled();
  });
});
