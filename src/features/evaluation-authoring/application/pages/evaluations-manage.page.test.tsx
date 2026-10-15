/*
* Funcionalidad: EvaluationsManagePage tests
* Descripción: Renders /evaluations/manage against a mocked backend (msw) with a mocked next/router: the first page lists title, type, status, questions, activations and the update date with the row actions; the type and status filters and the debounced title search become query params of `GET /api/evaluations` (back to page 1), the next page asks for page 2; "Duplicar" posts the duplicate and opens the editor of the copy; "Archivar" asks for confirmation and sends `PATCH .../status` ARCHIVED; a 409 invalid_status_transition shows its Spanish message; read-only rows have no actions; an empty list offers "Nueva evaluación". Depends on vitest, Testing Library, msw and the authoring test helpers. v1.1 (A3 review follow-up): archiving the only row of the last page steps back to the previous page.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDateTime } from "@shared/lib/format";
import type { EvaluationSummaryDTO } from "../../api/dtos/evaluation-authoring.dto";
import { AUTHORING_ERROR_MESSAGES } from "../entities/evaluation-authoring-error-messages";
import { apiUrl, envelope, errorResponse, evaluationSummaryDto, renderWithProviders } from "./authoring-test-helpers";
import { EvaluationsManagePage } from "./evaluations-manage.page";

const router = vi.hoisted(() => ({
  push: vi.fn(() => Promise.resolve(true)),
  replace: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

const server = setupServer();

// Some tests run several list round trips; slow under a parallel run on a small machine.
vi.setConfig({ testTimeout: 20_000 });
let evaluations: EvaluationSummaryDTO[];
let total: number;
let listQueries: URLSearchParams[] = [];
let statusBodies: Array<{ id: string, body: unknown }> = [];
let duplicates: string[] = [];

function lastQuery(): Record<string, string> {
  return Object.fromEntries(listQueries[listQueries.length - 1] ?? []);
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  router.push.mockClear();
  listQueries = [];
  statusBodies = [];
  duplicates = [];
  total = 2;
  evaluations = [
    evaluationSummaryDto("e1", { title: "Quiz de PEEP", status: "READY", questionCount: 8, assignmentCount: 2 }),
    evaluationSummaryDto("e2", { title: "Examen final", type: "EXAM", status: "DRAFT", scenarioCount: 1 }),
  ];
  server.use(
    http.get(apiUrl("/api/evaluations"), ({ request }) => {
      const params = new URL(request.url).searchParams;
      const limit = Number(params.get("limit") ?? 10);

      listQueries.push(params);

      return HttpResponse.json(envelope(evaluations, { total, pages: Math.max(1, Math.ceil(total / limit)), page: Number(params.get("page") ?? 1), limit }));
    }),
    http.post(apiUrl("/api/evaluations/:id/duplicate"), ({ params }) => {
      duplicates.push(String(params.id));

      return HttpResponse.json(envelope({ id: "copy-1" }), { status: 201 });
    }),
    http.patch(apiUrl("/api/evaluations/:id/status"), async({ params, request }) => {
      statusBodies.push({ id: String(params.id), body: await request.json() });

      return HttpResponse.json(envelope(null));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("EvaluationsManagePage", () => {
  it("lists the first page with its details and actions", async() => {
    renderWithProviders(<EvaluationsManagePage />);

    const table = await screen.findByRole("table", { name: "Evaluaciones" });
    const row = within(table).getByRole("row", { name: /Quiz de PEEP/ });

    expect(within(row).getByText("Quiz")).toBeInTheDocument();
    expect(within(row).getByText("Lista")).toBeInTheDocument();
    expect(within(row).getByText("8")).toBeInTheDocument();
    expect(within(row).getByText("2")).toBeInTheDocument();
    expect(within(row).getByText(formatDateTime("2026-10-02T15:30:00.000Z"))).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Editar «Quiz de PEEP»" })).toHaveAttribute("href", "/evaluations/manage/e1/edit");
    expect(within(row).getByRole("link", { name: "Activaciones «Quiz de PEEP»" })).toHaveAttribute("href", "/evaluations/manage/e1/assignments");
    expect(within(table).getByRole("row", { name: /Examen final/ })).toHaveTextContent("1 escenario");
    expect(screen.getByRole("link", { name: "Nueva evaluación" })).toHaveAttribute("href", "/evaluations/manage/new");
    expect(lastQuery()).toEqual({ sortBy: "updatedAt", sortOrder: "desc", page: "1", limit: "10" });
  });

  it("sends the filters and the debounced search as query params and paginates on the server", async() => {
    total = 25;
    renderWithProviders(<EvaluationsManagePage />);
    await screen.findByRole("table", { name: "Evaluaciones" });

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    await waitFor(() => {
      expect(lastQuery()).toMatchObject({ page: "2" });
    });

    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "EXAM" } });
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "ARCHIVED" } });
    await waitFor(() => {
      expect(lastQuery()).toEqual({ type: "EXAM", status: "ARCHIVED", sortBy: "updatedAt", sortOrder: "desc", page: "1", limit: "10" });
    });

    const requestsBefore = listQueries.length;

    fireEvent.change(screen.getByLabelText("Buscar por título"), { target: { value: "pe" } });
    fireEvent.change(screen.getByLabelText("Buscar por título"), { target: { value: "peep" } });

    await waitFor(() => {
      expect(lastQuery()).toMatchObject({ search: "peep", page: "1" });
    });
    // Only the settled term reaches the backend.
    expect(listQueries.slice(requestsBefore).map((query) => query.get("search"))).toEqual(["peep"]);
  });

  it("duplicates an evaluation and opens the editor of the copy", async() => {
    renderWithProviders(<EvaluationsManagePage />);

    fireEvent.click(await screen.findByRole("button", { name: "Duplicar «Quiz de PEEP»" }));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/evaluations/manage/copy-1/edit");
    });
    expect(duplicates).toEqual(["e1"]);
    expect(await screen.findByText("Se creó una copia de «Quiz de PEEP».")).toBeInTheDocument();
  });

  it("archives after confirmation", async() => {
    renderWithProviders(<EvaluationsManagePage />);

    fireEvent.click(await screen.findByRole("button", { name: "Archivar «Examen final»" }));

    const dialog = await screen.findByRole("dialog", { name: "¿Archivar la evaluación?" });

    expect(statusBodies).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Archivar" }));

    await waitFor(() => {
      expect(statusBodies).toEqual([{ id: "e2", body: { status: "ARCHIVED" } }]);
    });
    expect(await screen.findByText("«Examen final» se archivó.")).toBeInTheDocument();
  });

  it("steps back to the last available page after archiving the only row of the last page", async() => {
    const firstPage = Array.from({ length: 10 }, (_, index) => evaluationSummaryDto(`p${index}`, { title: `Evaluación ${index}` }));
    let lastRow: EvaluationSummaryDTO[] = [evaluationSummaryDto("last", { title: "Última evaluación", status: "DRAFT" })];

    total = 11;
    server.use(
      http.get(apiUrl("/api/evaluations"), ({ request }) => {
        const params = new URL(request.url).searchParams;
        const requestedPage = Number(params.get("page") ?? 1);

        listQueries.push(params);

        return HttpResponse.json(envelope(requestedPage === 1 ? firstPage : lastRow, {
          total,
          pages: Math.max(1, Math.ceil(total / 10)),
          page: requestedPage,
          limit: 10,
        }));
      }),
      http.patch(apiUrl("/api/evaluations/:id/status"), async({ params, request }) => {
        statusBodies.push({ id: String(params.id), body: await request.json() });
        lastRow = [];
        total = 10;

        return HttpResponse.json(envelope(null));
      }),
    );
    renderWithProviders(<EvaluationsManagePage />);
    await screen.findByRole("table", { name: "Evaluaciones" });

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    fireEvent.click(await screen.findByRole("button", { name: "Archivar «Última evaluación»" }));
    fireEvent.click(within(await screen.findByRole("dialog", { name: "¿Archivar la evaluación?" })).getByRole("button", { name: "Archivar" }));

    await waitFor(() => {
      expect(lastQuery()).toMatchObject({ page: "1" });
    });
    // Two list round trips (the empty last page, then the step back) plus the closing confirm dialog.
    expect(await screen.findByRole("row", { name: /Evaluación 0/ }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.queryByText("Ninguna evaluación coincide con los filtros")).not.toBeInTheDocument();
  });

  it("shows the Spanish message of a 409 when archiving fails", async() => {
    server.use(http.patch(apiUrl("/api/evaluations/:id/status"), () => errorResponse("evaluation.invalid_status_transition", 409)));
    renderWithProviders(<EvaluationsManagePage />);

    fireEvent.click(await screen.findByRole("button", { name: "Archivar «Quiz de PEEP»" }));
    fireEvent.click(within(await screen.findByRole("dialog", { name: "¿Archivar la evaluación?" })).getByRole("button", { name: "Archivar" }));

    expect(await screen.findByText(AUTHORING_ERROR_MESSAGES["evaluation.invalid_status_transition"])).toBeInTheDocument();
  });

  it("shows no actions on an evaluation the caller cannot manage", async() => {
    evaluations = [evaluationSummaryDto("e9", { title: "Ajena", canManage: false })];
    total = 1;
    renderWithProviders(<EvaluationsManagePage />);

    const row = await screen.findByRole("row", { name: /Ajena/ });

    expect(within(row).queryByRole("button")).not.toBeInTheDocument();
    expect(within(row).getByText("Solo lectura")).toBeInTheDocument();
  });

  it("offers to create the first evaluation when there is none", async() => {
    evaluations = [];
    total = 0;
    renderWithProviders(<EvaluationsManagePage />);

    expect(await screen.findByText("Aún no hay evaluaciones")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Nueva evaluación" }).length).toBeGreaterThan(0);
  });
});
