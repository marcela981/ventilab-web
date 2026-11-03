/*
* Funcionalidad: Teacher dashboard routes tests
* Descripción: Verifies the dashboard URLs with their tab (a group opens the Grupo tab, an explicit tab wins, no group and no tab is the bare /teacher), the student detail URL under the directory route with the group it was opened from, and that every static route is in the session route table. Depends on vitest and the session route table.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { findRoute } from "@shared/session/routes.config";
import { buildStudentDetailUrl, buildTeacherDashboardUrl, TEACHER_DASHBOARD_URL, TEACHER_STUDENTS_URL } from "./teacher-dashboard.routes";

describe("buildTeacherDashboardUrl", () => {
  it("opens the default tab without a group", () => {
    expect(buildTeacherDashboardUrl(null)).toBe("/teacher");
  });

  it("opens the Grupo tab with the group", () => {
    expect(buildTeacherDashboardUrl("g 1")).toBe("/teacher?tab=grupo&groupId=g%201");
  });

  it("lets an explicit tab win", () => {
    expect(buildTeacherDashboardUrl(null, "general")).toBe("/teacher?tab=general");
    expect(buildTeacherDashboardUrl("g1", "general")).toBe("/teacher?tab=general&groupId=g1");
  });
});

describe("buildStudentDetailUrl", () => {
  it("lives under the students directory and keeps the group", () => {
    expect(buildStudentDetailUrl("u/1", null)).toBe("/teacher/students/u%2F1");
    expect(buildStudentDetailUrl("u1", "g1")).toBe("/teacher/students/u1?groupId=g1");
  });
});

describe("static routes", () => {
  it.each([TEACHER_DASHBOARD_URL, TEACHER_STUDENTS_URL])("%s is a route of the route table", (route) => {
    expect(findRoute(route)).not.toBeNull();
  });
});
