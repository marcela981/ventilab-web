/*
* Funcionalidad: Lazy staff groups pages tests
* Descripción: Verifies that the public GroupsPage and GroupDetailPage of the groups barrel load their page chunk on demand (a loading state first, then the real page) so the student-only /my-group route does not ship the staff code. v1.1 (T6b): a page chunk that still fails after the retries shows the RouteErrorBoundary chunk fallback with "Recargar" (retryImport mocked to reject with a ChunkLoadError on a fresh module graph). Depends on vitest, Testing Library, msw, the groups test helpers and the lazy staff pages.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { apiUrl, envelope, groupDto, renderWithSession } from "./groups-test-helpers";
import { GroupDetailPage, GroupsPage } from "./lazy-staff-pages";

// The lazy chunk is transformed on first use; under load that can take longer than the default 1 s.
const LAZY_WAIT = { timeout: 10000 };
// The test budget must exceed the lazy wait.
const LAZY_TEST_TIMEOUT = 15000;

const chunkFailure = vi.hoisted(() => ({ enabled: false }));

vi.mock("@shared/lib/retry-import", async(importOriginal) => {
  const actual = await importOriginal<typeof import("@shared/lib/retry-import")>();

  return {
    ...actual,
    retryImport: <T,>(importFn: () => Promise<T>, retries?: number, delayMs?: number): Promise<T> => {
      if (chunkFailure.enabled) {
        const error = new Error("Loading chunk 812 failed.");

        error.name = "ChunkLoadError";

        return Promise.reject(error);
      }

      return actual.retryImport(importFn, retries, delayMs);
    },
  };
});

const server = setupServer(
  http.get(apiUrl("/api/groups"), () => HttpResponse.json(envelope([groupDto(1)]))),
  http.get(apiUrl("/api/groups/g1"), () => HttpResponse.json(envelope({ ...groupDto(1), members: [] }))),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  chunkFailure.enabled = false;
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

describe("lazy staff groups pages", () => {
  it("loads the group list page on demand", async() => {
    renderWithSession(<GroupsPage />);

    expect(await screen.findByRole("heading", { level: 1, name: "Grupos" }, LAZY_WAIT)).toBeInTheDocument();
  }, LAZY_TEST_TIMEOUT);

  it("loads the group detail page on demand", async() => {
    renderWithSession(<GroupDetailPage groupId="g1" />);

    expect(await screen.findByRole("heading", { level: 1, name: "Grupo 01" }, LAZY_WAIT)).toBeInTheDocument();
  }, LAZY_TEST_TIMEOUT);

  it("shows the reload fallback when a page chunk cannot be loaded", async() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    chunkFailure.enabled = true;
    // React.lazy caches its promise per module instance: a fresh module graph gets lazy wrappers that never loaded.
    vi.resetModules();

    const fresh = await import("./lazy-staff-pages");

    render(<fresh.GroupDetailPage groupId="g1" />);

    expect(await screen.findByText("No se pudo cargar el contenido", undefined, LAZY_WAIT)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recargar" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  }, LAZY_TEST_TIMEOUT);
});
