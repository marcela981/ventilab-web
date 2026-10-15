/*
* Funcionalidad: Page draft entity tests
* Descripción: Pure logic of the page editor draft: new block defaults, duplicate (copy right after, no server id), move and remove, per-block validation (equation, video YouTube/Vimeo URL, code language, image/file media), the save plan (deletes, changed-field updates, creates, reorder only when the final order differs from what the backend leaves after appending) and the backend payloads (empty video URL and code language omitted). Depends on vitest and the page draft entity. v1.1 (C4 review): applySavedOperations over a stale snapshot (deletes, updates, appended creates, reorder) leaves nothing pending.
* Versión: 1.1 (C4)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  applySavedOperations,
  blockError,
  createDraftBlock,
  duplicateBlock,
  hasPendingChanges,
  moveBlock,
  NO_SAVED_OPERATIONS,
  planPageSave,
  removeBlock,
  richTextFormat,
  toBlockPayload,
  videoUrlError,
} from "./page-draft.entity";
import type { DraftBlock } from "./page-draft.entity";

function serverBlock(id: string, overrides: Partial<DraftBlock> = {}): DraftBlock {
  return { key: id, id, type: "TEXT", title: "", content: { markdown: `texto ${id}` }, mediaId: null, mediaUrl: null, ...overrides };
}

const SERVER = [serverBlock("b1"), serverBlock("b2", { type: "EQUATION", content: { latex: "P = F", display: true } }), serverBlock("b3")];

describe("draft operations", () => {
  it("creates new blocks without a server id and with the default content of their type", () => {
    expect(createDraftBlock("EQUATION", "new-1")).toMatchObject({ key: "new-1", id: null, type: "EQUATION", content: { latex: "", display: true } });
    expect(createDraftBlock("TEXT", "new-2").content).toEqual({ doc: { type: "doc", content: [{ type: "paragraph" }] } });
    expect(createDraftBlock("DIVIDER", "new-3").content).toEqual({});
  });

  it("duplicates a block right after the original as a new block", () => {
    const result = duplicateBlock(SERVER, "b2", "new-1");

    expect(result.map((block) => block.key)).toEqual(["b1", "b2", "new-1", "b3"]);
    expect(result[2]).toMatchObject({ id: null, type: "EQUATION", content: { latex: "P = F", display: true } });
    expect(result[2]?.content).not.toBe(SERVER[1]?.content);
  });

  it("moves and removes blocks without mutating the input", () => {
    expect(moveBlock(SERVER, 0, 2).map((block) => block.key)).toEqual(["b2", "b3", "b1"]);
    expect(moveBlock(SERVER, 0, 5)).toBe(SERVER);
    expect(removeBlock(SERVER, "b2").map((block) => block.key)).toEqual(["b1", "b3"]);
    expect(SERVER.map((block) => block.key)).toEqual(["b1", "b2", "b3"]);
  });

  it("detects the rich text format of a block", () => {
    expect(richTextFormat({ doc: { type: "doc" } })).toBe("doc");
    expect(richTextFormat({ markdown: "# Hola" })).toBe("markdown");
    expect(richTextFormat({ html: "<p>Hola</p>" })).toBe("html");
    expect(richTextFormat({ questions: [] })).toBeNull();
  });
});

describe("validation", () => {
  it("accepts only https YouTube and Vimeo links", () => {
    expect(videoUrlError("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(videoUrlError("https://vimeo.com/123456")).toBeNull();
    expect(videoUrlError("")).toBe("Pega el enlace de un video de YouTube o Vimeo.");
    expect(videoUrlError("https://example.com/video.mp4")).toBe("Solo se admiten enlaces de YouTube o Vimeo.");
    expect(videoUrlError("http://youtu.be/dQw4w9WgXcQ")).toBe("Solo se admiten enlaces de YouTube o Vimeo.");
  });

  it("validates each block type", () => {
    expect(blockError(createDraftBlock("EQUATION", "n"))).toBe("Escribe la ecuación en LaTeX.");
    expect(blockError({ ...createDraftBlock("VIDEO", "n"), mediaId: "m1" })).toBeNull();
    expect(blockError(createDraftBlock("VIDEO", "n"))).toBe("Pega el enlace de un video de YouTube o Vimeo.");
    expect(blockError(createDraftBlock("IMAGE", "n"))).toBe("Falta el archivo de imagen.");
    expect(blockError({ ...createDraftBlock("CODE", "n"), content: { code: "x = 1", language: "c++" } })).toBe("El lenguaje solo puede tener letras, números y guiones bajos.");
    expect(blockError({ ...createDraftBlock("CODE", "n"), content: { code: "x = 1", language: "" } })).toBeNull();
    expect(blockError(SERVER[0] as DraftBlock)).toBeNull();
  });
});

describe("save plan", () => {
  it("is empty when the draft equals the server blocks", () => {
    const plan = planPageSave(SERVER, SERVER.map((block) => ({ ...block, content: { ...block.content } })));

    expect(hasPendingChanges(plan)).toBe(false);
    expect(plan.order).toBeNull();
  });

  it("deletes removed blocks and updates only the changed fields", () => {
    const draft = [{ ...(SERVER[0] as DraftBlock), title: "Definición" }, { ...(SERVER[2] as DraftBlock), content: { markdown: "nuevo" } }];
    const plan = planPageSave(SERVER, draft);

    expect(plan.deletes).toEqual(["b2"]);
    expect(plan.updates).toEqual([{ id: "b1", body: { title: "Definición" } }, { id: "b3", body: { content: { markdown: "nuevo" } } }]);
    expect(plan.creates).toEqual([]);
    expect(plan.order).toBeNull();
  });

  it("creates new blocks and reorders only when they are not at the end", () => {
    const appended = planPageSave(SERVER, [...SERVER, createDraftBlock("DIVIDER", "new-1")]);

    expect(appended.creates).toEqual([{ key: "new-1", body: { type: "DIVIDER", content: {} } }]);
    expect(appended.order).toBeNull();

    const inserted = planPageSave(SERVER, duplicateBlock(SERVER, "b1", "new-1"));

    expect(inserted.creates.map((create) => create.key)).toEqual(["new-1"]);
    expect(inserted.order).toEqual([{ key: "b1", id: "b1" }, { key: "new-1", id: null }, { key: "b2", id: "b2" }, { key: "b3", id: "b3" }]);
  });

  it("reorders when existing blocks change places", () => {
    const plan = planPageSave(SERVER, moveBlock(SERVER, 2, 0));

    expect(plan.order?.map((ref) => ref.id)).toEqual(["b3", "b1", "b2"]);
    expect(hasPendingChanges(plan)).toBe(true);
  });

  it("treats a block whose create already succeeded as an existing block", () => {
    const created = { ...createDraftBlock("DIVIDER", "new-1"), id: "b4" };
    const plan = planPageSave([...SERVER, serverBlock("b4", { type: "DIVIDER", content: {} })], [...SERVER, created]);

    expect(hasPendingChanges(plan)).toBe(false);
  });
});

describe("payloads", () => {
  it("omits the empty video URL, the empty code language and the media of rich text", () => {
    expect(toBlockPayload({ ...createDraftBlock("VIDEO", "n"), mediaId: "m1", content: { url: " ", caption: "Curva" } })).toEqual({
      type: "VIDEO",
      content: { caption: "Curva" },
      mediaId: "m1",
    });
    expect(toBlockPayload({ ...createDraftBlock("CODE", "n"), title: " Ejemplo ", content: { code: "x", language: "" } })).toEqual({
      type: "CODE",
      title: "Ejemplo",
      content: { code: "x" },
    });
  });
});

describe("applySavedOperations", () => {
  it("returns the loaded blocks untouched when nothing was saved", () => {
    expect(applySavedOperations(SERVER, NO_SAVED_OPERATIONS)).toBe(SERVER);
  });

  it("applies confirmed deletes, updates, creates and the reorder over a stale snapshot", () => {
    const edited = serverBlock("b2", { type: "EQUATION", content: { latex: "P = F \cdot R", display: true } });
    const created = serverBlock("b10", { type: "DIVIDER", content: {} });
    const result = applySavedOperations(SERVER, {
      deleted: new Set(["b1"]),
      updated: new Map([["b2", edited]]),
      created: [created],
      order: ["b10", "b3", "b2"],
    });

    expect(result.map((block) => block.key)).toEqual(["b10", "b3", "b2"]);
    expect(result[2]).toBe(edited);
  });

  it("leaves nothing pending once the draft matches the saved operations", () => {
    const created = serverBlock("b10", { type: "DIVIDER", content: {} });
    const server = applySavedOperations(SERVER, { deleted: new Set(["b1"]), updated: new Map(), created: [created], order: null });
    const draft = [SERVER[1] as DraftBlock, SERVER[2] as DraftBlock, { ...created, key: "new-1" }];

    expect(hasPendingChanges(planPageSave(server, draft))).toBe(false);
  });
});
