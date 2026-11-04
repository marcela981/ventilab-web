/*
* Funcionalidad: Teacher general tab mapper and entities tests
* Descripción: Unit tests of the General tab of /teacher: toPlatformStatCards keeps the julio order and destinations and drops cards without a finite value; toRecentStudents uses the email when the name is blank, clamps the progress and (v1.2) treats a missing canView of the older server contract as false; greetingFor follows the Bogotá hour (UTC-5) and progressTone the julio thresholds. Depends on vitest, the teacher general mapper and entities and the students directory DTOs.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { bogotaHour, greetingFor, progressTone } from "../../application/entities/teacher-general.entity";
import type { AdminStudentListItemDTO, PlatformStatisticsDTO } from "../dtos/students-directory.dto";
import { toPlatformStatCards, toRecentStudents } from "./teacher-general.mapper";

const studentRow = (overrides: Partial<AdminStudentListItemDTO>): AdminStudentListItemDTO => ({
  canView: true,
  completedModules: 1,
  email: "ana@ventylab.demo",
  groupName: null,
  groups: [],
  id: "u1",
  lastActivity: null,
  name: "Ana Gómez",
  overallProgress: 40,
  studentCode: null,
  totalModules: 4,
  ...overrides,
});

describe("toPlatformStatCards", () => {
  it("maps the four julio cards in order with their destinations", () => {
    const cards = toPlatformStatCards({ activeStudents: 80, publishedModules: 12, totalLessons: 60, completionsToday: 0 } as Partial<PlatformStatisticsDTO>);

    expect(cards).toEqual([
      { key: "activeStudents", title: "Estudiantes activos", value: 80, href: "/teacher/students" },
      { key: "publishedModules", title: "Módulos publicados", value: 12, href: "/content" },
      { key: "totalLessons", title: "Lecciones totales", value: 60, href: "/content" },
      { key: "completionsToday", title: "Completados hoy", value: 0, href: "/teacher/students" },
    ]);
  });

  it("drops the cards whose value is missing or not a finite number", () => {
    const cards = toPlatformStatCards({ activeStudents: 5, publishedModules: null, totalLessons: Number.NaN } as unknown as Partial<PlatformStatisticsDTO>);

    expect(cards.map((card) => card.key)).toEqual(["activeStudents"]);
  });
});

describe("toRecentStudents", () => {
  it("uses the email without a name and clamps the progress to 0–100", () => {
    expect(toRecentStudents([
      studentRow({ id: "u1", name: "  ", overallProgress: 140, canView: false }),
      studentRow({ id: "u2", name: "Bruno", overallProgress: -3 }),
    ])).toEqual([
      { id: "u1", name: "ana@ventylab.demo", progress: 100, canView: false },
      { id: "u2", name: "Bruno", progress: 0, canView: true },
    ]);
  });


  it("treats a row of the older contract without canView as not viewable", () => {
    const legacy: Record<string, unknown> = { ...studentRow({ id: "u3" }) };
    delete legacy.canView;
    delete legacy.groups;
    delete legacy.studentCode;

    expect(toRecentStudents([legacy as unknown as AdminStudentListItemDTO])).toEqual([{ id: "u3", name: "Ana Gómez", progress: 40, canView: false }]);
  });
});

describe("greetingFor", () => {
  it.each([
    ["2026-11-03T05:00:00.000Z", 0, "Buenos días"],
    ["2026-11-03T16:59:00.000Z", 11, "Buenos días"],
    ["2026-11-03T17:00:00.000Z", 12, "Buenas tardes"],
    ["2026-11-03T23:59:00.000Z", 18, "Buenas tardes"],
    ["2026-11-04T00:00:00.000Z", 19, "Buenas noches"],
    ["2026-11-04T04:59:00.000Z", 23, "Buenas noches"],
  ])("at %s (Bogotá %i h) says %s", (iso, hour, greeting) => {
    expect(bogotaHour(new Date(iso))).toBe(hour);
    expect(greetingFor(new Date(iso))).toBe(greeting);
  });
});

describe("progressTone", () => {
  it("follows the julio thresholds", () => {
    expect([0, 29, 30, 69, 70, 100].map(progressTone)).toEqual(["error", "error", "warning", "warning", "success", "success"]);
  });
});
