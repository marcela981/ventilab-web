/*
* Funcionalidad: GradingQueuePage tests
* Descripción: Verifies the /grading queue against MSW: the first page oldest first with student, evaluation, attempt, Bogota submission date, its age and auto score, the "Calificar" link; the evaluation, group and order filters sent as query params (back to page 1) with server pagination; the evaluation options merging READY evaluations with the loaded queue; the empty and the no-match states; and the error state with retry. Depends on vitest, Testing Library, msw, @shared/lib/format and the grading page, entities and test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDateTime } from "@shared/lib/format";
import type { GradingQueueItemDTO } from "../../api/dtos/grading.dto";
import { GRADING_ERROR_MESSAGES } from "../entities/grading-error-messages";
import { apiUrl, envelope, errorResponse, evaluationSummaryDto, groupDto, queueItemDto, renderWithSwr } from "./grading-test-helpers";
import { GradingQueuePage, QUEUE_COPY } from "./grading-queue.page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string, children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const server = setupServer();
const NOW = new Date("2026-10-14T11:00:00.000Z");

// Several list round trips; slow under a parallel run on a small machine.
vi.setConfig({ testTimeout: 20_000 });
let items: GradingQueueItemDTO[];
let total: number;
let queueQueries: URLSearchParams[] = [];
let failQueue: boolean;

function lastQuery(): Record<string, string> {
  return Object.fromEntries(queueQueries[queueQueries.length - 1] ?? []);
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  queueQueries = [];
  failQueue = false;
  total = 2;
  items = [
    queueItemDto("a1", { attemptNumber: 2 }),
    queueItemDto("a2", {
      evaluationId: "ev-old",
      evaluationTitle: "Taller archivado",
      evaluationType: "WORKSHOP",
      student: { id: "s2", name: null, email: "luis@ventylab.demo" },
      score: null,
      maxScore: 5,
      submittedAt: "2026-10-14T10:30:00.000Z",
    }),
  ];
  server.use(
    http.get(apiUrl("/api/evaluation-grading/queue"), ({ request }) => {
      const params = new URL(request.url).searchParams;
      const limit = Number(params.get("limit") ?? 10);

      queueQueries.push(params);

      if (failQueue) {
        return errorResponse("evaluation.grading_forbidden", 403);
      }

      return HttpResponse.json(envelope(items, { total, pages: Math.max(1, Math.ceil(total / limit)), page: Number(params.get("page") ?? 1), limit }));
    }),
    http.get(apiUrl("/api/evaluations"), () => HttpResponse.json(envelope([evaluationSummaryDto("ev-1", "Parcial de ventilación")]))),
    http.get(apiUrl("/api/groups"), () => HttpResponse.json(envelope([groupDto("g1", "Grupo A"), groupDto("g2", "Grupo B")]))),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("GradingQueuePage", () => {
  it("lists the pending attempts oldest first with their age, score and grading link", async() => {
    renderWithSwr(<GradingQueuePage now={NOW} />);

    expect(screen.getByRole("heading", { name: "Calificar" })).toBeInTheDocument();

    const table = await screen.findByRole("table", { name: "Intentos pendientes de calificación" });
    const first = within(table).getByRole("row", { name: /Ana Gómez/ });

    expect(first).toHaveTextContent("ana@ventylab.demo");
    expect(first).toHaveTextContent("Parcial de ventilación");
    expect(first).toHaveTextContent("Examen");
    expect(first).toHaveTextContent("#2");
    expect(first).toHaveTextContent(formatDateTime("2026-10-11T11:00:00.000Z"));
    expect(first).toHaveTextContent("hace 3 días");
    expect(first).toHaveTextContent("6 / 10");
    expect(within(first).getByRole("link", { name: "Calificar el intento de Ana Gómez" })).toHaveAttribute("href", "/grading/attempts/a1");

    const second = within(table).getByRole("row", { name: /luis@ventylab.demo/ });

    expect(second).toHaveTextContent("Taller");
    expect(second).toHaveTextContent("hace 30 minutos");
    expect(second).toHaveTextContent("—");
    expect(lastQuery()).toEqual({ sortOrder: "asc", page: "1", limit: "10" });
  });

  it("sends the evaluation, group and order filters as query params and paginates on the server", async() => {
    total = 25;
    renderWithSwr(<GradingQueuePage now={NOW} />);
    await screen.findByRole("table", { name: "Intentos pendientes de calificación" });

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    await waitFor(() => {
      expect(lastQuery()).toMatchObject({ page: "2" });
    });

    const evaluationSelect = screen.getByLabelText("Evaluación");

    await waitFor(() => {
      expect(within(evaluationSelect).getByRole("option", { name: "Parcial de ventilación" })).toBeInTheDocument();
    });
    // Archived evaluations still waiting for review come from the loaded queue page.
    expect(within(evaluationSelect).getByRole("option", { name: "Taller archivado" })).toBeInTheDocument();

    fireEvent.change(evaluationSelect, { target: { value: "ev-1" } });
    await waitFor(() => {
      expect(lastQuery()).toEqual({ evaluationId: "ev-1", sortOrder: "asc", page: "1", limit: "10" });
    });

    await waitFor(() => {
      expect(within(screen.getByLabelText("Grupo")).getByRole("option", { name: "Grupo B" })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText("Grupo"), { target: { value: "g2" } });
    fireEvent.click(screen.getByRole("button", { name: "Más recientes primero" }));
    await waitFor(() => {
      expect(lastQuery()).toEqual({ evaluationId: "ev-1", groupId: "g2", sortOrder: "desc", page: "1", limit: "10" });
    });
  });

  it("shows the empty state when nothing waits for review", async() => {
    items = [];
    total = 0;
    renderWithSwr(<GradingQueuePage now={NOW} />);

    expect(await screen.findByText(QUEUE_COPY.emptyTitle)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("offers to clear the filters when they match nothing", async() => {
    renderWithSwr(<GradingQueuePage now={NOW} />);
    await screen.findByRole("table", { name: "Intentos pendientes de calificación" });

    items = [];
    total = 0;
    await waitFor(() => {
      expect(within(screen.getByLabelText("Grupo")).getByRole("option", { name: "Grupo A" })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText("Grupo"), { target: { value: "g1" } });

    expect(await screen.findByText(QUEUE_COPY.noMatchTitle)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: QUEUE_COPY.clearFilters }));
    await waitFor(() => {
      expect(lastQuery()).toEqual({ sortOrder: "asc", page: "1", limit: "10" });
    });
  });

  it("shows the Spanish error with a retry", async() => {
    failQueue = true;
    renderWithSwr(<GradingQueuePage now={NOW} />);

    expect(await screen.findByText(GRADING_ERROR_MESSAGES["evaluation.grading_forbidden"])).toBeInTheDocument();

    failQueue = false;
    fireEvent.click(screen.getByRole("button", { name: /Reintentar/ }));

    expect(await screen.findByRole("table", { name: "Intentos pendientes de calificación" })).toBeInTheDocument();
  });
});
