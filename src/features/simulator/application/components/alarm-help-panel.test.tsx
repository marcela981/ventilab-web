/*
* Funcionalidad: Alarm help panel tests
* Descripción: Drives the "¿Cómo estabilizar?" panel (Bloque A) against msw text/event-stream responses of
*   POST /api/simulation/sessions/{id}/alarm-help: the deterministic rules (text and reference) appear first and the AI
*   suggestion streams after them; an LLM answer offers "¿Te fue útil?" rated as AI_CALL with the aiCallId and the
*   SIM_ALARM surface; a DETERMINISTIC answer carries "Sugerencia automática (IA no disponible)" and no rating; the
*   rules stay when the AI part fails; EXAM with the help disabled shows only the alarm and "Ayuda no disponible
*   durante el examen" without any request; a penalty policy waits for "Solicitar ayuda". Also the pure rules parser.
*   Depends on vitest, Testing Library, msw, the shared SSE test helpers and the simulator test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { configure, fireEvent, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { deltaFrame, doneFrame, errorFrame, rulesFrame, sseResponse } from "@shared/ai-conversation/application/sse-test-helpers";
import { sessionAlarmHelpRequest } from "../../api/services/simulation-alarm-help.service";
import { ALARM_HELP_COPY, alarmHelpAvailability, parseAlarmRules } from "../entities/sim-alarm-help.entity";
import type { AlarmHelpAvailability } from "../entities/sim-alarm-help.entity";
import { apiUrl, envelope, renderWithSwr } from "../pages/simulator-test-helpers";
import { AlarmHelpPanel } from "./alarm-help-panel";

const HELP_URL = apiUrl("/api/simulation/sessions/s1/alarm-help");
const TARGET = { code: "HIGH_PRESSURE", label: "Presión alta", message: "Presión alta: 42 (límite 40)" };
const RULES = {
  alarmCode: "HIGH_PRESSURE",
  rules: [
    { id: "hp-1", text: "Revisa si hay secreciones u obstrucción del tubo.", reference: "Hess y Kacmarek, 2019" },
    { id: "hp-2", text: "Mide la presión meseta con una pausa inspiratoria.", reference: "ARDS Network, 2000" },
  ],
};
const server = setupServer(
  http.get(apiUrl("/api/ai-ratings/mine"), () => HttpResponse.json(envelope(null))),
);

beforeAll(() => {
  configure({ asyncUtilTimeout: 4000 });
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  configure({ asyncUtilTimeout: 1000 });
  server.close();
});

vi.setConfig({ testTimeout: 20_000 });

const AVAILABLE: AlarmHelpAvailability = { status: "available" };

function renderPanel(availability: AlarmHelpAvailability = AVAILABLE) {
  const buildRequest = availability.status === "unavailable" ? null : () => sessionAlarmHelpRequest("s1", TARGET.code);

  return renderWithSwr(<AlarmHelpPanel target={TARGET} availability={availability} buildRequest={buildRequest} />);
}

describe("parseAlarmRules", () => {
  it("keeps the rules with a text and drops the rest", () => {
    expect(parseAlarmRules(null)).toBeNull();
    expect(parseAlarmRules({ alarmCode: "APNEA", rules: [{ id: "a", text: "Revisa el circuito.", reference: "AHA 2020" }, { id: "b", text: " " }, "x"] })).toEqual({
      alarmCode: "APNEA",
      rules: [{ id: "a", text: "Revisa el circuito.", reference: "AHA 2020" }],
    });
  });

  it("follows the assistance policy: disabled is unavailable, a penalty asks first", () => {
    expect(alarmHelpAvailability({ status: "allowed" })).toEqual({ status: "available" });
    expect(alarmHelpAvailability({ status: "disabled", reason: "x" })).toEqual({ status: "unavailable", reason: ALARM_HELP_COPY.unavailableExam });
    expect(alarmHelpAvailability({ status: "penalty", message: "x" })).toEqual({ status: "penalty", message: ALARM_HELP_COPY.penalty });
  });
});

describe("AlarmHelpPanel", () => {
  it("shows the rules first, then the AI suggestion with its rating as an AI_CALL of SIM_ALARM", async() => {
    const bodies: unknown[] = [];
    const ratings: unknown[] = [];

    server.use(
      http.post(HELP_URL, async({ request }) => {
        bodies.push(await request.json());

        return sseResponse([rulesFrame(RULES), deltaFrame("Baja el Vt a 6 mL/kg."), doneFrame({ aiCallId: "call-7", source: "LLM", aiHelpEventId: "help-7" })]);
      }),
      http.put(apiUrl("/api/ai-ratings"), async({ request }) => {
        ratings.push(await request.json());

        return HttpResponse.json(envelope(null));
      }),
    );
    renderPanel();

    const rules = await screen.findByRole("list", { name: "Qué revisar primero" });

    expect(within(rules).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Revisa si hay secreciones u obstrucción del tubo.Fuente: Hess y Kacmarek, 2019",
      "Mide la presión meseta con una pausa inspiratoria.Fuente: ARDS Network, 2000",
    ]);
    expect(await screen.findByText("Baja el Vt a 6 mL/kg.", undefined, { timeout: 10_000 })).toBeInTheDocument();
    expect(await screen.findByText("¿Te fue útil?")).toBeInTheDocument();
    expect(screen.queryByText("Sugerencia automática (IA no disponible)")).not.toBeInTheDocument();
    expect(bodies).toEqual([{ alarmCode: "HIGH_PRESSURE", language: "es" }]);

    // The widget loads the previous rating first (thumbs disabled meanwhile).
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Sí, fue útil" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Sí, fue útil" }));
    await vi.waitFor(() => expect(ratings).toHaveLength(1));
    expect(ratings[0]).toMatchObject({ targetType: "AI_CALL", targetId: "call-7", surface: "SIM_ALARM" });
  });

  it("labels a DETERMINISTIC suggestion and does not rate it", async() => {
    server.use(http.post(HELP_URL, () => sseResponse([rulesFrame(RULES), deltaFrame("Revisa el tubo."), doneFrame({ aiCallId: "call-8", source: "DETERMINISTIC" })])));
    renderPanel();

    expect(await screen.findByText("Sugerencia automática (IA no disponible)")).toBeInTheDocument();
    expect(screen.queryByText("¿Te fue útil?")).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Qué revisar primero" })).toBeInTheDocument();
  });

  it("keeps the rules when the AI part fails and offers a retry", async() => {
    server.use(http.post(HELP_URL, () => sseResponse([rulesFrame(RULES), errorFrame("ai.provider_failed", "Falló")])));
    renderPanel();

    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Qué revisar primero" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("in an exam with the help disabled shows only the alarm and never asks the server", async() => {
    const requests = vi.fn();

    server.use(http.post(HELP_URL, () => {
      requests();

      return sseResponse([]);
    }));
    renderPanel({ status: "unavailable", reason: ALARM_HELP_COPY.unavailableExam });

    expect(screen.getByText("Presión alta: 42 (límite 40)")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Ayuda no disponible durante el examen");
    expect(screen.queryByRole("list", { name: "Qué revisar primero" })).not.toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(requests).not.toHaveBeenCalled();
  });

  it("with a penalty waits for the student to ask", async() => {
    const requests = vi.fn();

    server.use(http.post(HELP_URL, () => {
      requests();

      return sseResponse([rulesFrame(RULES), deltaFrame("Ok."), doneFrame({ aiCallId: "call-9", source: "LLM" })]);
    }));
    renderPanel({ status: "penalty", message: ALARM_HELP_COPY.penalty });

    expect(screen.getByText(ALARM_HELP_COPY.penalty)).toBeInTheDocument();
    expect(requests).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Solicitar ayuda" }));

    expect(await screen.findByRole("list", { name: "Qué revisar primero" })).toBeInTheDocument();
    expect(requests).toHaveBeenCalledTimes(1);
  });
});

describe("AlarmHelpPanel on the current state (fix sim-assist-current-state)", () => {
  it("builds the request after the console context resolves and shows the analyzed state", async() => {
    const bodies: unknown[] = [];

    server.use(http.post(HELP_URL, async({ request }) => {
      bodies.push(await request.json());

      return sseResponse([
        rulesFrame({ alarmCode: TARGET.code, rules: [] }),
        deltaFrame("Revisa la oxigenación."),
        doneFrame({ aiCallId: "call-a", source: "LLM", aiHelpEventId: "help-a", analysis: { simTimeMs: 78_000, severity: 0.7, patientStatus: "CRITICAL" } }),
      ]);
    }));
    const buildRequest = async() => sessionAlarmHelpRequest("s1", TARGET.code, await Promise.resolve({ simTimeMs: 78_000, unsentChanges: true }));

    renderWithSwr(<AlarmHelpPanel target={TARGET} availability={{ status: "available" }} buildRequest={buildRequest} />);

    expect(await screen.findByText("Analizado en t = 01:18 · gravedad 70 %")).toBeInTheDocument();
    expect(bodies).toEqual([{ alarmCode: TARGET.code, language: "es", simTimeMs: 78_000, unsentChanges: true }]);
  });

  it("labels a suggestion the AI kept contradicting", async() => {
    server.use(http.post(HELP_URL, () => sseResponse([
      rulesFrame({ alarmCode: TARGET.code, rules: [] }),
      deltaFrame("Sube la FiO2."),
      doneFrame({ aiCallId: "call-b", source: "DETERMINISTIC", notice: "INCONSISTENT_STATE" }),
    ])));
    renderWithSwr(<AlarmHelpPanel target={TARGET} availability={{ status: "available" }} buildRequest={() => sessionAlarmHelpRequest("s1", TARGET.code)} />);

    expect(await screen.findByText("La IA no pudo analizar el estado actual")).toBeInTheDocument();
  });
});
