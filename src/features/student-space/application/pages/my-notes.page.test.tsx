/*
* Funcionalidad: My notes page tests
* Descripción: /me/notes with msw: the notes page (`GET /api/notes`, newest first) is grouped by module in curriculum order and by lesson with the titles sent by the API (no lesson read: `GET /api/lessons/{id}` is never requested), with the lesson and page links of the learning viewer and a trailing group for notes without module; the search (debounced), module, lesson and lesson page filters are sent to `GET /api/notes` and the curriculum section narrows the module options; a search without results shows its empty state and "Limpiar filtros" brings every note back; deleting asks for confirmation and refreshes the list; an edit saved by the learning NoteComposer (stubbed: Tiptap is covered by the learning tests) updates the note in place; the module AI analysis posts the moduleId and shows the result; empty state and retryable load error. v1.1 (O2 follow-up): deleting the only note of the last page shows the skeleton (never the empty state) while the previous page, not in the cache, loads; a failed deletion shows the server error and keeps the note; a failed refresh after a successful deletion still reports the deletion; the module analysis shows its error alert when the AI is unavailable (503). v1.2 (B2 closure): server-side search and filters, notes placed by their API labels. Depends on vitest, msw, Testing Library, the learning feature (partially mocked) and the student space test helpers.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useEffect } from "react";
import { setupServer } from "msw/node";
import { useSWRConfig } from "swr";
import type { Cache } from "swr";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { NoteComposerProps } from "@features/learning";
import type { NoteDTO } from "../../api/dtos/student-space.dto";
import { MODULE_ANALYSIS_MESSAGES, STUDENT_SPACE_FALLBACK_MESSAGES } from "../entities/student-space-error-messages";
import { MODULE_ANALYSIS_COPY } from "../components/module-notes-analysis";
import { NOTES_FILTERS_COPY } from "../components/notes-filters";
import {
  apiUrl,
  envelope,
  errorResponse,
  lessonSummaryDto,
  noteDto,
  pageSummaryDto,
  renderStudentSpace,
  textDoc,
  treeDto,
} from "./student-space-test-helpers";
import { MY_NOTES_COPY, MyNotesPage } from "./my-notes.page";

vi.mock("@features/learning", async(importOriginal) => {
  const actual = await importOriginal<typeof import("@features/learning")>();

  function NoteComposerStub({ note, onSaved, onClose }: NoteComposerProps) {
    return (
      <div>
        <button type="button" onClick={() => note && onSaved({ ...note, content: textDoc("Nota editada"), updatedAt: "2026-10-16T13:00:00.000Z" })}>
          Guardar cambio
        </button>
        <button type="button" onClick={onClose}>Listo</button>
      </div>
    );
  }

  return { ...actual, NoteComposer: NoteComposerStub };
});

const server = setupServer();

vi.setConfig({ testTimeout: 20_000 });

let notes: NoteDTO[];
let listQueries: Record<string, string>[];
let lessonReads: string[];
let deleted: string[];
let analyzed: unknown[];
let failList: boolean;
let failDelete: boolean;

function noteText(note: NoteDTO): string {
  return JSON.stringify(note.content).toLowerCase();
}

// Server-side filters of GET /api/notes, as the backend applies them.
function filterNotes(params: Record<string, string>): NoteDTO[] {
  return notes.filter((note) => (!params.moduleId || note.moduleId === params.moduleId)
    && (!params.lessonId || note.lessonId === params.lessonId)
    && (!params.pageId || note.pageId === params.pageId)
    && (!params.search || noteText(note).includes(params.search.toLowerCase())));
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  listQueries = [];
  lessonReads = [];
  deleted = [];
  analyzed = [];
  failList = false;
  failDelete = false;
  notes = [
    noteDto("n1", "l1", "Volumen corriente", { pageId: "p2", moduleId: "m2", lessonTitle: "Lección l1", pageTitle: "Página p2" }),
    noteDto("n2", "l2", "Compliance pulmonar", { moduleId: "m1", lessonTitle: "Lección l2" }),
    noteDto("n3", "l3", "Nota huérfana"),
  ];
  server.use(
    http.get(apiUrl("/api/curriculum/tree"), () => HttpResponse.json(envelope(treeDto()))),
    http.get(apiUrl("/api/notes"), ({ request }) => {
      const params = Object.fromEntries(new URL(request.url).searchParams);
      const rows = filterNotes(params);

      listQueries.push(params);

      return failList
        ? errorResponse("internal_error", 500)
        : HttpResponse.json(envelope(rows, { total: rows.length, pages: 1, page: 1, limit: Number(params.limit ?? 10) }));
    }),
    http.get(apiUrl("/api/lessons/:id"), ({ params }) => {
      lessonReads.push(String(params.id));

      return errorResponse("lessons.not_found", 404);
    }),
    http.get(apiUrl("/api/modules/:id/lessons"), ({ params }) => {
      const moduleId = String(params.id);

      return HttpResponse.json(envelope(moduleId === "m2" ? [lessonSummaryDto("l1", 1, "m2"), lessonSummaryDto("l4", 2, "m2")] : []));
    }),
    http.get(apiUrl("/api/pages"), ({ request }) => {
      const lessonId = new URL(request.url).searchParams.get("lessonId") ?? "";

      return HttpResponse.json(envelope([pageSummaryDto("p1", 1, lessonId), pageSummaryDto("p2", 2, lessonId)]));
    }),
    http.delete(apiUrl("/api/notes/:noteId"), ({ params }) => {
      if (failDelete) {
        return errorResponse("internal_error", 500);
      }

      deleted.push(String(params.noteId));
      notes = notes.filter((note) => note.id !== params.noteId);

      return HttpResponse.json(envelope(null));
    }),
    http.post(apiUrl("/api/notes/analyze"), async({ request }) => {
      analyzed.push(await request.json());

      return HttpResponse.json(envelope({
        aiCallId: "call-1",
        summary: "Dominas la fisiología básica.",
        keyConcepts: ["Compliance"],
        gaps: ["Resistencia de la vía aérea"],
        suggestions: ["Repasa la ecuación del movimiento"],
        lessonId: null,
        moduleId: "m1",
        model: "test-model",
        notesAnalyzed: 1,
        scope: "MODULE",
      }));
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function CacheProbe({ onCache }: { onCache: (cache: Cache) => void }) {
  const { cache } = useSWRConfig();

  useEffect(() => {
    onCache(cache);
  }, [cache, onCache]);

  return null;
}

function moduleGroup(title: string): HTMLElement {
  return screen.getByRole("region", { name: title });
}

async function groupsReady(): Promise<void> {
  await screen.findByRole("region", { name: "Fisiología" });
  await screen.findByRole("region", { name: "Modos ventilatorios" });
}

function select(label: string, option: string) {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: label }));
  fireEvent.click(screen.getByRole("option", { name: option }));
}

const lastQuery = (): Record<string, string> | undefined => listQueries[listQueries.length - 1];

describe("MyNotesPage", () => {
  it("groups the notes by module in curriculum order and by lesson with the API titles, without reading lessons", async() => {
    renderStudentSpace(<MyNotesPage />);
    await groupsReady();

    expect(listQueries[0]).toEqual({ page: "1", limit: "10", sortOrder: "desc" });
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent))
      .toEqual(["Fisiología", "Modos ventilatorios", MY_NOTES_COPY.unknownModule]);

    const modes = moduleGroup("Modos ventilatorios");

    expect(within(modes).getByRole("heading", { level: 3, name: "Lección l1" })).toBeInTheDocument();
    expect(within(modes).getByText("Volumen corriente")).toBeInTheDocument();
    expect(within(modes).getByRole("link", { name: "Ir a la lección Lección l1" })).toHaveAttribute("href", "/learn/modules/m2/lessons/l1/1");
    expect(await within(modes).findByRole("link", { name: "Ir a la página 2" })).toHaveAttribute("href", "/learn/modules/m2/lessons/l1/2");
    expect(within(moduleGroup(MY_NOTES_COPY.unknownModule)).getByText("Nota huérfana")).toBeInTheDocument();
    expect(lessonReads).toEqual([]);
  });

  it("sends the module filter to the server and narrows the modules by section", async() => {
    renderStudentSpace(<MyNotesPage />);
    await groupsReady();

    select(NOTES_FILTERS_COPY.module, "Fisiología");
    await waitFor(() => expect(lastQuery()).toEqual({ page: "1", limit: "10", sortOrder: "desc", moduleId: "m1" }));
    await waitFor(() => expect(screen.queryByText("Volumen corriente")).not.toBeInTheDocument());
    expect(screen.getByText("Compliance pulmonar")).toBeInTheDocument();

    select(NOTES_FILTERS_COPY.section, "Avanzado");
    expect(await screen.findByText(NOTES_FILTERS_COPY.sectionHint)).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("combobox", { name: NOTES_FILTERS_COPY.module }));
    const options = screen.getAllByRole("option").map((option) => option.textContent);

    expect(options).toEqual([NOTES_FILTERS_COPY.allModules, "Destete"]);
  });

  it("sends the lesson and lesson page filters of the selected module", async() => {
    renderStudentSpace(<MyNotesPage />);
    await groupsReady();

    expect(screen.getByRole("combobox", { name: NOTES_FILTERS_COPY.lesson })).toHaveAttribute("aria-disabled", "true");
    select(NOTES_FILTERS_COPY.module, "Modos ventilatorios");
    await waitFor(() => expect(lastQuery()?.moduleId).toBe("m2"));

    await waitFor(() => expect(screen.getByRole("combobox", { name: NOTES_FILTERS_COPY.lesson })).not.toHaveAttribute("aria-disabled"));
    fireEvent.mouseDown(screen.getByRole("combobox", { name: NOTES_FILTERS_COPY.lesson }));
    fireEvent.click(await screen.findByRole("option", { name: "Lección l1" }));
    await waitFor(() => expect(lastQuery()).toMatchObject({ moduleId: "m2", lessonId: "l1" }));

    fireEvent.mouseDown(screen.getByRole("combobox", { name: NOTES_FILTERS_COPY.page }));
    fireEvent.click(await screen.findByRole("option", { name: "Página p2" }));
    await waitFor(() => expect(lastQuery()).toEqual({ page: "1", limit: "10", sortOrder: "desc", moduleId: "m2", lessonId: "l1", pageId: "p2" }));
    expect(await screen.findByText("Volumen corriente")).toBeInTheDocument();
    expect(screen.queryByText("Compliance pulmonar")).not.toBeInTheDocument();
  });

  it("searches on the server after a pause and shows the empty state of a search without results", async() => {
    renderStudentSpace(<MyNotesPage />);
    await groupsReady();

    fireEvent.change(screen.getByRole("searchbox", { name: NOTES_FILTERS_COPY.search }), { target: { value: "complian" } });
    fireEvent.change(screen.getByRole("searchbox", { name: NOTES_FILTERS_COPY.search }), { target: { value: " compliance " } });
    await waitFor(() => expect(lastQuery()?.search).toBe("compliance"));
    expect(listQueries.filter((query) => query.search !== undefined).map((query) => query.search)).toEqual(["compliance"]);
    await waitFor(() => expect(screen.queryByText("Volumen corriente")).not.toBeInTheDocument());
    expect(screen.getByText("Compliance pulmonar")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: NOTES_FILTERS_COPY.search }), { target: { value: "inexistente" } });
    expect(await screen.findByText(MY_NOTES_COPY.emptyFilteredTitle)).toBeInTheDocument();
    expect(screen.queryByText(MY_NOTES_COPY.emptyTitle)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: MY_NOTES_COPY.clearFilters }));
    expect(await screen.findByText("Volumen corriente")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: NOTES_FILTERS_COPY.search })).toHaveValue("");
  });

  it("deletes a note after the confirmation", async() => {
    renderStudentSpace(<MyNotesPage />);
    await groupsReady();

    fireEvent.click(within(moduleGroup("Fisiología")).getByRole("button", { name: "Eliminar nota" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: MY_NOTES_COPY.deleteConfirm }));

    await waitFor(() => expect(deleted).toEqual(["n2"]));
    expect(await screen.findByText(MY_NOTES_COPY.deleted)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Compliance pulmonar")).not.toBeInTheDocument());
  });

  it("updates a note saved by the editor in place", async() => {
    renderStudentSpace(<MyNotesPage />);
    await groupsReady();

    fireEvent.click(within(moduleGroup("Fisiología")).getByRole("button", { name: "Editar nota" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambio" }));
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));

    expect(await screen.findByText("Nota editada")).toBeInTheDocument();
    expect(screen.queryByText("Compliance pulmonar")).not.toBeInTheDocument();
  });

  it("analyzes the notes of a module with AI", async() => {
    renderStudentSpace(<MyNotesPage />);
    await groupsReady();

    fireEvent.click(within(moduleGroup("Fisiología")).getByRole("button", { name: MODULE_ANALYSIS_COPY.analyzeModule("Fisiología") }));

    expect(await screen.findByText("Dominas la fisiología básica.")).toBeInTheDocument();
    expect(analyzed).toEqual([{ moduleId: "m1" }]);
    expect(screen.getByText("Resistencia de la vía aérea")).toBeInTheDocument();
  });

  it("shows the module analysis error alert when the AI is unavailable", async() => {
    server.use(http.post(apiUrl("/api/notes/analyze"), () => errorResponse("ai.unavailable", 503)));
    renderStudentSpace(<MyNotesPage />);
    await groupsReady();

    fireEvent.click(within(moduleGroup("Fisiología")).getByRole("button", { name: MODULE_ANALYSIS_COPY.analyzeModule("Fisiología") }));

    const alert = await within(moduleGroup("Fisiología")).findByRole("alert");

    expect(alert).toHaveTextContent(MODULE_ANALYSIS_MESSAGES.unavailable);
  });

  it("shows the empty state", async() => {
    notes = [];
    renderStudentSpace(<MyNotesPage />);

    expect(await screen.findByText(MY_NOTES_COPY.emptyTitle)).toBeInTheDocument();
  });

  it("shows a retryable load error", async() => {
    failList = true;
    renderStudentSpace(<MyNotesPage />);

    expect(await screen.findByText(MY_NOTES_COPY.loadErrorTitle)).toBeInTheDocument();

    failList = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(listQueries.length).toBeGreaterThan(1));
    expect(await screen.findByText("Compliance pulmonar", undefined, { timeout: 5_000 })).toBeInTheDocument();
  });

  it("keeps the note and shows the server error when the deletion fails", async() => {
    failDelete = true;
    renderStudentSpace(<MyNotesPage />);
    await groupsReady();

    fireEvent.click(within(moduleGroup("Fisiología")).getByRole("button", { name: "Eliminar nota" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: MY_NOTES_COPY.deleteConfirm }));

    expect(await screen.findByText(STUDENT_SPACE_FALLBACK_MESSAGES.server)).toBeInTheDocument();
    expect(screen.queryByText(MY_NOTES_COPY.deleted)).not.toBeInTheDocument();
    expect(screen.getByText("Compliance pulmonar")).toBeInTheDocument();
  });

  it("reports the deletion even when the list refresh fails", async() => {
    renderStudentSpace(<MyNotesPage />);
    await groupsReady();

    failList = true;
    fireEvent.click(within(moduleGroup("Fisiología")).getByRole("button", { name: "Eliminar nota" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: MY_NOTES_COPY.deleteConfirm }));

    await waitFor(() => expect(deleted).toEqual(["n2"]));
    expect(await screen.findByText(MY_NOTES_COPY.deleted)).toBeInTheDocument();
    expect(await screen.findByText(MY_NOTES_COPY.staleWarning, { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText(STUDENT_SPACE_FALLBACK_MESSAGES.server, { exact: false })).toHaveLength(1);
  });

  it("shows the skeleton, not the empty state, while the page before an emptied last page loads", async() => {
    // 21 notes: page 3 holds only "Nota 21". Page 2 is dropped from the SWR cache (as after an eviction) so it has to load.
    notes = Array.from({ length: 21 }, (_, index) => noteDto(`p${index + 1}`, "l2", `Nota ${index + 1}`));
    let releasePageTwo: () => void = () => undefined;
    const pageTwoGate = new Promise<void>((resolve) => {
      releasePageTwo = resolve;
    });
    let gatePageTwo = false;

    server.use(http.get(apiUrl("/api/notes"), async({ request }) => {
      const params = new URL(request.url).searchParams;
      const pageNumber = Number(params.get("page") ?? 1);
      const limit = Number(params.get("limit") ?? 10);

      if (pageNumber === 2 && gatePageTwo) {
        await pageTwoGate;
      }

      const pages = Math.max(1, Math.ceil(notes.length / limit));

      return HttpResponse.json(envelope(notes.slice((pageNumber - 1) * limit, pageNumber * limit), { total: notes.length, pages, page: pageNumber, limit }));
    }));
    let swrCache: Cache | null = null;
    const keepCache = (cache: Cache) => {
      swrCache = cache;
    };

    renderStudentSpace(<><CacheProbe onCache={keepCache} /><MyNotesPage /></>);
    await screen.findByText("Nota 1");

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(await screen.findByText("Nota 11")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(await screen.findByText("Nota 21")).toBeInTheDocument();

    const cache = swrCache as Cache | null;

    for (const key of [...(cache?.keys() ?? [])]) {
      const original = (cache?.get(key) as { _k?: [string, { query?: { page?: number } }] } | undefined)?._k;

      if (original?.[1]?.query?.page === 2) {
        cache?.delete(key);
      }
    }

    gatePageTwo = true;

    fireEvent.click(screen.getByRole("button", { name: "Eliminar nota" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: MY_NOTES_COPY.deleteConfirm }));

    expect(await screen.findByRole("status", { name: MY_NOTES_COPY.loading })).toBeInTheDocument();
    expect(screen.queryByText(MY_NOTES_COPY.emptyTitle)).not.toBeInTheDocument();
    expect(screen.queryByText("Nota 21")).not.toBeInTheDocument();

    releasePageTwo();
    expect(await screen.findByText("Nota 11")).toBeInTheDocument();
    expect(screen.queryByText(MY_NOTES_COPY.emptyTitle)).not.toBeInTheDocument();
  });
});
