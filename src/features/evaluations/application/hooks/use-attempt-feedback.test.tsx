/*
* Funcionalidad: useAttemptFeedback tests
* Descripción: Hook tests of the backup feedback polling with vitest fake timers and an msw backend counting the feedback requests: while an item is PENDING it refetches after 10 s and then 20 s, it stops once nothing is pending, unmounting clears the pending poll, and a failed first read (404 race right after publication) is retried on the same schedule until the feedback arrives. Depends on vitest, Testing Library, msw, SWR and the evaluations test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentGradeFeedbackDTO } from "../../api/dtos/evaluations.dto";
import { apiUrl, envelope, errorResponse } from "../pages/evaluations-test-helpers";
import { useAttemptFeedback } from "./use-attempt-feedback";

const server = setupServer();
let requests = 0;
let failNext = 0;
let feedback: StudentGradeFeedbackDTO;

const item = (status: "PENDING" | "READY") =>
  ({ id: "f1", questionId: "q1", status, source: status === "READY" ? "LLM" as const : null, content: status === "READY" ? "Bien." : null });

function wrapper({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>{children}</SWRConfig>;
}

function renderFeedback() {
  return renderHook(() => useAttemptFeedback("at1", true), { wrapper });
}

async function advance(ms: number) {
  await act(async() => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  requests = 0;
  failNext = 0;
  feedback = { attemptId: "at1", overall: null, questions: [item("PENDING")] };
  server.use(
    http.get(apiUrl("/api/evaluation-attempts/:attemptId/feedback"), () => {
      requests += 1;

      if (failNext > 0) {
        failNext -= 1;

        return errorResponse("evaluation.feedback_not_found", 404);
      }

      return HttpResponse.json(envelope(feedback));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
});

afterAll(() => {
  server.close();
});

describe("useAttemptFeedback", () => {
  it("polls after 10 s and 20 s while pending and stops once nothing is pending", async() => {
    const { result } = renderFeedback();

    await waitFor(() => {
      expect(result.current.feedback).not.toBeNull();
    });
    expect(requests).toBe(1);

    await advance(10_000);
    await waitFor(() => {
      expect(requests).toBe(2);
    });

    await advance(15_000);
    expect(requests).toBe(2);

    feedback = { attemptId: "at1", overall: null, questions: [item("READY")] };
    await advance(5_000);
    await waitFor(() => {
      expect(requests).toBe(3);
    });
    await waitFor(() => {
      expect(result.current.feedback?.questions[0]?.status).toBe("READY");
    });

    await advance(180_000);
    expect(requests).toBe(3);
  });

  it("clears the scheduled poll on unmount", async() => {
    const { result, unmount } = renderFeedback();

    await waitFor(() => {
      expect(result.current.feedback).not.toBeNull();
    });
    unmount();
    await advance(60_000);

    expect(requests).toBe(1);
  });

  it("retries a failed first read until the feedback arrives", async() => {
    failNext = 1;

    const { result } = renderFeedback();

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    expect(result.current.feedback).toBeNull();

    feedback = { attemptId: "at1", overall: null, questions: [item("READY")] };
    await advance(10_000);

    await waitFor(() => {
      expect(result.current.feedback?.questions[0]?.status).toBe("READY");
    });
    expect(requests).toBe(2);

    await advance(120_000);
    expect(requests).toBe(2);
  });
});
