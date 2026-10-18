/*
* Funcionalidad: Admin console mapper tests
* Descripción: The system status keeps only the AI providers with credentials (`configured: true`), the settings are grouped by category in tab order with every category present, and the users and groups map to their rows and sorted options. Depends on vitest, the admin console mappers and the test helpers. v1.1 (closure B1): the analytics category (risk thresholds) joins the tab order after evaluation.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { groupDto, settingDto, statusDto, userDto } from "../../application/pages/admin-console-test-helpers";
import { toAdminUserRow, toGroupFilterOptions } from "./admin-users.mapper";
import { groupSettingsByCategory, toConfiguredProviders, toPlatformSetting } from "./platform-settings.mapper";

describe("admin console mappers", () => {
  it("keeps only the AI providers with credentials", () => {
    expect(toConfiguredProviders(statusDto([{ provider: "gemini", configured: true }, { provider: "openai", configured: false }]))).toEqual([
      { provider: "gemini", available: true },
    ]);
  });

  it("groups the settings by category with every category present", () => {
    const grouped = groupSettingsByCategory([
      toPlatformSetting(settingDto("telemetry.recordingHz", "telemetry", 50)),
      toPlatformSetting(settingDto("evaluation.passingGrade", "evaluation", 3)),
    ]);

    expect(Object.keys(grouped)).toEqual(["ai", "evaluation", "analytics", "simulation", "reservations", "telemetry", "commands"]);
    expect(grouped.telemetry.map((setting) => setting.key)).toEqual(["telemetry.recordingHz"]);
    expect(grouped.ai).toEqual([]);
  });

  it("maps users and sorts the group options by name", () => {
    expect(toAdminUserRow(userDto("u1", "Ana", { isActive: false }))).toEqual({
      id: "u1",
      name: "Ana",
      email: "u1@ventylab.demo",
      role: "STUDENT",
      isActive: false,
      createdAt: "2026-01-15T10:30:00.000Z",
    });
    expect(toGroupFilterOptions([groupDto("g2", "Zeta", "TEACHER"), groupDto("g1", "Alfa")]).map((group) => group.name)).toEqual(["Alfa", "Zeta"]);
  });
});
