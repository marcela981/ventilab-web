/*
* Funcionalidad: LessonNotesPanel tests
* Descripción: Integration tests of the lesson notes panel against msw handlers of /api/notes: the caller's notes render with a page indicator that links to the anchored page (disabled when the page is unknown), a new note anchored to the current page sends its pageId, editing PATCHes the note, delete asks for confirmation before the DELETE, the AI analysis renders summary, key concepts, gaps, suggestions and the rating widget, and 429/503 show their messages. The lazy Tiptap editor is replaced by a textarea (the autosave rules are covered by use-note-autosave.test). Depends on vitest, Testing Library, msw and the learning test helpers.
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
import type { NoteDTO } from "../../../api/dtos/notes.dto";
import { apiUrl, envelope, errorResponse, renderWithSession } from "../../pages/learning-test-helpers";
import type { LessonPage } from "../../entities/lesson.entity";
import { LessonNotesPanel } from "./lesson-notes-panel";

vi.mock("./note-editor", () => ({
  NoteEditor: ({ label, onChange, onBlur }: { label: string, onChange: (doc: unknown) => void, onBlur: () => void }) => (
    <textarea
      aria-label={label}
      onBlur={onBlur}
      onChange={(event) => onChange({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: event.target.value }] }] })}
    />
  ),
}));

const LAZY_WAIT = { timeout: 10_000 };
const server = setupServer();
const PAGES: LessonPage[] = [
  { id: "p1", title: "Página p1", order: 1 },
  { id: "p2", title: "Página p2", order: 2 },
] as LessonPage[];

const textDoc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

function noteDto(id: string, text: string, pageId: string | null): NoteDTO {
  return { id, lessonId: "l1", pageId, content: textDoc(text), createdAt: "2026-10-14T00:00:00.000Z", updatedAt: "2026-10-14T00:00:00.000Z" };
}

let store: NoteDTO[] = [];
let requests: { method: string, path: string, body: unknown }[] = [];

async function bodyOf(request: Request): Promise<unknown> {
  const text = await request.text();

  return text ? JSON.parse(text) as unknown : null;
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  requests = [];
  store = [noteDto("n1", "Nota anclada", "p2"), noteDto("n2", "Nota libre", null), noteDto("n3", "Nota huérfana", "pX")];
  server.use(
    http.get(apiUrl("/api/notes/lessons/:lessonId"), () => HttpResponse.json(envelope(store))),
    http.post(apiUrl("/api/notes"), async({ request }) => {
      const body = await bodyOf(request) as { lessonId: string, pageId?: string, content: Record<string, unknown> };
      const created = { ...noteDto("n-new", "", body.pageId ?? null), content: body.content };

      requests.push({ method: "POST", path: "/api/notes", body });
      store = [created, ...store];

      return HttpResponse.json(envelope(created), { status: 201 });
    }),
    http.patch(apiUrl("/api/notes/:noteId"), async({ request, params }) => {
      const body = await bodyOf(request) as { content: Record<string, unknown> };
      const id = String(params.noteId);

      requests.push({ method: "PATCH", path: `/api/notes/${id}`, body });
      store = store.map((note) => (note.id === id ? { ...note, content: body.content } : note));

      return HttpResponse.json(envelope(store.find((note) => note.id === id)));
    }),
    http.delete(apiUrl("/api/notes/:noteId"), ({ params }) => {
      const id = String(params.noteId);

      requests.push({ method: "DELETE", path: `/api/notes/${id}`, body: null });
      store = store.filter((note) => note.id !== id);

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

function renderPanel() {
  return renderWithSession(<LessonNotesPanel moduleId="m1" lessonId="l1" currentPageId="p1" pages={PAGES} />);
}

describe("LessonNotesPanel", () => {
  it("lists the caller's notes with a page indicator that links to the anchored page", async() => {
    renderPanel();

    expect(await screen.findByText("Nota anclada")).toBeInTheDocument();
    expect(screen.getByText("Nota libre")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "Ir a la página 2" });

    expect(link).toHaveAttribute("href", "/learn/modules/m1/lessons/l1/2");
    // Unknown anchor page: indicator without a link.
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByText("Página no disponible")).toBeInTheDocument();
  });

  it("creates a note anchored to the current page", async() => {
    renderPanel();
    await screen.findByText("Nota libre");

    fireEvent.click(screen.getByRole("button", { name: "Nueva nota" }));
    expect(screen.getByRole("checkbox", { name: "Anclar a esta página" })).toBeChecked();

    const editor = await screen.findByRole("textbox", { name: "Contenido de la nota" }, LAZY_WAIT);

    fireEvent.change(editor, { target: { value: "Mi idea" } });
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toEqual({ method: "POST", path: "/api/notes", body: { lessonId: "l1", pageId: "p1", content: textDoc("Mi idea") } });
    expect(await screen.findByText("Mi idea")).toBeInTheDocument();
  });

  it("creates a free note when the anchor option is unchecked", async() => {
    renderPanel();
    await screen.findByText("Nota libre");

    fireEvent.click(screen.getByRole("button", { name: "Nueva nota" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Anclar a esta página" }));
    fireEvent.change(await screen.findByRole("textbox", { name: "Contenido de la nota" }, LAZY_WAIT), { target: { value: "Libre" } });
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]?.body).toEqual({ lessonId: "l1", content: textDoc("Libre") });
  });

  it("edits an existing note with a PATCH", async() => {
    renderPanel();
    const item = (await screen.findByText("Nota libre")).closest("li");

    fireEvent.click(within(item as HTMLElement).getByRole("button", { name: "Editar nota" }));
    fireEvent.change(await screen.findByRole("textbox", { name: "Contenido de la nota" }, LAZY_WAIT), { target: { value: "Nota editada" } });
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toEqual({ method: "PATCH", path: "/api/notes/n2", body: { content: textDoc("Nota editada") } });
    expect(await screen.findByText("Nota editada")).toBeInTheDocument();
  });

  it("asks for confirmation before deleting a note", async() => {
    renderPanel();
    const item = (await screen.findByText("Nota libre")).closest("li");

    fireEvent.click(within(item as HTMLElement).getByRole("button", { name: "Eliminar nota" }));

    const dialog = await screen.findByRole("dialog", { name: "¿Eliminar esta nota?" });

    expect(requests).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(requests).toEqual([{ method: "DELETE", path: "/api/notes/n2", body: null }]));
    await waitFor(() => expect(screen.queryByText("Nota libre")).not.toBeInTheDocument());
  });

  it("analyzes the lesson notes with AI and offers the rating widget", async() => {
    let analyzeBody: unknown = null;

    server.use(http.post(apiUrl("/api/notes/analyze"), async({ request }) => {
      analyzeBody = await bodyOf(request);

      return HttpResponse.json(envelope({
        aiCallId: "call-1",
        summary: "Tus notas cubren la PEEP.",
        keyConcepts: ["PEEP"],
        gaps: ["Falta la presión meseta"],
        suggestions: ["Repasa la distensibilidad"],
        lessonId: "l1",
        moduleId: null,
        model: "gemini",
        notesAnalyzed: 3,
        scope: "lesson",
      }));
    }));
    renderPanel();
    await screen.findByText("Nota libre");

    fireEvent.click(screen.getByRole("button", { name: "Analizar mis notas con IA" }));

    expect(await screen.findByText("Tus notas cubren la PEEP.")).toBeInTheDocument();
    expect(analyzeBody).toEqual({ lessonId: "l1" });
    expect(screen.getByText("PEEP")).toBeInTheDocument();
    expect(screen.getByText("Falta la presión meseta")).toBeInTheDocument();
    expect(screen.getByText("Repasa la distensibilidad")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "¿Te fue útil?" })).toBeInTheDocument();
  });

  it("shows the wait time when the analysis is rate limited", async() => {
    server.use(http.post(apiUrl("/api/notes/analyze"), () => {
      const response = errorResponse("TOO_MANY_REQUESTS", 429);

      response.headers.set("Retry-After", "120");

      return response;
    }));
    renderPanel();
    await screen.findByText("Nota libre");

    fireEvent.click(screen.getByRole("button", { name: "Analizar mis notas con IA" }));

    expect(await screen.findByText("Demasiadas solicitudes. Inténtalo de nuevo en 2 minutos.")).toBeInTheDocument();
  });

  it("explains when the AI provider is unavailable", async() => {
    server.use(http.post(apiUrl("/api/notes/analyze"), () => errorResponse("AI_UNAVAILABLE", 503)));
    renderPanel();
    await screen.findByText("Nota libre");

    fireEvent.click(screen.getByRole("button", { name: "Analizar mis notas con IA" }));

    expect(await screen.findByText("El servicio de IA no está disponible en este momento. Inténtalo más tarde.")).toBeInTheDocument();
  });
});
