/*
* Funcionalidad: Profile mapper tests
* Descripción: Tests of the profile mappers: UserDTO -> Profile, and the PATCH /api/users/me body that carries ONLY the changed fields (trimmed name; blank avatar -> null to remove it). Depends on vitest.
* Versión: 1.0
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
      emailVerified: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    })).toEqual(profile);
  });
});

describe("toUpdateMeRequest", () => {
  it("is empty when nothing changed", () => {
    const draft = { name: " Ana Torres ", image: "https://cdn.example/old.png" };

    expect(toUpdateMeRequest(draft, profile)).toEqual({});
    expect(hasProfileChanges(draft, profile)).toBe(false);
  });

  it("sends only the changed name, trimmed", () => {
    expect(toUpdateMeRequest({ name: "  Ana María Torres ", image: "https://cdn.example/old.png" }, profile)).toEqual({
      name: "Ana María Torres",
    });
  });

  it("sends only the changed avatar", () => {
    expect(toUpdateMeRequest({ name: "Ana Torres", image: " https://cdn.example/new.png " }, profile)).toEqual({
      image: "https://cdn.example/new.png",
    });
  });

  it("sends null to remove the avatar", () => {
    expect(toUpdateMeRequest({ name: "Ana Torres", image: "  " }, profile)).toEqual({ image: null });
  });
});
