/*
* Funcionalidad: Admin settings page tests
* Descripción: /admin/settings with msw: one `GET /api/platform-settings` grouped in category tabs (the tab in ?category, a change written to the URL); the reset button is disabled for a DEFAULT setting and enabled for an OVERRIDE; a value outside the client limits shows its field error and sends nothing; a 409 version conflict shows "Otro administrador cambió este valor" and "Recargar" refetches and resets the form to the new value; a 422 out of range is shown on the field it names; saving a ventilator commands setting asks for a second confirmation with the previous value, the new value and the limits before the PATCH; the AI tab offers only the providers configured in `GET /api/system/status`. Depends on vitest, msw, Testing Library and the admin console test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PROVIDER_CHAIN_COPY } from "../components/provider-chain-editor";
import { SETTING_CARD_COPY } from "../components/setting-card";
import type { PlatformSettingDTO } from "../../api/dtos/admin-console.dto";
import { apiUrl, envelope, errorResponse, renderAdminConsole, settingDto, statusDto } from "./admin-console-test-helpers";
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
    http.get(apiUrl("/api/system/status"), () => HttpResponse.json(envelope(statusDto([
      { provider: "gemini", configured: true },
      { provider: "openai", configured: true },
      { provider: "anthropic", configured: false },
    ])))),
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
    expect(grace.getAllByText("Mín. 0, máx. 600, entero")).toHaveLength(2);
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

  it("offers only the configured AI providers in the provider chain", async() => {
    renderAdminConsole(<AdminSettingsPage />);

    const useCase = await card("ai.useCase.FREE_CHAT");
    const select = useCase.getByLabelText(PROVIDER_CHAIN_COPY.addLabel);

    await waitFor(() => expect(within(select).getAllByRole("option").map((option) => (option as HTMLOptionElement).value)).toEqual(["", "openai"]));
    expect(useCase.getByLabelText(PROVIDER_CHAIN_COPY.model("gemini"))).toHaveValue("gemini-2.0-flash");
    expect(useCase.getByLabelText("Temperatura")).toHaveValue("0.7");
  });
});
