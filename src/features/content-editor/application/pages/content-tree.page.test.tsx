/*
* Funcionalidad: ContentTreePage tests
* Descripción: Integration tests of the content editor tree against msw (generous timeouts for runs under load): composition (sections in order, "Sin sección" levels, status badges) and lesson pages loaded only when the lesson is expanded; text and status filters keeping ancestors; creating a child (POST with the next order, then the tree is read again); status change methods (PATCH for sections, PUT {status} for modules); the warning when publishing under a draft ancestor; and the delete 409 (student data) flow that offers "Archivar en su lugar" and sends ARCHIVED (PUT for a module, PATCH for a section). Depends on vitest, Testing Library, msw and the content editor test helpers.
* Versión: 1.0 (C1)
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
import { apiUrl, contentFixture, envelope, errorResponse, pageSummaryDto, renderWithSession } from "./content-editor-test-helpers";
import { ContentTreePage } from "./content-tree.page";

type Recorded = { method: string, path: string, body: unknown };

// Generous waits: the suite also runs in parallel with the whole learning suite on a slow machine.
const LOAD_TIMEOUT = 5000;
const server = setupServer();
let requests: Recorded[] = [];

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
  const ok = () => HttpResponse.json(envelope(null));

  server.use(
    http.get(apiUrl("/api/sections"), () => HttpResponse.json(envelope(sections))),
    http.get(apiUrl("/api/levels"), () => HttpResponse.json(envelope(levels))),
    http.get(apiUrl("/api/teaching/tree"), () => HttpResponse.json(envelope(tree))),
    http.get(apiUrl("/api/pages"), ({ request }) => {
      const lessonId = new URL(request.url).searchParams.get("lessonId") ?? "";

      return HttpResponse.json(envelope([pageSummaryDto("p2", lessonId, 2, "Gráficas"), pageSummaryDto("p1", lessonId, 1, "Introducción", "DRAFT")]));
    }),
    http.post(apiUrl("/api/modules"), () => HttpResponse.json(envelope(null), { status: 201 })),
    http.put(apiUrl("/api/modules/:id"), ok),
    http.patch(apiUrl("/api/sections/:id/status"), ok),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const calls = (method: string, prefix: string) => requests.filter((request) => request.method === method && request.path.startsWith(prefix));

async function renderTree() {
  renderWithSession(<ContentTreePage />);
  await screen.findByText("Fundamentos", {}, { timeout: LOAD_TIMEOUT });
}

function expand(title: string) {
  fireEvent.click(screen.getByRole("button", { name: `Expandir ${title}` }));
}

function chooseAction(title: string, action: string) {
  fireEvent.click(screen.getByRole("button", { name: `Acciones de ${title}` }));
  fireEvent.click(screen.getByRole("menuitem", { name: action }));
}

function rowOf(title: string): HTMLElement {
  const row = screen.getByText(title).closest("li");

  if (!row) {
    throw new Error(`row ${title} missing`);
  }

  return row;
}

describe("ContentTreePage", { timeout: 20_000 }, () => {
  it("composes sections, unsectioned levels and status badges", async() => {
    await renderTree();

    const sectionTitles = screen.getAllByText(/^(Fundamentos|Avanzado)$/).map((element) => element.textContent);

    expect(sectionTitles).toEqual(["Fundamentos", "Avanzado"]);
    expect(within(rowOf("Avanzado")).getByText("Borrador")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Sin sección" })).getByText("Nivel libre")).toBeInTheDocument();

    expand("Fundamentos");
    expand("Nivel básico");
    expect(within(rowOf("Modos")).getByText("Borrador")).toBeInTheDocument();
    expect(within(rowOf("Mecánica ventilatoria")).getAllByText("Publicado")[0]).toBeInTheDocument();
  });

  it("loads the pages of a lesson only when it is expanded", async() => {
    await renderTree();
    expand("Fundamentos");
    expand("Nivel básico");
    expand("Mecánica ventilatoria");

    expect(screen.getByText("Presiones")).toBeInTheDocument();
    expect(calls("GET", "/api/pages")).toHaveLength(0);

    expand("Presiones");

    const link = await screen.findByRole("link", { name: "Introducción" }, { timeout: LOAD_TIMEOUT });

    expect(link).toHaveAttribute("href", "/content/pages/p1");
    expect(calls("GET", "/api/pages").map((request) => request.path)).toEqual(["/api/pages?lessonId=l1"]);
    expect(screen.getAllByRole("link").map((element) => element.textContent)).toEqual(["Introducción", "Gráficas"]);
  });

  it("filters by text and by status keeping the ancestors", async() => {
    await renderTree();

    fireEvent.change(screen.getByLabelText("Buscar por título"), { target: { value: "destete" } });

    expect(await screen.findByText("Destete")).toBeInTheDocument();
    expect(screen.getByText("Avanzado")).toBeInTheDocument();
    expect(screen.getByText("Nivel experto")).toBeInTheDocument();
    expect(screen.queryByText("Fundamentos")).not.toBeInTheDocument();
    expect(screen.queryByText("Nivel libre")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar por título"), { target: { value: "" } });
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Estado" }));
    fireEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: "Borrador" }));

    expect(await screen.findByText("Modos")).toBeInTheDocument();
    expect(screen.queryByText("Mecánica ventilatoria")).not.toBeInTheDocument();
    expect(screen.getByText("Destete")).toBeInTheDocument();
  });

  it("creates a child with the next order and reads the tree again", async() => {
    await renderTree();
    expand("Fundamentos");

    const treeReads = calls("GET", "/api/teaching/tree").length;

    chooseAction("Nivel básico", "Nuevo módulo");

    const dialog = await screen.findByRole("dialog", { name: "Nuevo módulo" });

    fireEvent.change(within(dialog).getByLabelText(/Título/), { target: { value: "Monitoreo" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Crear" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Nuevo módulo" })).not.toBeInTheDocument());
    expect(calls("POST", "/api/modules")[0]?.body).toEqual({ title: "Monitoreo", status: "DRAFT", levelId: "lv1", order: 3 });
    expect(calls("GET", "/api/teaching/tree").length).toBeGreaterThan(treeReads);
  });

  it("validates the form before sending", async() => {
    await renderTree();
    expand("Fundamentos");
    chooseAction("Nivel básico", "Nuevo módulo");

    const dialog = await screen.findByRole("dialog", { name: "Nuevo módulo" });

    fireEvent.click(within(dialog).getByRole("button", { name: "Crear" }));

    expect(await within(dialog).findByText("Escribe un título.")).toBeInTheDocument();
    expect(calls("POST", "/api/modules")).toHaveLength(0);
  });

  it("changes the status with PATCH for sections and PUT for the other kinds", async() => {
    await renderTree();

    chooseAction("Fundamentos", "Borrador");
    await waitFor(() => expect(calls("PATCH", "/api/sections/s1/status")).toHaveLength(1));
    await waitFor(() => expect(calls("PATCH", "/api/sections/s1/status")[0]?.body).toEqual({ status: "DRAFT" }));

    expand("Fundamentos");
    expand("Nivel básico");
    chooseAction("Mecánica ventilatoria", "Archivado");
    await waitFor(() => expect(calls("PUT", "/api/modules/m1")[0]?.body).toEqual({ status: "ARCHIVED" }));
  });

  it("warns before publishing under a draft ancestor", async() => {
    await renderTree();
    expand("Avanzado");
    expand("Nivel experto");
    chooseAction("Destete", "Publicado");

    const dialog = await screen.findByRole("dialog", { name: "¿Publicar «Destete»?" });

    expect(within(dialog).getByText(/sección «Avanzado» esté en estado borrador/)).toBeInTheDocument();
    expect(calls("PUT", "/api/modules")).toHaveLength(0);

    fireEvent.click(within(dialog).getByRole("button", { name: "Publicar de todos modos" }));
    await waitFor(() => expect(calls("PUT", "/api/modules/m3")[0]?.body).toEqual({ status: "PUBLISHED" }));
  });

  it("offers to archive a module with student data instead of deleting it", async() => {
    server.use(http.delete(apiUrl("/api/modules/:id"), () => errorResponse("curriculum.node_has_student_data", 409)));
    await renderTree();
    expand("Fundamentos");
    expand("Nivel básico");
    chooseAction("Modos", "Eliminar");

    fireEvent.click(within(await screen.findByRole("dialog", { name: "¿Eliminar «Modos»?" })).getByRole("button", { name: "Eliminar" }));

    const archive = await screen.findByRole("dialog", { name: "No se puede eliminar" });

    expect(calls("DELETE", "/api/modules/m2")).toHaveLength(1);
    fireEvent.click(within(archive).getByRole("button", { name: "Archivar en su lugar" }));
    await waitFor(() => expect(calls("PUT", "/api/modules/m2")[0]?.body).toEqual({ status: "ARCHIVED" }));
  });

  it("archives a section with PATCH after a student-data 409", async() => {
    server.use(http.delete(apiUrl("/api/sections/:id"), () => errorResponse("curriculum.node_has_student_data", 409)));
    await renderTree();
    chooseAction("Avanzado", "Eliminar");

    fireEvent.click(within(await screen.findByRole("dialog", { name: "¿Eliminar «Avanzado»?" })).getByRole("button", { name: "Eliminar" }));
    fireEvent.click(within(await screen.findByRole("dialog", { name: "No se puede eliminar" })).getByRole("button", { name: "Archivar en su lugar" }));

    await waitFor(() => expect(calls("PATCH", "/api/sections/s2/status")[0]?.body).toEqual({ status: "ARCHIVED" }));
  });
});
