/*
* Funcionalidad: Prerequisites editor tests
* Descripción: Integration tests of the "Prerrequisitos" action of the content editor tree against msw (generous timeouts for runs under load): a level opens the dialog with its current prerequisites selected (GET /api/levels/{id}/prerequisites), the candidates are the other levels (never the level itself) and saving replaces the list with PUT /api/levels/{id}/prerequisites {prerequisiteLevelIds} and reads the tree again; a module lists the other modules grouped by level (never itself) and, when the backend answers 409 modules.module_circular_dependency, the dialog stays open with a message naming the selected module that already depends on the edited one and the chain (found by walking the dependents of GET /api/modules/{id}). Depends on vitest, Testing Library, msw and the content editor test helpers.
* Versión: 1.0 (C3)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  apiUrl,
  contentFixture,
  envelope,
  errorResponse,
  levelPrerequisitesDto,
  moduleDetailDto,
  renderWithSession,
} from "./content-editor-test-helpers";
import type { RefFixture } from "./content-editor-test-helpers";
import { ContentTreePage } from "./content-tree.page";

type Recorded = { method: string, path: string, body: unknown };

const LOAD_TIMEOUT = 5000;
const server = setupServer();
let requests: Recorded[] = [];

const BASIC: RefFixture = { id: "lv1", title: "Nivel básico" };
const EXPERT: RefFixture = { id: "lv2", title: "Nivel experto" };
const MECHANICS: RefFixture = { id: "m1", title: "Mecánica ventilatoria" };
const MODES: RefFixture = { id: "m2", title: "Modos" };
const WEANING: RefFixture = { id: "m3", title: "Destete" };

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  server.events.on("request:start", ({ request }) => {
    const url = new URL(request.url);
    const entry: Recorded = { method: request.method, path: `${url.pathname}${url.search}`, body: null };

    requests.push(entry);

    if (request.method !== "GET") {
      void request.clone().json().then((body: unknown) => {
        entry.body = body;
      }, () => undefined);
    }
  });
});

beforeEach(() => {
  requests = [];

  const { sections, levels, tree } = contentFixture();
  // Dependents: Modos requires Mecánica ventilatoria and Destete requires Modos.
  const modules: Record<string, ReturnType<typeof moduleDetailDto>> = {
    m1: moduleDetailDto(MECHANICS, [], [MODES]),
    m2: moduleDetailDto(MODES, [MECHANICS], [WEANING]),
    m3: moduleDetailDto(WEANING, [MODES]),
  };

  server.use(
    http.get(apiUrl("/api/sections"), () => HttpResponse.json(envelope(sections))),
    http.get(apiUrl("/api/levels"), () => HttpResponse.json(envelope(levels))),
    http.get(apiUrl("/api/teaching/tree"), () => HttpResponse.json(envelope(tree))),
    http.get(apiUrl("/api/levels/:id/prerequisites"), () => HttpResponse.json(envelope(levelPrerequisitesDto(EXPERT, [BASIC])))),
    http.put(apiUrl("/api/levels/:id/prerequisites"), () => HttpResponse.json(envelope(null))),
    http.get(apiUrl("/api/modules/:id"), ({ params }) => HttpResponse.json(envelope(modules[String(params.id)]))),
    http.put(apiUrl("/api/modules/:id/prerequisites"), () => errorResponse("modules.module_circular_dependency", 409)),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const calls = (method: string, prefix: string) => requests.filter((request) => request.method === method && request.path.startsWith(prefix));

async function openPrerequisites(expandTitles: string[], title: string): Promise<HTMLElement> {
  renderWithSession(<ContentTreePage />);
  await screen.findByText("Fundamentos", {}, { timeout: LOAD_TIMEOUT });

  for (const expandTitle of expandTitles) {
    fireEvent.click(screen.getByRole("button", { name: `Expandir ${expandTitle}` }));
  }

  fireEvent.click(screen.getByRole("button", { name: `Acciones de ${title}` }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Prerrequisitos" }));

  return screen.findByRole("dialog", { name: `Prerrequisitos de «${title}»` });
}

async function openOptions(dialog: HTMLElement): Promise<string[]> {
  const input = await within(dialog).findByRole("combobox", { name: "Prerrequisitos" }, { timeout: LOAD_TIMEOUT });

  fireEvent.mouseDown(input);

  return screen.getAllByRole("option").map((option) => option.textContent ?? "");
}

describe("Prerequisites editor", { timeout: 20_000 }, () => {
  it("opens a level with its current prerequisites and saves the replaced list", async() => {
    const dialog = await openPrerequisites(["Avanzado"], "Nivel experto");

    await within(dialog).findByText("Nivel básico", {}, { timeout: LOAD_TIMEOUT });
    expect(calls("GET", "/api/levels/lv2/prerequisites")).toHaveLength(1);

    const options = await openOptions(dialog);

    expect(options).toEqual(["Nivel básico", "Nivel libre"]);
    expect(options).not.toContain("Nivel experto");
    expect(screen.getByRole("option", { name: "Nivel básico" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Nivel libre" })).toHaveAttribute("aria-selected", "false");

    fireEvent.click(screen.getByRole("option", { name: "Nivel libre" }));
    const treeReads = calls("GET", "/api/teaching/tree").length;

    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Prerrequisitos guardados.", {}, { timeout: LOAD_TIMEOUT })).toBeInTheDocument();
    expect(calls("PUT", "/api/levels/lv2/prerequisites").map((request) => request.body)).toEqual([{ prerequisiteLevelIds: ["lv1", "lv9"] }]);
    await waitFor(() => expect(calls("GET", "/api/teaching/tree").length).toBeGreaterThan(treeReads));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lists the other modules grouped by level and explains a 409 cycle naming the dependency", async() => {
    const dialog = await openPrerequisites(["Fundamentos", "Nivel básico"], "Mecánica ventilatoria");
    const options = await openOptions(dialog);

    expect(options).toEqual(["Modos", "Destete"]);
    const listbox = screen.getByRole("listbox");

    expect(within(listbox).getByText("Nivel básico")).toBeInTheDocument();
    expect(within(listbox).getByText("Nivel experto")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: "Destete" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));

    expect(await within(dialog).findByText(
      "Se formaría un ciclo: «Destete» ya depende de «Mecánica ventilatoria» (Destete → Modos → Mecánica ventilatoria). Quita «Destete» de la selección.",
      {},
      { timeout: LOAD_TIMEOUT },
    )).toBeInTheDocument();
    expect(calls("PUT", "/api/modules/m1/prerequisites").map((request) => request.body)).toEqual([{ prerequisiteIds: ["m3"] }]);
    expect(calls("GET", "/api/modules/m2")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Prerrequisitos de «Mecánica ventilatoria»" })).toBeInTheDocument();
  });
});
