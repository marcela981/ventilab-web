/*
* Funcionalidad: Admin settings page tests
* Descripción: /admin/settings with msw: one `GET /api/platform-settings` grouped in category tabs (the tab in ?category, a change written to the URL); the reset button is disabled for a DEFAULT setting and enabled for an OVERRIDE; a value outside the client limits shows its field error and sends nothing; a 409 version conflict shows "Otro administrador cambió este valor" and "Recargar" refetches and resets the form to the new value; a 422 out of range is shown on the field it names; saving a ventilator commands setting asks for a second confirmation with the previous value, the new value and the limits before the PATCH; the AI tab offers only the providers configured in `GET /api/system/status`. Depends on vitest, msw, Testing Library and the admin console test helpers. v1.1 (O4a review): an ai.quotas override that omits a quota saves, and clearing a quota removes its key from the PATCH body; "1,000" in a number field shows the number error. v1.2 (closure B2): the providers come from `GET /api/admin/ai/providers` (unconfigured disabled, model select from the known models); metadata-driven cards (Spanish label as title with the key below, unit, integer type), string and integer-list types, a map setting (ai.prices) whose keys are added (allowedKeys select, free inner keys seeded from the default sample) and removed, and per-field server errors (`data.errors`) under the matching field with the unmatched ones on the card. v1.3 (B4, D7): number inputs read through the shared es-CO parser: "1,000" is the decimal 1, several separators or a space grouping are rejected, and the helper text explains the format.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { DECIMAL_ERROR_MESSAGES, DECIMAL_HELPER_TEXT, INTEGER_HELPER_TEXT } from "@shared/lib/parse-decimal";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PROVIDER_CHAIN_COPY } from "../components/provider-chain-editor";
import { SETTING_CARD_COPY } from "../components/setting-card";
import { FIELD_EDITOR_COPY } from "../components/setting-field-editor";
import type { PlatformSettingDTO } from "../../api/dtos/admin-console.dto";
import { apiUrl, envelope, errorResponse, renderAdminConsole, settingDto } from "./admin-console-test-helpers";
import { AdminSettingsPage } from "./admin-settings.page";

const router = vi.hoisted(() => ({
  pathname: "/admin/settings",
  asPath: "/admin/settings",
  isReady: true,
  query: {} as Record<string, string>,
  replace: vi.fn(() => Promise.resolve(true)),
  push: vi.fn(() => Promise.resolve(true)),
  prefetch: () => Promise.resolve(),
  events: { on: () => undefined, off: () => undefined, emit: () => undefined },
}));

vi.mock("next/router", () => ({ useRouter: () => router }));

vi.setConfig({ testTimeout: 20_000 });

const AI_VALUE = { providerChain: ["gemini"], models: { gemini: "gemini-2.0-flash" }, timeoutMs: 30000, maxOutputTokens: 1024, temperature: 0.7 };

function baseSettings(): PlatformSettingDTO[] {
  return [
    settingDto("ai.useCase.FREE_CHAT", "ai", AI_VALUE, {
      limits: {
        providerChain: { minLength: 1, maxLength: 3, requiresCredentials: true },
        timeoutMs: { min: 1000, max: 120000, integer: true },
        maxOutputTokens: { min: 1, max: 32768, integer: true },
        temperature: { min: 0, max: 2, integer: false },
      },
    }),
    settingDto("evaluation.passingGrade", "evaluation", 3, { limits: { min: 0, max: 10, integer: false } }),
    settingDto("evaluation.submitGraceSeconds", "evaluation", 60, {
      defaultValue: 30,
      origin: "OVERRIDE",
      version: 2,
      updatedAt: "2026-10-15T15:00:00.000Z",
      limits: { min: 0, max: 600, integer: true },
    }),
    settingDto("commands.safety.maxPeep", "commands", 20, { limits: { min: 0, max: 30, integer: false } }),
  ];
}

const server = setupServer();
let settings: PlatformSettingDTO[];
let listRequests: number;
let patches: { key: string, body: unknown }[];
let patchResponse: () => Response;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  settings = baseSettings();
  listRequests = 0;
  patches = [];
  patchResponse = () => HttpResponse.json(envelope(null));
  router.query = {};
  router.replace.mockClear();
  server.use(
    http.get(apiUrl("/api/platform-settings"), () => {
      listRequests += 1;

      return HttpResponse.json(envelope(settings));
    }),
    http.get(apiUrl("/api/admin/ai/providers"), () => HttpResponse.json(envelope([
      { provider: "gemini", configured: true, models: ["gemini-2.0-flash", "gemini-2.5-pro"] },
      { provider: "openai", configured: true, models: [] },
      { provider: "anthropic", configured: false, models: [] },
    ]))),
    http.patch(apiUrl("/api/platform-settings/:key"), async({ params, request }) => {
      patches.push({ key: String(params.key), body: await request.json() });

      return patchResponse();
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const QUOTA_LIMITS = { requestsPerDay: { min: 0, max: 100000, integer: true }, tokensPerDay: { min: 0, max: 10000000, integer: true } };

function quotasSetting(value: unknown): PlatformSettingDTO {
  return settingDto("ai.quotas", "ai", value, {
    defaultValue: { STUDENT: { "*": { requestsPerDay: 50, tokensPerDay: 20000 } } } as unknown as PlatformSettingDTO["defaultValue"],
    origin: "OVERRIDE",
    version: 1,
    limits: QUOTA_LIMITS,
  });
}

const PRICE_LIMITS = { inputPer1kUsd: { min: 0, max: 1, integer: false }, outputPer1kUsd: { min: 0, max: 1, integer: false } };

function pricesSetting(value: unknown): PlatformSettingDTO {
  return settingDto("ai.prices", "ai", value, {
    label: "Precios de IA",
    unit: "USD por 1000 tokens",
    type: "map",
    defaultValue: { gemini: { "gemini-2.0-flash": { inputPer1kUsd: 0.1, outputPer1kUsd: 0.4 } } } as unknown as PlatformSettingDTO["defaultValue"],
    origin: "OVERRIDE",
    version: 1,
    keySchema: {
      path: null,
      keyLabel: "Proveedor",
      allowedKeys: ["gemini", "openai"],
      valueType: "map",
      valueLimits: null,
      valueKeySchema: { path: null, keyLabel: "Modelo", allowedKeys: null, valueType: "object", valueLimits: PRICE_LIMITS, valueKeySchema: null },
    },
  });
}

async function card(key: string) {
  return within(await screen.findByRole("region", { name: key }));
}

describe("AdminSettingsPage", () => {
  it("groups the settings in category tabs kept in the URL and enables reset only for overrides", async() => {
    router.query = { category: "evaluation" };
    renderAdminConsole(<AdminSettingsPage />);

    const grade = await card("evaluation.passingGrade");
    const grace = await card("evaluation.submitGraceSeconds");

    expect(screen.queryByRole("region", { name: "ai.useCase.FREE_CHAT" })).not.toBeInTheDocument();
    expect(grade.getByText(SETTING_CARD_COPY.originDefault)).toBeInTheDocument();
    expect(grade.getByRole("button", { name: SETTING_CARD_COPY.reset })).toBeDisabled();
    expect(grace.getByText(SETTING_CARD_COPY.originOverride)).toBeInTheDocument();
    expect(grace.getByRole("button", { name: SETTING_CARD_COPY.reset })).toBeEnabled();
    // Shown in the card facts and as the help of the field.
    expect(grace.getByText("Mín. 0, máx. 600, entero")).toBeInTheDocument();
    expect(grace.getByText(`Mín. 0, máx. 600, entero ${INTEGER_HELPER_TEXT}`)).toBeInTheDocument();
    expect(listRequests).toBe(1);

    fireEvent.click(screen.getByRole("tab", { name: "Comandos del ventilador" }));

    expect(router.replace).toHaveBeenCalledWith({ pathname: "/admin/settings", query: { category: "commands" } }, undefined, { shallow: true });
  });

  it("shows a client limit error on the field and sends nothing", async() => {
    router.query = { category: "evaluation" };
    renderAdminConsole(<AdminSettingsPage />);

    const grade = await card("evaluation.passingGrade");

    fireEvent.change(grade.getByLabelText("Valor"), { target: { value: "11" } });

    expect(grade.getByText("Debe estar entre 0 y 10.")).toBeInTheDocument();

    fireEvent.click(grade.getByRole("button", { name: SETTING_CARD_COPY.save }));

    expect(await grade.findByText(SETTING_CARD_COPY.invalidForm)).toBeInTheDocument();
    expect(patches).toEqual([]);
  });

  it("shows the version conflict notice and reloads the new value", async() => {
    router.query = { category: "evaluation" };
    patchResponse = () => errorResponse("platform-settings.version_conflict", 409, { key: "evaluation.submitGraceSeconds", currentVersion: 3 });
    renderAdminConsole(<AdminSettingsPage />);

    const grace = await card("evaluation.submitGraceSeconds");

    fireEvent.change(grace.getByLabelText("Valor"), { target: { value: "90" } });
    fireEvent.click(grace.getByRole("button", { name: SETTING_CARD_COPY.save }));

    expect(await grace.findByText(SETTING_CARD_COPY.conflict)).toBeInTheDocument();
    expect(patches).toEqual([{ key: "evaluation.submitGraceSeconds", body: { value: 90, version: 2 } }]);

    settings = settings.map((item) => (item.key === "evaluation.submitGraceSeconds" ? { ...item, value: 120, version: 3 } : item));
    fireEvent.click(grace.getByRole("button", { name: SETTING_CARD_COPY.reload }));

    // The card remounts with the new version: query it again.
    await waitFor(() => expect(within(screen.getByRole("region", { name: "evaluation.submitGraceSeconds" })).getByLabelText("Valor")).toHaveValue("120"));
    expect(screen.queryByText(SETTING_CARD_COPY.conflict)).not.toBeInTheDocument();
  });

  it("shows a 422 out of range error on the field it names", async() => {
    router.query = { category: "evaluation" };
    patchResponse = () => errorResponse("platform-settings.hard_limit_exceeded", 422, { key: "evaluation.passingGrade", reason: "value must be between 0 and 5" });
    renderAdminConsole(<AdminSettingsPage />);

    const grade = await card("evaluation.passingGrade");

    fireEvent.change(grade.getByLabelText("Valor"), { target: { value: "7" } });
    fireEvent.click(grade.getByRole("button", { name: SETTING_CARD_COPY.save }));

    expect(await grade.findByText("Debe estar entre 0 y 5.")).toBeInTheDocument();
    expect(grade.getByLabelText("Valor")).toHaveAttribute("aria-invalid", "true");
  });

  it("asks for a second confirmation with the previous value, the new value and the limits before saving a ventilator command limit", async() => {
    router.query = { category: "commands" };
    renderAdminConsole(<AdminSettingsPage />);

    const peep = await card("commands.safety.maxPeep");

    fireEvent.change(peep.getByLabelText("Valor"), { target: { value: "25" } });
    fireEvent.click(peep.getByRole("button", { name: SETTING_CARD_COPY.save }));

    const dialog = await screen.findByRole("dialog", { name: SETTING_CARD_COPY.commandsSaveTitle });

    expect(within(dialog).getByText("Valor: 20 → 25 (límites: Mín. 0, máx. 30, decimal)")).toBeInTheDocument();
    expect(patches).toEqual([]);

    fireEvent.click(within(dialog).getByRole("button", { name: SETTING_CARD_COPY.confirmSave }));

    await waitFor(() => expect(patches).toEqual([{ key: "commands.safety.maxPeep", body: { value: 25, version: 0 } }]));
    expect(await screen.findByText(SETTING_CARD_COPY.saved("commands.safety.maxPeep"))).toBeInTheDocument();
  });

  it("saves an ai.quotas override that omits a quota (unlimited)", async() => {
    settings = [...baseSettings(), quotasSetting({ STUDENT: { "*": { requestsPerDay: 50 } } })];
    router.query = { category: "ai" };
    renderAdminConsole(<AdminSettingsPage />);

    const quotas = await card("ai.quotas");

    expect(quotas.getByLabelText("Tokens por día")).toHaveValue("");

    fireEvent.change(quotas.getByLabelText("Solicitudes por día"), { target: { value: "60" } });
    fireEvent.click(quotas.getByRole("button", { name: SETTING_CARD_COPY.save }));

    await waitFor(() => expect(patches).toEqual([{ key: "ai.quotas", body: { value: { STUDENT: { "*": { requestsPerDay: 60 } } }, version: 1 } }]));
  });

  it("removes a cleared quota from the PATCH body", async() => {
    settings = [...baseSettings(), quotasSetting({ STUDENT: { "*": { requestsPerDay: 50, tokensPerDay: 20000 } } })];
    router.query = { category: "ai" };
    renderAdminConsole(<AdminSettingsPage />);

    const quotas = await card("ai.quotas");

    fireEvent.change(quotas.getByLabelText("Tokens por día"), { target: { value: "" } });

    expect(quotas.queryByText("Ingresa un número.")).not.toBeInTheDocument();

    fireEvent.click(quotas.getByRole("button", { name: SETTING_CARD_COPY.save }));

    await waitFor(() => expect(patches).toEqual([{ key: "ai.quotas", body: { value: { STUDENT: { "*": { requestsPerDay: 50 } } }, version: 1 } }]));
  });

  it("reads numbers with the shared es-CO parser and explains the format", async() => {
    router.query = { category: "evaluation" };
    renderAdminConsole(<AdminSettingsPage />);

    const grade = await card("evaluation.passingGrade");
    const grace = await card("evaluation.submitGraceSeconds");

    expect(grade.getByText(DECIMAL_HELPER_TEXT, { exact: false })).toBeInTheDocument();
    expect(grace.getByText(INTEGER_HELPER_TEXT, { exact: false })).toBeInTheDocument();

    for (const grouped of ["1.000.000", "1 000"]) {
      fireEvent.change(grade.getByLabelText("Valor"), { target: { value: grouped } });
      expect(grade.getByText(DECIMAL_ERROR_MESSAGES.thousandsSeparator)).toBeInTheDocument();
    }

    // One separator is always decimal: "3,125" is 3.125.
    fireEvent.change(grade.getByLabelText("Valor"), { target: { value: "3,125" } });
    expect(grade.queryByText(DECIMAL_ERROR_MESSAGES.thousandsSeparator)).not.toBeInTheDocument();
    expect(grade.queryByText("Ingresa un número.")).not.toBeInTheDocument();

    // An integer setting accepts no separator, so "1.000" is never read as 1.
    fireEvent.change(grace.getByLabelText("Valor"), { target: { value: "1.000" } });
    expect(grace.getByText(DECIMAL_ERROR_MESSAGES.notInteger)).toBeInTheDocument();
  });

  it("offers the AI providers of the catalog in the provider chain, the unconfigured ones disabled", async() => {
    renderAdminConsole(<AdminSettingsPage />);

    const useCase = await card("ai.useCase.FREE_CHAT");
    const select = useCase.getByLabelText(PROVIDER_CHAIN_COPY.addLabel);

    await waitFor(() => expect(within(select).getAllByRole("option").map((option) => (option as HTMLOptionElement).value)).toEqual(["", "openai", "anthropic"]));
    expect(within(select).getByRole("option", { name: PROVIDER_CHAIN_COPY.notConfiguredOption("anthropic") })).toBeDisabled();
    // The known models of gemini make its model a select.
    await waitFor(() => expect(useCase.getByLabelText(PROVIDER_CHAIN_COPY.model("gemini")).tagName).toBe("SELECT"));
    expect(useCase.getByLabelText(PROVIDER_CHAIN_COPY.model("gemini"))).toHaveValue("gemini-2.0-flash");
    expect(useCase.getByLabelText("Temperatura")).toHaveValue("0.7");
  });

  it("titles the card with the Spanish label, shows the unit and keeps the key below it", async() => {
    settings = [settingDto("evaluation.submitGraceSeconds", "evaluation", 60, {
      label: "Tolerancia de envío",
      description: "Segundos de gracia después del cierre.",
      unit: "s",
      type: "integer",
      limits: { min: 0, max: 600, integer: true },
    })];
    router.query = { category: "evaluation" };
    renderAdminConsole(<AdminSettingsPage />);

    const grace = await card("Tolerancia de envío");

    expect(grace.getByText("evaluation.submitGraceSeconds")).toBeInTheDocument();
    expect(grace.getByText("Segundos de gracia después del cierre.")).toBeInTheDocument();
    expect(grace.getAllByText("s").length).toBeGreaterThan(0);

    fireEvent.change(grace.getByLabelText("Valor"), { target: { value: "1.5" } });

    expect(grace.getByText(DECIMAL_ERROR_MESSAGES.notInteger)).toBeInTheDocument();
  });

  it("edits a string setting and an integer list from their declared types", async() => {
    settings = [
      settingDto("simulation.defaultCaseTag", "simulation", "", { label: "Etiqueta por defecto", type: "string", limits: { maxLength: 20 } }),
      settingDto("simulation.allowedTimeMultipliers", "simulation", [], { label: "Multiplicadores de tiempo", type: "integer-list", limits: { min: 1, max: 10 } }),
    ];
    router.query = { category: "simulation" };
    renderAdminConsole(<AdminSettingsPage />);

    const tag = await card("Etiqueta por defecto");

    fireEvent.change(tag.getByLabelText("Valor"), { target: { value: "UCI" } });
    fireEvent.click(tag.getByRole("button", { name: SETTING_CARD_COPY.save }));
    await waitFor(() => expect(patches).toEqual([{ key: "simulation.defaultCaseTag", body: { value: "UCI", version: 0 } }]));

    const multipliers = await card("Multiplicadores de tiempo");

    fireEvent.click(multipliers.getByRole("button", { name: FIELD_EDITOR_COPY.addItem }));
    fireEvent.change(multipliers.getByLabelText(FIELD_EDITOR_COPY.item("Valor", 0)), { target: { value: "2.5" } });

    expect(multipliers.getByText("Elemento 1: Ingresa un número.")).toBeInTheDocument();
  });

  it("adds and removes the keys of a map setting from its key schema", async() => {
    settings = [pricesSetting({ gemini: { "gemini-2.0-flash": { inputPer1kUsd: 0.1, outputPer1kUsd: 0.4 } } })];
    router.query = { category: "ai" };
    renderAdminConsole(<AdminSettingsPage />);

    const prices = await card("Precios de IA");
    const providerKey = prices.getByLabelText(FIELD_EDITOR_COPY.newKey("Proveedor"));

    // allowedKeys: a select of the providers still missing.
    expect(within(providerKey).getAllByRole("option").map((option) => (option as HTMLOptionElement).value)).toEqual(["", "openai"]);
    fireEvent.change(providerKey, { target: { value: "openai" } });
    fireEvent.click(prices.getByRole("button", { name: FIELD_EDITOR_COPY.addKey("Proveedor") }));

    // The inner map (models) takes free keys.
    const modelInputs = prices.getAllByLabelText(FIELD_EDITOR_COPY.newKey("Modelo"));

    fireEvent.change(modelInputs[1] as HTMLElement, { target: { value: "gpt-4o" } });
    fireEvent.click(prices.getAllByRole("button", { name: FIELD_EDITOR_COPY.addKey("Modelo") })[1] as HTMLElement);
    fireEvent.click(prices.getByRole("button", { name: FIELD_EDITOR_COPY.removeKey("Proveedor", "gemini") }));
    fireEvent.click(prices.getByRole("button", { name: SETTING_CARD_COPY.save }));

    // A new key starts from the sample value of the default.
    await waitFor(() => expect(patches).toEqual([{
      key: "ai.prices",
      body: { value: { openai: { "gpt-4o": { inputPer1kUsd: 0.1, outputPer1kUsd: 0.4 } } }, version: 1 },
    }]));
  });

  it("puts the per-field server errors under the field they name", async() => {
    settings = [pricesSetting({ gemini: { "gemini-2.0-flash": { inputPer1kUsd: 0.1, outputPer1kUsd: 0.4 } } })];
    router.query = { category: "ai" };
    patchResponse = () => errorResponse("platform-settings.hard_limit_exceeded", 422, {
      key: "ai.prices",
      errors: [
        { field: "ai.prices.gemini.gemini-2.0-flash.outputPer1kUsd", message: "Debe ser como máximo 1." },
        { field: "version", message: "La versión no es válida." },
      ],
    });
    renderAdminConsole(<AdminSettingsPage />);

    const prices = await card("Precios de IA");

    fireEvent.change(prices.getByLabelText("Salida por 1k tokens (USD)"), { target: { value: "0.9" } });
    fireEvent.click(prices.getByRole("button", { name: SETTING_CARD_COPY.save }));

    expect(await prices.findByText("Debe ser como máximo 1.")).toBeInTheDocument();
    expect(prices.getByLabelText("Salida por 1k tokens (USD)")).toHaveAttribute("aria-invalid", "true");
    expect(prices.getByText("La versión no es válida.")).toBeInTheDocument();
  });
});
