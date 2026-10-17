/*
* Funcionalidad: My notes page tests
* Descripción: /me/notes with msw: the notes page (`GET /api/notes`, newest first) is grouped by module in curriculum order and by lesson, with the lesson and page links of the learning viewer and a trailing group for unresolved lessons; the module filter reads `GET /api/notes/modules/{moduleId}` and the section filter narrows the module options; deleting asks for confirmation and refreshes the list; an edit saved by the learning NoteComposer (stubbed: Tiptap is covered by the learning tests) updates the note in place; the module AI analysis posts the moduleId and shows the result; empty state and retryable load error. Depends on vitest, msw, Testing Library, the learning feature (partially mocked) and the student space test helpers.
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
import type { NoteComposerProps } from "@features/learning";
import type { NoteDTO } from "../../api/dtos/student-space.dto";
import { MODULE_ANALYSIS_COPY } from "../components/module-notes-analysis";
import { NOTES_FILTERS_COPY } from "../components/notes-filters";
import {
  apiUrl,
  envelope,
  errorResponse,
  lessonDetailDto,
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
let moduleRequests: string[];
let deleted: string[];
let analyzed: unknown[];
let failList: boolean;

const LESSONS: Record<string, ReturnType<typeof lessonDetailDto>> = {
  l1: lessonDetailDto("l1", 2, "m2", "Modos ventilatorios"),
  l2: lessonDetailDto("l2", 1, "m1", "Fisiología"),
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  listQueries = [];
  moduleRequests = [];
  deleted = [];
  analyzed = [];
  failList = false;
  notes = [
    noteDto("n1", "l1", "Volumen corriente", { pageId: "p2" }),
    noteDto("n2", "l2", "Compliance pulmonar"),
    noteDto("n3", "l3", "Nota huérfana"),
  ];
  server.use(
    http.get(apiUrl("/api/curriculum/tree"), () => HttpResponse.json(envelope(treeDto()))),
    http.get(apiUrl("/api/notes"), ({ request }) => {
      const params = Object.fromEntries(new URL(request.url).searchParams);

      listQueries.push(params);

      return failList
        ? errorResponse("internal_error", 500)
        : HttpResponse.json(envelope(notes, { total: notes.length, pages: 1, page: 1, limit: Number(params.limit ?? 10) }));
    }),
    http.get(apiUrl("/api/notes/modules/:moduleId"), ({ params }) => {
      const moduleId = String(params.moduleId);
      const rows = notes.filter((note) => LESSONS[note.lessonId]?.moduleId === moduleId);

      moduleRequests.push(moduleId);

      return HttpResponse.json(envelope(rows, { total: rows.length, pages: 1, page: 1, limit: 10 }));
    }),
    http.get(apiUrl("/api/lessons/:id"), ({ params }) => {
      const lesson = LESSONS[String(params.id)];

      return lesson ? HttpResponse.json(envelope(lesson)) : errorResponse("lessons.not_found", 404);
    }),
    http.get(apiUrl("/api/pages"), ({ request }) => {
      const lessonId = new URL(request.url).searchParams.get("lessonId") ?? "";

      return HttpResponse.json(envelope([pageSummaryDto("p1", 1, lessonId), pageSummaryDto("p2", 2, lessonId)]));
    }),
    http.delete(apiUrl("/api/notes/:noteId"), ({ params }) => {
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

describe("MyNotesPage", () => {
  it("groups the notes by module in curriculum order and by lesson", async() => {
    renderStudentSpace(<MyNotesPage />);
    await groupsReady();

    expect(listQueries[0]).toEqual({ page: "1", limit: "10", sortOrder: "desc" });
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent))
      .toEqual(["Fisiología", "Modos ventilatorios", MY_NOTES_COPY.unknownModule]);

    const modes = moduleGroup("Modos ventilatorios");

    expect(within(modes).getByText("Volumen corriente")).toBeInTheDocument();
    expect(within(modes).getByRole("link", { name: "Ir a la lección Lección l1" })).toHaveAttribute("href", "/learn/modules/m2/lessons/l1/1");
    expect(await within(modes).findByRole("link", { name: "Ir a la página 2" })).toHaveAttribute("href", "/learn/modules/m2/lessons/l1/2");
    expect(within(moduleGroup(MY_NOTES_COPY.unknownModule)).getByText("Nota huérfana")).toBeInTheDocument();
  });

  it("reads the notes of the selected module and narrows the modules by section", async() => {
    renderStudentSpace(<MyNotesPage />);
    await groupsReady();

    select(NOTES_FILTERS_COPY.module, "Fisiología");
    await waitFor(() => expect(moduleRequests).toEqual(["m1"]));
    await waitFor(() => expect(screen.queryByText("Volumen corriente")).not.toBeInTheDocument());
    expect(screen.getByText("Compliance pulmonar")).toBeInTheDocument();

    select(NOTES_FILTERS_COPY.section, "Avanzado");
    expect(await screen.findByText(NOTES_FILTERS_COPY.sectionHint)).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("combobox", { name: NOTES_FILTERS_COPY.module }));
    const options = screen.getAllByRole("option").map((option) => option.textContent);

    expect(options).toEqual([NOTES_FILTERS_COPY.allModules, "Destete"]);
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
});
