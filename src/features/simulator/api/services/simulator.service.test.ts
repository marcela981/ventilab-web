/*
* Funcionalidad: Simulator services tests
* Descripción: Tests of the simulator API services against msw: the case definition GET by id (URI-encoded), the FREE session start (POST body exactly {mode, caseId, timeMultiplier}, response mapped to a started session), the catalog query (server-side filters, null filters omitted), the ids query of the history titles and the history query (optional filters omitted), the list item → card mapping (no badge without a boolean flag) and the history duration. v1.1: the catalog query always carries status=PUBLISHED. v1.2: the keepalive page-hide POST of the events (Bearer token, contract body, nothing sent for an empty list) and the session start read from the history ids filter. Depends on Vitest, msw, the token storage and the simulator test helpers.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { clearTokens, setAccessToken } from "@shared/api-client/token-storage";
import { buildCatalogQuery, NO_CATALOG_FILTERS } from "../../application/entities/simulator.entity";
import { apiUrl, caseItemDto, envelope, errorResponse, sessionDto, startedSessionDto } from "../../application/pages/simulator-test-helpers";
import { toCaseCard, toSessionHistoryItem } from "../mappers/simulator.mapper";
import { clinicalCasesByIdsQuery, clinicalCasesQuery, fetchCaseDefinition } from "./clinical-cases.service";
import {
  fetchSessionStartedAt,
  sendSimulationEventsKeepalive,
  sessionHistoryQuery,
  startSimulationSession,
} from "./simulation-sessions.service";

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("simulator services", () => {
  it("sends the page-hide events with a keepalive POST carrying the Bearer token and the contract body", async() => {
    const requests: Array<{ auth: string | null, body: unknown }> = [];
    const event = { id: "e1", simTimeMs: 4321, type: "PARAM_CHANGE" as const, payload: { changes: { peepCmH2O: 8 } } };

    setAccessToken("token-1");
    server.use(http.post(apiUrl("/api/simulation/sessions/s%201/events"), async({ request }) => {
      requests.push({ auth: request.headers.get("authorization"), body: await request.json() });

      return HttpResponse.json(envelope({ accepted: 1, duplicates: 0, lastSimTimeMs: 4321 }));
    }));

    sendSimulationEventsKeepalive("s 1", [event]);
    sendSimulationEventsKeepalive("s 1", []);

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toEqual({ auth: "Bearer token-1", body: { events: [event] } });
    clearTokens();
  });

  it("reads the session start from the history ids filter", async() => {
    const queries: string[] = [];

    server.use(http.get(apiUrl("/api/simulation/sessions/history"), ({ request }) => {
      queries.push(new URL(request.url).search);

      return HttpResponse.json(envelope([sessionDto("s1", { startedAt: "2026-10-15T10:00:00.000Z" })]));
    }));

    expect(await fetchSessionStartedAt("s1")).toBe("2026-10-15T10:00:00.000Z");
    expect(new URLSearchParams(queries[0]).get("ids")).toBe("s1");
  });

  it("starts a FREE session with the exact contract body and maps the response", async() => {
    const bodies: unknown[] = [];

    server.use(http.post(apiUrl("/api/simulation/sessions"), async({ request }) => {
      bodies.push(await request.json());

      return HttpResponse.json(envelope(startedSessionDto("s1", { seed: 7, case: { id: "c1" } as never })), { status: 201 });
    }));

    const session = await startSimulationSession({ mode: "FREE", caseId: "c1", timeMultiplier: 2 });

    expect(bodies).toEqual([{ mode: "FREE", caseId: "c1", timeMultiplier: 2 }]);
    expect(session).toMatchObject({ id: "s1", seed: 7, engineVersion: "1.0.0", expiresAt: null, engineCase: { id: "c1" } });
  });

  it("rejects a start error with the backend code", async() => {
    server.use(http.post(apiUrl("/api/simulation/sessions"), () => errorResponse("simulation.case_not_ready", 409)));

    await expect(startSimulationSession({ mode: "FREE", caseId: "c1", timeMultiplier: 1 })).rejects.toMatchObject({
      status: 409,
      code: "simulation.case_not_ready",
    });
  });

  it("reads a case definition by id", async() => {
    const ids: unknown[] = [];

    server.use(http.get(apiUrl("/api/clinical-cases/:caseId/definition"), ({ params }) => {
      ids.push(params.caseId);

      return HttpResponse.json(envelope({ id: params.caseId, title: "SDRA" }));
    }));

    await expect(fetchCaseDefinition("c/1")).resolves.toMatchObject({ id: "c/1", title: "SDRA" });
    expect(ids).toEqual(["c/1"]);
  });

  it("builds the catalog query of published cases with server-side filters and omits null filters", () => {
    expect(clinicalCasesQuery(buildCatalogQuery(NO_CATALOG_FILTERS, 1, 24))).toEqual({ page: 1, limit: 24, status: "PUBLISHED" });
    expect(clinicalCasesQuery(buildCatalogQuery({ pathology: "EPOC", difficulty: "ADVANCED" }, 2, 24))).toEqual({
      page: 2,
      limit: 24,
      pathology: "EPOC",
      difficulty: "ADVANCED",
      status: "PUBLISHED",
    });
  });

  it("builds the ids query of the history titles and the history query", () => {
    expect(clinicalCasesByIdsQuery(["c1", "c2"])).toEqual({ ids: "c1,c2", page: 1, limit: 2 });
    expect(sessionHistoryQuery({ page: 3, limit: 10 })).toEqual({ page: 3, limit: 10 });
    expect(sessionHistoryQuery({ page: 1, limit: 10, mode: "FREE", status: "ENDED", caseId: "c1" })).toEqual({
      page: 1,
      limit: 10,
      caseId: "c1",
      mode: "FREE",
      status: "ENDED",
    });
  });
});

describe("simulator mappers", () => {
  it("maps a list item to a card without a validated flag when the summary has none", () => {
    expect(toCaseCard(caseItemDto("c1"))).toMatchObject({ id: "c1", title: "Caso c1", validatedByExpert: null });

    const validated = caseItemDto("c2");
    Object.assign(validated.clinicalCase, { validatedByExpert: true });

    expect(toCaseCard(validated).validatedByExpert).toBe(true);
  });

  it("computes the history duration only for finished sessions", () => {
    expect(toSessionHistoryItem(sessionDto("s1")).durationMs).toBe(125_000);
    expect(toSessionHistoryItem(sessionDto("s2", { status: "ACTIVE", endedAt: null })).durationMs).toBeNull();
  });
});
