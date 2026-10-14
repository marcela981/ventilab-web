/*
* Funcionalidad: Groups service tests
* Descripción: Verifies the group mutations against a mocked backend (msw): create returns the new id, delete returns whether the group was deleted or deactivated, the leader can be cleared with null, members are added by user id, and backend errors reject with the ApiError code. Depends on vitest, msw and the groups service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { addGroupMember, createGroup, deleteGroup, setGroupLeader } from "./groups.service";

const url = (path: string): string => `${BACKEND_ORIGIN}${path}`;

const envelope = (data: unknown) => ({ success: true, message: null, data, code: null, timestamp: "", traceId: "t", pagination: null });

const bodies: unknown[] = [];

const server = setupServer(
  http.post(url("/api/groups"), async({ request }) => {
    bodies.push(await request.json());

    return HttpResponse.json(envelope({ id: "g9" }), { status: 201 });
  }),
  http.delete(url("/api/groups/g1"), () => HttpResponse.json(envelope({ outcome: "deactivated" }))),
  http.patch(url("/api/groups/g1/lead"), async({ request }) => {
    bodies.push(await request.json());

    return HttpResponse.json(envelope(null));
  }),
  http.post(url("/api/groups/g1/members"), () => HttpResponse.json(
    { success: false, message: "full", data: null, code: "groups.group_full", timestamp: "", traceId: "t", pagination: null },
    { status: 409 },
  )),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  bodies.length = 0;
});

afterAll(() => {
  server.close();
});

describe("groups service", () => {
  it("creates a group and returns its id", async() => {
    await expect(createGroup({ name: "UCI Tarde", type: "STUDENT" })).resolves.toBe("g9");
    expect(bodies).toEqual([{ name: "UCI Tarde", type: "STUDENT" }]);
  });

  it("tells whether a delete removed or deactivated the group", async() => {
    await expect(deleteGroup("g1")).resolves.toBe("deactivated");
  });

  it("clears the leader with a null user id", async() => {
    await setGroupLeader("g1", null);
    expect(bodies).toEqual([{ userId: null }]);
  });

  it("rejects with the backend error code", async() => {
    await expect(addGroupMember("g1", "s2")).rejects.toMatchObject({ code: "groups.group_full", status: 409 });
  });
});
