/*
* Funcionalidad: useNoteAutosave tests
* Descripción: Unit tests of the debounced note autosave with fake timers and a mocked notes service (no Tiptap: the editor value is a plain Tiptap JSON object): a typing burst sends one PATCH with the latest document, a new note is created once (POST with the anchor pageId) and later edits PATCH it without racing the POST, empty new notes are never created, a failed save shows the error status and retries, and a pending edit is flushed on unmount. Depends on vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Note, NoteDoc } from "../entities/note.entity";
import { NOTE_AUTOSAVE_DELAY_MS, useNoteAutosave } from "./use-note-autosave";

const service = vi.hoisted(() => ({ createNote: vi.fn(), updateNoteContent: vi.fn() }));

vi.mock("../../api/services/notes.service", async(importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/services/notes.service")>()),
  createNote: service.createNote,
  updateNoteContent: service.updateNoteContent,
}));

const doc = (text: string): NoteDoc => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

const note = (id: string, content: NoteDoc, pageId: string | null = null): Note => ({
  id,
  lessonId: "l1",
  pageId,
  content,
  createdAt: "2026-10-14T00:00:00.000Z",
  updatedAt: "2026-10-14T00:00:00.000Z",
});

async function advance(ms: number) {
  await act(async() => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  service.createNote.mockReset();
  service.updateNoteContent.mockReset();
  service.updateNoteContent.mockImplementation((id: string, content: NoteDoc) => Promise.resolve(note(id, content)));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useNoteAutosave", () => {
  it("sends a single PATCH with the latest document after a typing burst", async() => {
    const onSaved = vi.fn();
    const { result } = renderHook(() => useNoteAutosave({ lessonId: "l1", initialNote: note("n1", doc("a")), anchorPageId: null, onSaved }));

    act(() => result.current.change(doc("ab")));
    await advance(300);
    act(() => result.current.change(doc("abc")));
    await advance(300);
    act(() => result.current.change(doc("abcd")));
    await advance(NOTE_AUTOSAVE_DELAY_MS - 1);
    expect(service.updateNoteContent).not.toHaveBeenCalled();

    await advance(1);
    expect(service.updateNoteContent).toHaveBeenCalledTimes(1);
    expect(service.updateNoteContent).toHaveBeenCalledWith("n1", doc("abcd"));
    expect(result.current.status).toBe("saved");
    expect(onSaved).toHaveBeenCalledWith(note("n1", doc("abcd")));
  });

  it("creates a new note once with the anchor page and never PATCHes before the POST resolves", async() => {
    let resolveCreate: (value: Note) => void = () => undefined;

    service.createNote.mockImplementation(() => new Promise<Note>((resolve) => {
      resolveCreate = resolve;
    }));
    const { result } = renderHook(() => useNoteAutosave({ lessonId: "l1", initialNote: null, anchorPageId: "p1", onSaved: vi.fn() }));

    act(() => result.current.change(doc("primera")));
    await advance(NOTE_AUTOSAVE_DELAY_MS);
    expect(service.createNote).toHaveBeenCalledWith({ lessonId: "l1", pageId: "p1", content: doc("primera") });
    expect(result.current.status).toBe("saving");

    act(() => result.current.change(doc("primera y segunda")));
    await advance(NOTE_AUTOSAVE_DELAY_MS * 3);
    expect(service.createNote).toHaveBeenCalledTimes(1);
    expect(service.updateNoteContent).not.toHaveBeenCalled();

    await act(async() => {
      resolveCreate(note("n9", doc("primera"), "p1"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(service.updateNoteContent).toHaveBeenCalledTimes(1);
    expect(service.updateNoteContent).toHaveBeenCalledWith("n9", doc("primera y segunda"));
    expect(result.current.noteId).toBe("n9");
    expect(result.current.status).toBe("saved");
  });

  it("does not create a note while the document has no text", async() => {
    const { result } = renderHook(() => useNoteAutosave({ lessonId: "l1", initialNote: null, anchorPageId: null, onSaved: vi.fn() }));

    act(() => result.current.change({ type: "doc", content: [{ type: "paragraph" }] }));
    await advance(NOTE_AUTOSAVE_DELAY_MS * 2);

    expect(service.createNote).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("shows the error status and retries the latest document on demand", async() => {
    service.updateNoteContent.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useNoteAutosave({ lessonId: "l1", initialNote: note("n1", doc("a")), anchorPageId: null, onSaved: vi.fn() }));

    act(() => result.current.change(doc("ab")));
    await advance(NOTE_AUTOSAVE_DELAY_MS);
    expect(result.current.status).toBe("error");

    // A failure is not retried in a loop.
    await advance(NOTE_AUTOSAVE_DELAY_MS * 5);
    expect(service.updateNoteContent).toHaveBeenCalledTimes(1);

    await act(async() => {
      await result.current.retry();
    });
    expect(service.updateNoteContent).toHaveBeenCalledTimes(2);
    expect(service.updateNoteContent).toHaveBeenLastCalledWith("n1", doc("ab"));
    expect(result.current.status).toBe("saved");
  });

  it("flushes a pending edit immediately on flush and on unmount", async() => {
    const { result, unmount } = renderHook(() => useNoteAutosave({ lessonId: "l1", initialNote: note("n1", doc("a")), anchorPageId: null, onSaved: vi.fn() }));

    act(() => result.current.change(doc("blur")));
    await act(async() => {
      await result.current.flush();
    });
    expect(service.updateNoteContent).toHaveBeenCalledWith("n1", doc("blur"));

    act(() => result.current.change(doc("cerrar")));
    unmount();
    await advance(0);
    expect(service.updateNoteContent).toHaveBeenCalledTimes(2);
    expect(service.updateNoteContent).toHaveBeenLastCalledWith("n1", doc("cerrar"));
  });
});
