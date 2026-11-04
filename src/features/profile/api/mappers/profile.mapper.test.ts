/*
* Funcionalidad: Profile mapper tests
* Descripción: Tests of the profile mappers: UserDTO -> Profile (including `hasPassword`), and the PATCH /api/users/me body that carries ONLY the changed, trimmed name. Depends on vitest. v1.1 (closure B1): UserDTO fixture carries isSuperadmin and studentCode. v1.2 (Bloque 4, W7): the avatar is no longer part of the PATCH body; `hasPassword` mapped.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { Profile } from "../../application/entities/profile.entity";
import { hasProfileChanges, toProfile, toUpdateMeRequest } from "./profile.mapper";

const profile: Profile = {
  id: "u1",
  email: "ana@ventylab.demo",
  name: "Ana Torres",
  image: "https://cdn.example/old.png",
  role: "TEACHER",
  isActive: true,
  hasPassword: false,
};

describe("toProfile", () => {
  it("keeps the fields the page shows", () => {
    expect(toProfile({
      id: "u1",
      email: "ana@ventylab.demo",
      name: "Ana Torres",
      image: "https://cdn.example/old.png",
      role: "TEACHER",
      isActive: true,
      isSuperadmin: false,
      studentCode: null,
      emailVerified: null,
      hasPassword: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    })).toEqual(profile);
  });
});

describe("toUpdateMeRequest", () => {
  it("is empty when nothing changed", () => {
    const draft = { name: " Ana Torres " };

    expect(toUpdateMeRequest(draft, profile)).toEqual({});
    expect(hasProfileChanges(draft, profile)).toBe(false);
  });

  it("sends only the changed name, trimmed", () => {
    expect(toUpdateMeRequest({ name: "  Ana María Torres " }, profile)).toEqual({ name: "Ana María Torres" });
    expect(hasProfileChanges({ name: "Ana María Torres" }, profile)).toBe(true);
  });
});
