/*
* Funcionalidad: Page blocks service tests
* Descripción: Unit tests of savePageBlocks with the api-client request functions mocked: the plan is applied in the fixed order (deletes, updates, creates, reorder) and every completed operation is reported to the progress listener, the first failure stops the save (later requests are never sent), a created block is reported before a later failure, and a reorder entry whose id cannot be resolved fails fast with PageReorderError instead of sending an empty id. Depends on vitest and the page blocks service.
* Versión: 1.0 (C4)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageSavePlan } from "../../application/entities/page-draft.entity";
import { PageReorderError, savePageBlocks } from "./page-blocks.service";
import type { SaveProgressListener } from "./page-blocks.service";

const api = vi.hoisted(() => ({
  calls: [] as string[],
  failOn: null as string | null,
  nextId: 10,
}));

function record(method: string, path: string, params: Record<string, string>): void {
  const call = `${method} ${path.replace("{id}", params.id ?? "").replace("{blockId}", params.blockId ?? "")}`;

  api.calls.push(call);

  if (api.failOn === call) {
    throw new Error(`failed: ${call}`);
  }
}

vi.mock("@shared/api-client/api-request", () => ({
  apiDelete: vi.fn((path: string, { params }: { params: Record<string, string> }) => {
    record("DELETE", path, params);

    return Promise.resolve({ data: null });
  }),
  apiPut: vi.fn((path: string, { params }: { params: Record<string, string> }) => {
    record("PUT", path, params);

    return Promise.resolve({ data: null });
  }),
  apiPost: vi.fn((path: string, { params }: { params: Record<string, string> }) => {
    record("POST", path, params);

    return Promise.resolve({ data: { id: `b${api.nextId++}` } });
  }),
}));

const PLAN: PageSavePlan = {
  deletes: ["b1"],
  updates: [{ id: "b2", body: { title: "Nuevo" } }],
  creates: [{ key: "new-1", body: { type: "DIVIDER", content: {} } }, { key: "new-2", body: { type: "DIVIDER", content: {} } }],
  order: [{ key: "new-1", id: null }, { key: "b2", id: "b2" }, { key: "new-2", id: null }],
};

function listener(): SaveProgressListener & { events: string[] } {
  const events: string[] = [];

  return {
    events,
    onDeleted: (id) => events.push(`deleted ${id}`),
    onUpdated: (id) => events.push(`updated ${id}`),
    onCreated: (key, id) => events.push(`created ${key}=${id}`),
    onReordered: (ids) => events.push(`reordered ${ids.join(",")}`),
  };
}

beforeEach(() => {
  api.calls = [];
  api.failOn = null;
  api.nextId = 10;
});

describe("savePageBlocks", () => {
  it("applies deletes, updates, creates and the reorder in that order", async() => {
    const progress = listener();

    await savePageBlocks("p1", PLAN, progress);

    expect(api.calls).toEqual([
      "DELETE /api/pages/p1/blocks/b1",
      "PUT /api/pages/p1/blocks/b2",
      "POST /api/pages/p1/blocks",
      "POST /api/pages/p1/blocks",
      "PUT /api/pages/p1/blocks/reorder",
    ]);
    expect(progress.events).toEqual(["deleted b1", "updated b2", "created new-1=b10", "created new-2=b11", "reordered b10,b2,b11"]);
  });

  it("stops at the first failure without sending the later requests", async() => {
    api.failOn = "PUT /api/pages/p1/blocks/b2";
    const progress = listener();

    await expect(savePageBlocks("p1", PLAN, progress)).rejects.toThrow("failed: PUT /api/pages/p1/blocks/b2");

    expect(api.calls).toEqual(["DELETE /api/pages/p1/blocks/b1", "PUT /api/pages/p1/blocks/b2"]);
    expect(progress.events).toEqual(["deleted b1"]);
  });

  it("reports a created block before a later failure", async() => {
    api.failOn = "PUT /api/pages/p1/blocks/reorder";
    const progress = listener();

    await expect(savePageBlocks("p1", PLAN, progress)).rejects.toThrow();

    expect(progress.events).toEqual(["deleted b1", "updated b2", "created new-1=b10", "created new-2=b11"]);
  });

  it("fails fast when a reorder entry has no resolvable id", async() => {
    const plan: PageSavePlan = { deletes: [], updates: [], creates: [], order: [{ key: "b2", id: "b2" }, { key: "new-9", id: null }] };

    await expect(savePageBlocks("p1", plan, listener())).rejects.toBeInstanceOf(PageReorderError);
    expect(api.calls).toEqual([]);
  });
});
