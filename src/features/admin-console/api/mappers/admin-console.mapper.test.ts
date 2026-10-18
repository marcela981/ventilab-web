/*
* Funcionalidad: Admin console mapper tests
* Descripción: The system status keeps only the AI providers with credentials (`configured: true`), the settings are grouped by category in tab order with every category present, and the users and groups map to their rows and sorted options. Depends on vitest, the admin console mappers and the test helpers. v1.1 (closure B1): the analytics category (risk thresholds) joins the tab order after evaluation. v1.2 (closure B2): the AI providers catalog replaces the system status providers; the setting form metadata and nested key schema; the user row keeps studentCode and isSuperadmin.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import { groupDto, settingDto, userDto } from "../../application/pages/admin-console-test-helpers";
import { toAdminUserRow, toGroupFilterOptions } from "./admin-users.mapper";
import { groupSettingsByCategory, toAiProviderCatalog, toPlatformSetting } from "./platform-settings.mapper";

describe("admin console mappers", () => {
  it("maps the AI providers catalog with its configured flag and models", () => {
    expect(toAiProviderCatalog([
      { provider: "gemini", configured: true, models: ["gemini-2.0-flash"] },
      { provider: "openai", configured: false, models: [] },
    ])).toEqual([
      { provider: "gemini", configured: true, models: ["gemini-2.0-flash"] },
      { provider: "openai", configured: false, models: [] },
    ]);
  });

  it("keeps the form metadata of a setting and its nested key schema", () => {
    const setting = toPlatformSetting(settingDto("ai.prices", "ai", {}, {
      label: "Precios de IA",
      description: "Precio por proveedor y modelo.",
      unit: "USD por 1000 tokens",
      type: "map",
      keySchema: {
        path: null,
        keyLabel: "Proveedor",
        allowedKeys: ["gemini", "openai"],
        valueType: "map",
        valueLimits: null,
        valueKeySchema: { path: null, keyLabel: "Modelo", allowedKeys: null, valueType: "object", valueLimits: { inputPer1kUsd: { min: 0 } }, valueKeySchema: null },
      },
    }));

    expect(setting).toMatchObject({ label: "Precios de IA", unit: "USD por 1000 tokens", type: "map" });
    expect(setting.keySchema?.allowedKeys).toEqual(["gemini", "openai"]);
    expect(setting.keySchema?.valueKeySchema).toMatchObject({ keyLabel: "Modelo", allowedKeys: null, valueType: "object" });
    // Without metadata (older fixtures) the label falls back to the key.
    expect(toPlatformSetting(settingDto("evaluation.passingGrade", "evaluation", 3)).label).toBe("evaluation.passingGrade");
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
      studentCode: null,
      isSuperadmin: false,
    });
    expect(toAdminUserRow(userDto("u2", "Bea", { studentCode: "2026-0002", isSuperadmin: true }))).toMatchObject({ studentCode: "2026-0002", isSuperadmin: true });
    expect(toGroupFilterOptions([groupDto("g2", "Zeta", "TEACHER"), groupDto("g1", "Alfa")]).map((group) => group.name)).toEqual(["Alfa", "Zeta"]);
  });
});
