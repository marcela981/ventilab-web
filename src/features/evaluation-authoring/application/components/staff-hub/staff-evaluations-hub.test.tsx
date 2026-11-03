/*
* Funcionalidad: StaffEvaluationsHub tests
* Descripción: Renders the staff evaluation hub with a mocked next/router and backend (msw): the default tab is Gestionar and loads the authoring list, the Calificar tab shows the pending badge from the shared count, `?tab=calificar` opens the grading queue and switching tabs writes `?tab=` with a shallow replace while the visited panels stay mounted; Resultados lists the READY evaluations with links to the statistics tab of the grading screen. Depends on vitest, Testing Library, msw and the authoring test helpers.
* Versión: 1.0
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
import { apiUrl, envelope, evaluationSummaryDto, renderWithProviders } from "../../pages/authoring-test-helpers";
import { StaffEvaluationsHub } from "./staff-evaluations-hub";

const router = vi.hoisted(() => ({
  isReady: true,
  pathname: "/evaluations",
  query: {} as Record<string, string>,
  push: vi.fn(() => Promise.resolve(true)),
  replace: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

const server = setupServer();
let listQueries: URLSearchParams[] = [];

vi.setConfig({ testTimeout: 20_000 });

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  router.query = {};
  router.replace.mockClear();
  listQueries = [];
  server.use(
    http.get(apiUrl("/api/evaluations"), ({ request }) => {
      listQueries.push(new URL(request.url).searchParams);

      return HttpResponse.json(envelope([evaluationSummaryDto("e1", { title: "Quiz de PEEP", status: "READY" })], { page: 1, limit: 10, total: 1, pages: 1 }));
    }),
    http.get(apiUrl("/api/evaluation-grading/queue/count"), () => HttpResponse.json(envelope({ pending: 3 }))),
    http.get(apiUrl("/api/evaluation-grading/queue"), () => HttpResponse.json(envelope([], { page: 1, limit: 10, total: 0, pages: 0 }))),
    http.get(apiUrl("/api/groups"), () => HttpResponse.json(envelope([]))),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("StaffEvaluationsHub", () => {
  it("opens Gestionar by default and shows the pending count on Calificar", async() => {
    renderWithProviders(<StaffEvaluationsHub />);

    expect(screen.getByRole("heading", { level: 1, name: "Evaluación" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Gestionar" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByRole("tab", { name: /Calificar.*3 pendientes/ })).toHaveAttribute("aria-selected", "false");

    const panel = screen.getByRole("tabpanel", { name: "Gestionar" });

    expect(await within(panel).findByText("Quiz de PEEP", {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Nueva evaluación" })).toHaveAttribute("href", "/evaluations/manage/new");
  });

  it("opens the tab of the URL and writes the chosen tab with a shallow replace", async() => {
    router.query = { tab: "calificar" };
    renderWithProviders(<StaffEvaluationsHub />);

    expect(screen.getByRole("tab", { name: /Calificar/ })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("No hay intentos pendientes de calificación", {}, { timeout: 10_000 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Resultados" }));

    expect(router.replace).toHaveBeenCalledWith(
      { pathname: "/evaluations", query: { tab: "resultados" } },
      undefined,
      { shallow: true },
    );
  });

  it("lists the READY evaluations with a link to their statistics", async() => {
    router.query = { tab: "resultados" };
    renderWithProviders(<StaffEvaluationsHub />);

    const link = await screen.findByRole("link", { name: "Ver resultados: Quiz de PEEP" }, { timeout: 10_000 });

    expect(link).toHaveAttribute("href", "/grading/evaluations/e1?tab=estadisticas");
    await waitFor(() => {
      expect(listQueries.some((query) => query.get("status") === "READY")).toBe(true);
    });
  });
});
