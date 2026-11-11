/*
* Funcionalidad: E2E helpers of Bloque A (simulator adjustments)
* Descripción: Steps shared by the e2e/bloque-a specs: start a FREE session of a catalog case through the API (case
*   and session multiplier chosen by the spec, e.g. the unstable ARDS case at ×4) and open it in Monitoreo
*   (/simulador?tab=monitoreo&session=<id>) until it is simulating; read the engine patient status chip ("Estado del
*   paciente") and a value card of "Valores del monitor"; move a July spinbutton to a value with its arrow keys (each
*   key steps the pending value, then Enviar sends it); read the stored session events, the summary and the replay through the API; and
*   replay a session in Node with the vendored engine (the same code the browser worker and the server run) to
*   compare it with the server summary. Depends on @playwright/test, the e2e auth and backend helpers and the vendored
*   simulation engine. v1.1 (2026-11-10, reverts A-1 to A-4): stepTo ends with Enviar (edits wait for it).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { replay } from "../../src/shared/sim-engine/engine/simulation";
import type { EngineCase, EngineEvent, EngineMetrics, TimeMultiplier } from "../../src/shared/sim-engine/engine/engine.types";
import { STUDENT_STORAGE_STATE } from "./auth";
import { backendApiAs, type BackendApi } from "./backend-api";
import { CURVES_LABEL } from "./simulator";

/** Seeded by the backend bootstrap (wt-a-server ClinicalCasesBootstrapService). */
export const UNSTABLE_CASE_ID = "engine-ards-unstable";
export const UNSTABLE_CASE_TITLE = "SDRA grave inestable";
/** A stable seeded case (normal lung) for the specs that only need a running session. */
export const NORMAL_CASE_ID = "engine-normal-lung";

export type StartedSession = { sessionId: string, api: BackendApi };

type StartedSessionDto = { id: string, timeMultiplier: number };

/** Starts a FREE session of a catalog case through the API and opens it in Monitoreo (simulating). */
export async function startCaseSession(page: Page, request: APIRequestContext, caseId: string, timeMultiplier: TimeMultiplier = 1): Promise<StartedSession> {
  const api = await backendApiAs(request, STUDENT_STORAGE_STATE);
  const started = await api.call<StartedSessionDto>("POST", "/api/simulation/sessions", { mode: "FREE", caseId, timeMultiplier });

  await page.goto(`/simulador?tab=monitoreo&session=${encodeURIComponent(started.id)}`);
  await expect(page.getByRole("status", { name: "Estado de la señal" })).toHaveText("Simulando", { timeout: 60_000 });
  await expect(page.getByRole("img", { name: CURVES_LABEL })).toBeVisible();

  return { sessionId: started.id, api };
}

/** The engine patient status chip of the left column (engine 2.0.0 cases with evolution). */
export function patientCondition(page: Page): Locator {
  return page.getByRole("status", { name: "Estado del paciente" });
}

/** The number shown by a value card of "Valores del monitor" (e.g. "SpO2"); null for "—". */
export async function cardValue(page: Page, label: string): Promise<number | null> {
  const term = page.getByRole("list", { name: "Valores del monitor" }).locator("dt").filter({ hasText: new RegExp(`^${label}$`) }).first();
  const text = await term.locator("xpath=following-sibling::dd[1]").innerText();
  const value = Number.parseFloat(text.replace(",", "."));

  return Number.isFinite(value) ? value : null;
}

/** Moves a July spinbutton to `target` with its arrow keys and sends it with Enviar (one change, 2026-11-10). */
export async function stepTo(page: Page, name: string, target: number): Promise<void> {
  const spin = page.getByRole("spinbutton", { name, exact: true });
  const current = async () => Number(await spin.getAttribute("aria-valuenow"));

  await spin.focus();

  for (let guard = 0; guard < 120 && (await current()) !== target; guard += 1) {
    await page.keyboard.press((await current()) < target ? "ArrowUp" : "ArrowDown");
  }

  await expect.poll(current).toBe(target);
  const send = page.getByRole("region", { name: "Valores" }).getByRole("button", { name: "Enviar" });

  if (await send.isEnabled()) {
    await send.click();
  }
}

export type StoredEvent = { id: string, simTimeMs: number, type: string, payload: { changes?: Record<string, unknown> } };

export type SessionReplayDto = {
  case: EngineCase
  seed: number
  events: StoredEvent[]
  engineVersion: string
  timeMultiplier: TimeMultiplier
};

export type SessionSummaryDto = {
  simTimeMs: number
  finalMetrics: EngineMetrics
  outcome: { status: string | null, firstCriticalAtMs: number | null, arrestAtMs: number | null, deceasedAtMs: number | null } | null
  timeline: { simTimeMs: number, kind: string, code?: string, changes?: { field: string, from: unknown, to: unknown }[] }[]
  resultsWithheld: boolean
};

export const sessionReplay = (api: BackendApi, sessionId: string): Promise<SessionReplayDto> =>
  api.call<SessionReplayDto>("GET", `/api/simulation/sessions/${encodeURIComponent(sessionId)}/replay`);

export const sessionSummary = (api: BackendApi, sessionId: string): Promise<SessionSummaryDto> =>
  api.call<SessionSummaryDto>("GET", `/api/simulation/sessions/${encodeURIComponent(sessionId)}/summary`);

/** The stored PARAM_CHANGE events of a session as engine events. */
export function engineEventsOf(stored: readonly StoredEvent[]): EngineEvent[] {
  return stored
    .filter((event) => event.type === "PARAM_CHANGE" && event.payload.changes !== undefined)
    .map((event) => ({ type: "PARAM_CHANGE", simTimeMs: event.simTimeMs, changes: event.payload.changes }) as EngineEvent);
}

/** Replays a stored session in Node with the vendored engine up to `untilMs` (the server summary time). */
export function replayLocally(stored: SessionReplayDto, untilMs: number): EngineMetrics {
  return replay(stored.case, stored.seed, engineEventsOf(stored.events), untilMs, { timeMultiplier: stored.timeMultiplier }).final;
}
