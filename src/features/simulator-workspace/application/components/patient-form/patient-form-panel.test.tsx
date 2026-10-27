/*
* Funcionalidad: Patient form panel tests
* Descripción: The Simular Paciente tab of /simulador (W8, Bloque 1) inside the real workspace (session provider,
*   fake session dependencies, msw for the HTTP calls; the Monitoreo panel is a stub): the July steps and buttons,
*   Siguiente blocked by Spanish validation messages, Atrás keeping the values, the draft surviving a tab switch,
*   "Cargar caso" listing the published cases with the catalog filters and filling the form from the case detail,
*   "Enviar al Monitoreo" starting a FREE session with the loaded case and the mapped patient and opening Monitoreo,
*   "Aleatorio" starting without a case, the send disabled while pending and a start failure shown in Spanish.
*   Depends on vitest, Testing Library, msw, SWR and the workspace test helpers.
*   v0.2 (W7 integration): the live lab connection controller is mocked idle.
* Versión: 0.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BACKEND_ORIGIN } from "@shared/lib/env";
import { buildTestCase } from "@shared/sim-engine/runtime/sim-test-helpers";
import { SimulatorWorkspacePage } from "../../pages/simulator-workspace.page";
import { createSessionHarness, routerStore } from "../../workspace-test-helpers";

vi.mock("next/router", async() => (await import("../../workspace-test-helpers")).nextRouterMock);
vi.mock("../../hooks/use-lab-connection-controller", async() => (await import("../../workspace-test-helpers")).labConnectionControllerMock);
vi.mock("../monitoring/monitoring-panel", () => ({ MonitoringPanel: () => <p>monitoring panel</p> }));

const apiUrl = (path: string): string => `${BACKEND_ORIGIN}${path}`;

const envelope = (data: unknown, pagination: Record<string, number> | null = null) => ({
  success: true,
  message: null,
  data,
  code: null,
  timestamp: "",
  traceId: "t",
  pagination: pagination ? { ...pagination, next: null, previous: null } : null,
});

const CASE_ID = "july-neumonia-grave";
const CASE_TITLE = "Caso 1: Neumonía grave con hipoxemia";

const caseSummary = {
  id: CASE_ID,
  title: CASE_TITLE,
  description: "Hombre de 60 años con neumonía grave",
  educationalGoal: "Ventilación protectora",
  mainDiagnosis: "Neumonía grave con hipoxemia",
  pathology: "NEUMONIA",
  difficulty: "INTERMEDIATE",
  patientAge: 60,
  patientWeight: 70,
  comorbidities: [],
};

const caseDetail = {
  clinicalCase: caseSummary,
  patient: {
    sex: "MALE",
    heightCm: 175,
    history: ["Hipertensión arterial"],
    allergies: [],
    initialVitals: {
      heartRateBpm: 105,
      respiratoryRateBpm: 24,
      spo2Percent: 84,
      temperatureC: 39.1,
      systolicMmHg: 150,
      diastolicMmHg: 90,
      glasgow: 15,
    },
  },
  userAttempts: { attempts: [], bestScore: null, lastAttempt: null, total: 0 },
};

const startedSession = (id: string) => ({
  id,
  seed: 42,
  engineVersion: "1.0.0",
  startedAt: "2026-10-26T14:00:00.000Z",
  expiresAt: null,
  timeMultiplier: 1,
  case: buildTestCase(),
});

const catalogQueries: Array<Record<string, string>> = [];
const startBodies: unknown[] = [];

const server = setupServer(
  http.get(apiUrl("/api/clinical-cases"), ({ request }) => {
    catalogQueries.push(Object.fromEntries(new URL(request.url).searchParams));

    return HttpResponse.json(envelope([{ clinicalCase: caseSummary, userAttempts: null }], { page: 1, pages: 1, limit: 8, total: 1 }));
  }),
  http.get(apiUrl(`/api/clinical-cases/${CASE_ID}`), () => HttpResponse.json(envelope(caseDetail))),
  http.post(apiUrl("/api/simulation/sessions"), async({ request }) => {
    startBodies.push(await request.json());

    return HttpResponse.json(envelope(startedSession("s1")), { status: 201 });
  }),
  http.get(apiUrl("/api/simulation/sessions/history"), () => HttpResponse.json(envelope([], { page: 1, pages: 0, limit: 10, total: 0 }))),
);

vi.setConfig({ testTimeout: 20_000 });

beforeAll(() => {
  configure({ asyncUtilTimeout: 4000 });
  server.listen({ onUnhandledRequest: "error" });
});

afterAll(() => {
  configure({ asyncUtilTimeout: 1000 });
  server.close();
});

beforeEach(() => {
  routerStore.reset({ tab: "simular" });
  catalogQueries.length = 0;
  startBodies.length = 0;
});

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

function Swr({ children }: { children: ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>{children}</SWRConfig>;
}

function renderPanel(): void {
  render(<SimulatorWorkspacePage deps={createSessionHarness().deps} />, { wrapper: Swr });
}

const field = (name: RegExp) => screen.getByRole("spinbutton", { name });
const select = (name: RegExp) => screen.getByRole("combobox", { name });
const button = (name: string | RegExp) => screen.getByRole("button", { name });

function type(element: HTMLElement, value: string): void {
  fireEvent.change(element, { target: { value } });
}

function fillStepOne(): void {
  type(field(/^Edad/), "60");
  type(select(/^Sexo/), "MALE");
  type(field(/^Peso actual/), "70");
  type(field(/^Estatura/), "175");
  type(select(/^Condición Principal/), "PNEUMONIA");
}

describe("PatientFormPanel", () => {
  it("shows the July form and blocks Siguiente with Spanish messages until step 1 is valid", async() => {
    renderPanel();

    expect(await screen.findByRole("heading", { name: "Configuración del Paciente" })).toBeVisible();
    expect(screen.getByText("Paciente y Condición")).toBeVisible();
    expect(screen.getByText("Estado Actual y Resumen")).toBeVisible();
    expect(button("Limpiar")).toBeVisible();
    expect(screen.queryByRole("button", { name: "← Atrás" })).toBeNull();

    fireEvent.click(button("Siguiente →"));

    expect(screen.getAllByText("Requerida")).toHaveLength(3);
    expect(screen.getAllByText("Requerido")).toHaveLength(2);

    fillStepOne();
    type(field(/^Estatura/), "230");
    fireEvent.click(button("Siguiente →"));
    expect(screen.getByText("Debe estar entre 140 y 215 cm")).toBeVisible();

    type(field(/^Estatura/), "175");
    expect(screen.getByRole("textbox", { name: /Peso Corp. Ideal/ })).toHaveValue("70.6");
    expect(screen.getByRole("textbox", { name: /VT predicho/ })).toHaveValue("423 – 565");

    fireEvent.click(button("Siguiente →"));

    expect(field(/^Frec. Resp./)).toBeVisible();
    expect(button("Enviar al Monitoreo")).toBeVisible();
    expect(screen.getByText("Parámetros Ventilatorios Sugeridos")).toBeVisible();

    fireEvent.click(button("← Atrás"));
    expect(field(/^Edad/)).toHaveValue(60);
  });

  it("keeps the draft when the student switches tabs", async() => {
    renderPanel();

    type(await screen.findByRole("textbox", { name: /^Nombre/ }), "María José");
    fireEvent.click(screen.getByRole("tab", { name: "Monitoreo" }));
    expect(await screen.findByText("monitoring panel")).toBeVisible();

    fireEvent.click(screen.getByRole("tab", { name: "Simular Paciente" }));

    expect(screen.getByRole("textbox", { name: /^Nombre/ })).toHaveValue("María José");
  });

  it("loads a published case with filters and starts the session on it with the edited patient", async() => {
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Cargar caso" }));

    const dialog = await screen.findByRole("dialog", { name: "Cargar caso clínico" });

    expect(await within(dialog).findByText(CASE_TITLE)).toBeVisible();
    expect(within(dialog).getByText("Neumonía · Intermedio")).toBeVisible();
    expect(catalogQueries[0]).toMatchObject({ status: "PUBLISHED", limit: "8", page: "1" });

    fireEvent.change(within(dialog).getByRole("combobox", { name: "Dificultad" }), { target: { value: "ADVANCED" } });
    await waitFor(() => expect(catalogQueries.at(-1)).toMatchObject({ difficulty: "ADVANCED" }));

    fireEvent.click(within(dialog).getByRole("button", { name: `Cargar: ${CASE_TITLE}` }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText(`Historia clínica "${CASE_TITLE}" cargada.`)).toBeVisible();
    expect(screen.getByText(`Caso base: ${CASE_TITLE}`)).toBeVisible();
    expect(field(/^Edad/)).toHaveValue(60);
    expect(select(/^Condición Principal/)).toHaveValue("PNEUMONIA");
    expect(screen.getByRole("textbox", { name: /^Antecedentes/ })).toHaveValue("Hipertensión arterial");

    type(screen.getByRole("textbox", { name: /^Alergias/ }), "Penicilina, látex");
    fireEvent.click(button("Siguiente →"));
    expect(field(/^SpO₂/)).toHaveValue(84);
    fireEvent.click(button("Enviar al Monitoreo"));

    await waitFor(() => expect(routerStore.query).toEqual({ tab: "monitoreo", session: "s1" }));
    expect(startBodies).toEqual([{
      mode: "FREE",
      caseId: CASE_ID,
      timeMultiplier: 1,
      patient: {
        ageYears: 60,
        sex: "MALE",
        weightKg: 70,
        heightCm: 175,
        condition: "PNEUMONIA",
        difficulty: "INTERMEDIATE",
        diagnosis: "Neumonía grave con hipoxemia",
        allergies: ["Penicilina", "látex"],
        history: ["Hipertensión arterial"],
        vitals: {
          respiratoryRateBpm: 24,
          spo2Percent: 84,
          heartRateBpm: 105,
          temperatureC: 39.1,
          systolicMmHg: 150,
          diastolicMmHg: 90,
          glasgow: 15,
        },
      },
    }]);
    expect(await screen.findByText("monitoring panel")).toBeVisible();
  });

  it("starts a random patient without a case and disables the send while pending", async() => {
    server.use(http.post(apiUrl("/api/simulation/sessions"), async({ request }) => {
      startBodies.push(await request.json());
      await delay(150);

      return HttpResponse.json(envelope(startedSession("s1")), { status: 201 });
    }));
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Aleatorio" }));
    expect(screen.getByText("Datos simulados aleatorios cargados.")).toBeVisible();
    fireEvent.click(button("Siguiente →"));
    fireEvent.click(button("Enviar al Monitoreo"));

    expect(await screen.findByRole("button", { name: "Enviando…" })).toBeDisabled();
    await waitFor(() => expect(routerStore.query).toEqual({ tab: "monitoreo", session: "s1" }));
    expect(startBodies).toHaveLength(1);
    expect(startBodies[0]).not.toHaveProperty("caseId");
    expect(startBodies[0]).toMatchObject({ mode: "FREE", patient: { vitals: {} } });
  });

  it("goes back to the step with an error and shows a start failure in Spanish", async() => {
    server.use(http.post(apiUrl("/api/simulation/sessions"), () => HttpResponse.json(
      { success: false, message: "x", data: null, code: "simulation.case_not_found", timestamp: "", traceId: "t", pagination: null },
      { status: 404 },
    )));
    renderPanel();

    fillStepOne();
    fireEvent.click(await screen.findByRole("button", { name: "Siguiente →" }));
    fireEvent.click(button("Enviar al Monitoreo"));

    expect(screen.getAllByText("Requerida")).toHaveLength(2);

    type(field(/^Frec. Resp./), "24");
    type(field(/^SpO₂/), "88");
    fireEvent.click(button("Enviar al Monitoreo"));

    expect(await screen.findByText("No se encontró el caso clínico o ya no está publicado.")).toBeVisible();
    expect(routerStore.query).toEqual({ tab: "simular" });
    expect(button("Enviar al Monitoreo")).toBeEnabled();
  });
});
