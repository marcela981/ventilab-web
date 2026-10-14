/*
* Funcionalidad: Note entity tests
* Descripción: Unit tests of the note rules (text detection in a Tiptap document, anchor pageId to 1-based page number, newest-first upsert and removal) and of the AI analysis error messages (422, 502, 503, fallback). Depends on vitest and the api-client errors.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { ApiError } from "@shared/api-client/api-error";
import { EMPTY_NOTE_DOC, hasNoteText, notePageNumber, removeNote, upsertNote } from "./note.entity";
import type { Note } from "./note.entity";
import { NOTES_ANALYSIS_MESSAGES, getNotesAnalysisErrorMessage } from "./notes-error-messages";

const note = (id: string, updatedAt = "2026-10-14T00:00:00.000Z"): Note => ({
  id,
  lessonId: "l1",
  pageId: null,
  content: EMPTY_NOTE_DOC,
  createdAt: "2026-10-14T00:00:00.000Z",
  updatedAt,
});

describe("note entity", () => {
  it("detects text anywhere in a Tiptap document", () => {
    expect(hasNoteText(EMPTY_NOTE_DOC)).toBe(false);
    expect(hasNoteText({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "   " }] }] })).toBe(false);
    expect(hasNoteText({ type: "doc", content: [{ type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }] }] }] })).toBe(true);
  });

  it("resolves the anchor page to its 1-based number", () => {
    const pages = [{ id: "a" }, { id: "b" }];

    expect(notePageNumber("b", pages)).toBe(2);
    expect(notePageNumber("z", pages)).toBeNull();
    expect(notePageNumber(null, pages)).toBeNull();
    expect(notePageNumber("a", null)).toBeNull();
  });

  it("upserts newest first and removes by id", () => {
    const list = [note("n1"), note("n2")];
    const edited = note("n2", "2026-10-15T00:00:00.000Z");

    expect(upsertNote(list, note("n3")).map((item) => item.id)).toEqual(["n3", "n1", "n2"]);
    expect(upsertNote(list, edited)[1]).toBe(edited);
    expect(removeNote(list, "n1").map((item) => item.id)).toEqual(["n2"]);
  });
});

describe("getNotesAnalysisErrorMessage", () => {
  const error = (status: number) => new ApiError({ code: "X", message: "x", status });

  it("explains the AI specific failures and falls back to the learning messages", () => {
    expect(getNotesAnalysisErrorMessage(error(422))).toBe(NOTES_ANALYSIS_MESSAGES.noNotes);
    expect(getNotesAnalysisErrorMessage(error(502))).toBe(NOTES_ANALYSIS_MESSAGES.failed);
    expect(getNotesAnalysisErrorMessage(error(503))).toBe(NOTES_ANALYSIS_MESSAGES.unavailable);
    expect(getNotesAnalysisErrorMessage(error(404))).toBe("Este contenido no existe o todavía no está publicado.");
  });
});
