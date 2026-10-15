/*
* Funcionalidad: useAttempt tests
* Descripción: Integration test of useAttempt through useApiQuery against an msw backend: the onSuccess hook of its SWR config runs on a real response and records the client time at which the attempt's serverNow arrived (attempt-response-clock), which is what the timer uses to correct the server clock skew; a disabled query records nothing. Depends on vitest, Testing Library, msw, SWR and the evaluations test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearAttemptResponses, readAttemptResponseTime } from "../entities/attempt-response-clock";
import { apiUrl, attemptDetailDto, envelope } from "../pages/evaluations-test-helpers";
import { useAttempt } from "./use-attempt";

const server = setupServer();
const SERVER_NOW = "2026-10-14T15:00:00.000Z";

function wrapper({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>{children}</SWRConfig>;
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  clearAttemptResponses();
  server.use(
    http.get(apiUrl("/api/evaluation-attempts/:attemptId"), ({ params }) =>
      HttpResponse.json(envelope(attemptDetailDto(String(params.attemptId), { serverNow: SERVER_NOW })))),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("useAttempt", () => {
  it("records the client time of the response that carried serverNow", async() => {
    const before = Date.now();
    const { result } = renderHook(() => useAttempt("at1"), { wrapper });

    await waitFor(() => {
      expect(result.current.attempt?.id).toBe("at1");
    });

    const receivedAt = readAttemptResponseTime("at1", SERVER_NOW);

    expect(receivedAt).not.toBeNull();
    expect(receivedAt).toBeGreaterThanOrEqual(before);
    expect(receivedAt).toBeLessThanOrEqual(Date.now());
    expect(readAttemptResponseTime("at1", "2026-10-14T14:00:00.000Z")).toBeNull();
  });

  it("records nothing while the query is disabled", async() => {
    const { result } = renderHook(() => useAttempt(null), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(readAttemptResponseTime("at1", SERVER_NOW)).toBeNull();
  });
});
