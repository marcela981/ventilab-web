/*
* Funcionalidad: Students directory mapper tests
* Descripción: Verifies the directory row mapping (active groups, student code, canView, progress bounded to 0–100) and, since v1.2, a row of the older server contract (only `groupName`, without `groups`, `studentCode` or `canView`); the statistics cards are tested with toPlatformStatCards. Depends on vitest and the students directory DTOs and mapper.
* Versión: 1.2
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

  it("normalizes a row of the older contract (groupName only, no groups, studentCode or canView)", () => {
    const legacy = {
      completedModules: 0,
      email: "old@ventylab.demo",
      groupName: "Grupo A",
      id: "u2",
      lastActivity: null,
      name: "Old",
      overallProgress: 10,
      totalModules: 4,
    } as unknown as AdminStudentListItemDTO;

    expect(toDirectoryRow(legacy)).toEqual({
      id: "u2",
      name: "Old",
      email: "old@ventylab.demo",
      studentCode: null,
      progress: 10,
      groups: [],
      canView: false,
    });
  });

  it("treats a non-array groups and a non-finite progress as empty", () => {
    const mapped = toDirectoryRow(row({
      groups: null as unknown as AdminStudentListItemDTO["groups"],
      overallProgress: Number.NaN,
    }));

    expect(mapped.groups).toEqual([]);
    expect(mapped.progress).toBe(0);
  });
});
