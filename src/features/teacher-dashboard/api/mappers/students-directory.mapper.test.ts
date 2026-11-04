/*
* Funcionalidad: Students directory mapper tests
* Descripción: Verifies the directory row mapping (active groups, student code, canView, progress bounded to 0–100); the statistics cards are tested with toPlatformStatCards. Depends on vitest and the students directory DTOs and mapper.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { AdminStudentListItemDTO } from "../dtos/students-directory.dto";
import { toDirectoryRow } from "./students-directory.mapper";

const row = (overrides: Partial<AdminStudentListItemDTO> = {}): AdminStudentListItemDTO => ({
  canView: true,
  completedModules: 1,
  email: "ana@ventylab.demo",
  groupName: "Grupo A",
  groups: [{ id: "g1", name: "Grupo A" }],
  id: "u1",
  lastActivity: null,
  name: "Ana",
  overallProgress: 45,
  studentCode: "2026-0001",
  totalModules: 4,
  ...overrides,
});

describe("toDirectoryRow", () => {
  it("maps the row", () => {
    expect(toDirectoryRow(row())).toEqual({
      id: "u1",
      name: "Ana",
      email: "ana@ventylab.demo",
      studentCode: "2026-0001",
      progress: 45,
      groups: [{ id: "g1", name: "Grupo A" }],
      canView: true,
    });
  });

  it("bounds the progress", () => {
    expect(toDirectoryRow(row({ overallProgress: 140 })).progress).toBe(100);
    expect(toDirectoryRow(row({ overallProgress: -3 })).progress).toBe(0);
  });
});
