/*
* Funcionalidad: Students directory mapper tests
* Descripción: Verifies the directory row mapping (active groups, student code, canView, progress bounded to 0–100) and the four statistics cards, hidden when the API gives no number. Depends on vitest and the students directory DTOs and mapper.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import type { AdminStudentListItemDTO, PlatformStatisticsDTO } from "../dtos/students-directory.dto";
import { toDirectoryRow, toDirectoryStatistics } from "./students-directory.mapper";

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

describe("toDirectoryStatistics", () => {
  const stats = {
    activeStudents: 80,
    publishedModules: 12,
    totalLessons: 40,
    completionsToday: 5,
  } as unknown as PlatformStatisticsDTO;

  it("gives the four cards in order", () => {
    expect(toDirectoryStatistics(stats)).toEqual([
      { key: "activeStudents", value: 80 },
      { key: "publishedModules", value: 12 },
      { key: "totalLessons", value: 40 },
      { key: "completionsToday", value: 5 },
    ]);
  });

  it("hides a card without a number", () => {
    const partial = { ...stats, completionsToday: null } as unknown as PlatformStatisticsDTO;

    expect(toDirectoryStatistics(partial).map((card) => card.key)).toEqual(["activeStudents", "publishedModules", "totalLessons"]);
  });
});
