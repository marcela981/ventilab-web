/*
* Funcionalidad: SimulatorCatalogPage tests
* Descripción: Renders /simulator against msw with a mocked next/router: the case cards (title, summary, difficulty and pathology chips, the "Validado por experto" badge only when the data carries the flag), the pathology filter sent to the server with the filtered empty state, "Iniciar práctica" creating a FREE session and opening its console, a start error shown on its card, the load error with retry, and the "Mis sesiones" tab (case, date, duration, score and status, result/replay links for a finished session, "Continuar" for a running one, empty state). Depends on Vitest, Testing Library, msw and the simulator test helpers.
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
import { SimulatorCatalogPage } from "./simulator-catalog.page";
import {
  apiUrl,
  caseItemDto,
  envelope,
  errorResponse,
  renderWithSwr,
  sessionDto,
  startedSessionDto,
} from "./simulator-test-helpers";

const router = vi.hoisted(() => ({ push: vi.fn(() => Promise.resolve(true)) }));

vi.mock("next/router", () => ({ useRouter: () => router }));

const server = setupServer();
let catalogQueries: Array<Record<string, string>> = [];

const validatedCase = caseItemDto("c2", { title: "EPOC reagudizado", pathology: "EPOC", difficulty: "ADVANCED" });
Object.assign(validatedCase.clinicalCase, { validatedByExpert: true });

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  router.push.mockClear();
  catalogQueries = [];
  server.use(http.get(apiUrl("/api/clinical-cases"), ({ request }) => {
    const query = Object.fromEntries(new URL(request.url).searchParams);
    catalogQueries.push(query);

    if (query.ids !== undefined) {
      return HttpResponse.json(envelope([caseItemDto("c1", { title: "SDRA moderado" })]));
    }

    if (query.pathology === "ASMA") {
      return HttpResponse.json(envelope([], { page: 1, pages: 0, limit: 24, total: 0 }));
    }

    return HttpResponse.json(envelope(
      [caseItemDto("c1", { title: "SDRA moderado", description: "Paciente con SDRA tras neumonía." }), validatedCase],
      { page: 1, pages: 1, limit: 24, total: 2 },
    ));
  }));
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const card = async(title: string) => screen.findByRole("article", { name: title });

describe("SimulatorCatalogPage — catalog", () => {
  it("shows the case cards with chips and the validated badge only when the data has the flag", async() => {
    renderWithSwr(<SimulatorCatalogPage />);

    const sdra = await card("SDRA moderado");
    const epoc = await card("EPOC reagudizado");

    expect(within(screen.getByRole("list", { name: "Casos clínicos disponibles" })).getAllByRole("article")).toHaveLength(2);
    expect(sdra).toHaveTextContent("Paciente con SDRA tras neumonía.");
    expect(sdra).toHaveTextContent("Básico");
    expect(sdra).toHaveTextContent("SDRA");
    expect(sdra).toHaveTextContent("54 años · 70 kg");
    expect(sdra).not.toHaveTextContent("Validado por experto");
    expect(epoc).toHaveTextContent("Avanzado");
    expect(epoc).toHaveTextContent("Validado por experto");
    expect(within(sdra).getByRole("button", { name: "Iniciar práctica" })).toBeEnabled();
  });

  it("filters by pathology on the server and shows the filtered empty state", async() => {
    renderWithSwr(<SimulatorCatalogPage />);
    await card("SDRA moderado");

    fireEvent.change(screen.getByRole("combobox", { name: "Patología" }), { target: { value: "ASMA" } });

    expect(await screen.findByText("Ningún caso coincide con los filtros.")).toBeInTheDocument();
    expect(screen.getByText("Prueba con otra patología o dificultad.")).toBeInTheDocument();
    expect(catalogQueries.at(-1)).toEqual({ page: "1", limit: "24", pathology: "ASMA" });

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(await card("SDRA moderado")).toBeInTheDocument();
  });

  it("starts a FREE practice and opens the session console", async() => {
    const bodies: unknown[] = [];

    server.use(http.post(apiUrl("/api/simulation/sessions"), async({ request }) => {
      bodies.push(await request.json());

      return HttpResponse.json(envelope(startedSessionDto("s1")), { status: 201 });
    }));
    renderWithSwr(<SimulatorCatalogPage />);

    fireEvent.click(within(await card("EPOC reagudizado")).getByRole("button", { name: "Iniciar práctica" }));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/simulator/sessions/s1");
    });
    expect(bodies).toEqual([{ mode: "FREE", caseId: "c2", timeMultiplier: 1 }]);
  });

  it("shows a start error on its card", async() => {
    server.use(http.post(apiUrl("/api/simulation/sessions"), () => errorResponse("simulation.case_not_ready", 409)));
    renderWithSwr(<SimulatorCatalogPage />);

    const sdra = await card("SDRA moderado");
    fireEvent.click(within(sdra).getByRole("button", { name: "Iniciar práctica" }));

    expect(await within(sdra).findByRole("alert")).toHaveTextContent("Este caso todavía no se puede simular.");
    expect(within(await card("EPOC reagudizado")).queryByRole("alert")).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows the load error and retries", async() => {
    server.use(http.get(apiUrl("/api/clinical-cases"), () => errorResponse("common.internal_error", 500), { once: true }));
    renderWithSwr(<SimulatorCatalogPage />);

    expect(await screen.findByText("No se pudieron cargar los casos clínicos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Reintentar/ }));

    expect(await card("SDRA moderado")).toBeInTheDocument();
  });
});

describe("SimulatorCatalogPage — Mis sesiones", () => {
  it("lists the sessions with case, date, duration, result and links", async() => {
    server.use(http.get(apiUrl("/api/simulation/sessions/history"), () => HttpResponse.json(envelope(
      [
        sessionDto("s1"),
        sessionDto("s2", { status: "ACTIVE", endedAt: null, score: null, caseId: "gone" }),
      ],
      { page: 1, pages: 1, limit: 10, total: 2 },
    ))));
    renderWithSwr(<SimulatorCatalogPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Mis sesiones" }));

    const finished = (await screen.findByRole("rowheader", { name: "SDRA moderado" })).closest("tr") as HTMLElement;

    expect(finished).toHaveTextContent("Práctica libre");
    expect(finished).toHaveTextContent("2 min 05 s");
    expect(finished).toHaveTextContent(/82\s?%/);
    expect(finished).toHaveTextContent("Finalizada");
    expect(within(finished).getByRole("link", { name: "Ver resultado" })).toHaveAttribute("href", "/simulator/sessions/s1/result");
    expect(within(finished).getByRole("link", { name: "Ver repetición" })).toHaveAttribute("href", "/simulator/sessions/s1/replay");

    const running = screen.getByRole("rowheader", { name: "Caso no disponible" }).closest("tr") as HTMLElement;

    expect(running).toHaveTextContent("En curso");
    expect(within(running).getByRole("link", { name: "Continuar" })).toHaveAttribute("href", "/simulator/sessions/s2");
    expect(within(running).queryByRole("link", { name: "Ver resultado" })).not.toBeInTheDocument();
  });

  it("shows the empty state without sessions", async() => {
    server.use(http.get(apiUrl("/api/simulation/sessions/history"), () => HttpResponse.json(envelope([], { page: 1, pages: 0, limit: 10, total: 0 }))));
    renderWithSwr(<SimulatorCatalogPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Mis sesiones" }));

    expect(await screen.findByText("Todavía no tienes sesiones de simulación.")).toBeInTheDocument();
  });
});
