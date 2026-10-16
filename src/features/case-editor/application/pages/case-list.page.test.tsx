/*
* Funcionalidad: Case list page tests
* Descripción: Drives /simulator/cases against a mocked backend (msw) and a mocked next/router: the filters go to the
*   server as query params (status, pathology, difficulty; a change returns to page 1) and the status column appears
*   only while filtered by one status; the expert-validation note is shown (no filter or badge); pagination asks for
*   the next page; "Duplicar" posts /duplicate and opens the editor of the copy; "Publicar" and "Archivar" ask for
*   confirmation and send PATCH /status with the target status (a failure shows its toast); empty and error states
*   with retry. Depends on vitest, Testing Library, msw and the case editor test helpers.
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
import { apiUrl, caseItemDto, envelope, errorResponse, renderWithProviders } from "./case-editor-test-helpers";
import { CaseListPage } from "./case-list.page";

const router = vi.hoisted(() => ({ push: vi.fn(() => Promise.resolve(true)) }));

vi.mock("next/router", () => ({ useRouter: () => router }));

const server = setupServer();

vi.setConfig({ testTimeout: 15_000 });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  router.push.mockClear();
});

type Seen = URLSearchParams[];

function listHandler(seen: Seen, total = 2) {
  return http.get(apiUrl("/api/clinical-cases"), ({ request }) => {
    const params = new URL(request.url).searchParams;

    seen.push(params);

    const page = Number(params.get("page") ?? 1);

    return HttpResponse.json(envelope(
      [caseItemDto(`c${page}a`), caseItemDto(`c${page}b`)],
      { total, pages: Math.ceil(total / 10), page, limit: 10 },
    ));
  });
}

describe("CaseListPage", () => {
  it("sends the filters as server query params and shows the status column only when filtered by status", async() => {
    const seen: Seen = [];

    server.use(listHandler(seen));
    renderWithProviders(<CaseListPage />);

    expect(await screen.findByText("Caso c1a")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Estado" })).not.toBeInTheDocument();
    expect(screen.getByText(/La validación por experto no se puede filtrar ni mostrar/)).toBeInTheDocument();
    expect(seen[0]?.get("status")).toBeNull();
    expect(seen[0]?.get("sortOrder")).toBe("desc");

    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "DRAFT" } });
    await waitFor(() => expect(seen.at(-1)?.get("status")).toBe("DRAFT"));
    fireEvent.change(screen.getByLabelText("Patología"), { target: { value: "EPOC" } });
    fireEvent.change(screen.getByLabelText("Dificultad"), { target: { value: "ADVANCED" } });

    await waitFor(() => {
      const last = seen.at(-1);

      expect(last?.get("pathology")).toBe("EPOC");
      expect(last?.get("difficulty")).toBe("ADVANCED");
      expect(last?.get("page")).toBe("1");
    });
    expect(await screen.findByRole("columnheader", { name: "Estado" })).toBeInTheDocument();
    expect(screen.getAllByText("Borrador").length).toBeGreaterThan(0);
  });

  it("asks the server for the next page", async() => {
    const seen: Seen = [];

    server.use(listHandler(seen, 25));
    renderWithProviders(<CaseListPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Página siguiente" }));

    expect(await screen.findByText("Caso c2a")).toBeInTheDocument();
    expect(seen.at(-1)?.get("page")).toBe("2");
  });

  it("duplicates a case and opens the editor of the copy", async() => {
    const duplicated: string[] = [];

    server.use(
      listHandler([]),
      http.post(apiUrl("/api/clinical-cases/:caseId/duplicate"), ({ params }) => {
        duplicated.push(String(params.caseId));

        return HttpResponse.json(envelope({ id: "copy-1" }), { status: 201 });
      }),
    );
    renderWithProviders(<CaseListPage />);

    const row = (await screen.findByText("Caso c1a")).closest("tr") as HTMLElement;

    fireEvent.click(within(row).getByRole("button", { name: "Duplicar" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/simulator/cases/copy-1/edit"));
    expect(duplicated).toEqual(["c1a"]);
    expect(await screen.findByText("Se creó una copia de «Caso c1a».")).toBeInTheDocument();
  });

  it("publishes and archives after a confirmation, with PATCH /status", async() => {
    const patches: Array<{ id: string, status: unknown }> = [];

    server.use(
      listHandler([]),
      http.patch(apiUrl("/api/clinical-cases/:caseId/status"), async({ params, request }) => {
        const body = await request.json() as { status: unknown };

        patches.push({ id: String(params.caseId), status: body.status });

        return HttpResponse.json(envelope(null));
      }),
    );
    renderWithProviders(<CaseListPage />);

    const row = (await screen.findByText("Caso c1a")).closest("tr") as HTMLElement;

    fireEvent.click(within(row).getByRole("button", { name: "Archivar" }));

    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByText(/dejará de estar disponible para los estudiantes/)).toBeInTheDocument();
    expect(patches).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Archivar" }));

    await waitFor(() => expect(patches).toEqual([{ id: "c1a", status: "ARCHIVED" }]));
    expect(await screen.findByText("«Caso c1a» se archivó.")).toBeInTheDocument();

    // The list is revalidated after the change: read the row again.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(within((await screen.findByText("Caso c1a")).closest("tr") as HTMLElement).getByRole("button", { name: "Publicar" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Publicar" }));

    await waitFor(() => expect(patches.at(-1)).toEqual({ id: "c1a", status: "PUBLISHED" }));
  });

  it("cancels a status change without a request and shows a failure as a toast", async() => {
    let calls = 0;

    server.use(
      listHandler([]),
      http.patch(apiUrl("/api/clinical-cases/:caseId/status"), () => {
        calls += 1;

        return errorResponse("clinical-cases.clinical_case_not_simulation_ready", 409);
      }),
    );
    renderWithProviders(<CaseListPage />);

    const row = (await screen.findByText("Caso c1b")).closest("tr") as HTMLElement;

    fireEvent.click(within(row).getByRole("button", { name: "Publicar" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(calls).toBe(0);

    fireEvent.click(within(row).getByRole("button", { name: "Publicar" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Publicar" }));

    expect(await screen.findByText(/El caso no está listo para simular/)).toBeInTheDocument();
    expect(calls).toBe(1);
  });

  it("shows the empty state with the create action", async() => {
    server.use(http.get(apiUrl("/api/clinical-cases"), () => HttpResponse.json(envelope([], { total: 0, pages: 0, page: 1, limit: 10 }))));
    renderWithProviders(<CaseListPage />);

    expect(await screen.findByText("Aún no hay casos clínicos")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Nuevo caso" })[0]).toHaveAttribute("href", "/simulator/cases/new");
  });

  it("shows the load error with a retry", async() => {
    let fail = true;

    server.use(http.get(apiUrl("/api/clinical-cases"), () => (fail
      ? errorResponse("common.internal_error", 500)
      : HttpResponse.json(envelope([caseItemDto("c9")], { total: 1, pages: 1, page: 1, limit: 10 })))));
    renderWithProviders(<CaseListPage />);

    expect(await screen.findByText("No se pudieron cargar los casos clínicos")).toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: /Reintentar/ }));

    expect(await screen.findByText("Caso c9")).toBeInTheDocument();
  });
});
