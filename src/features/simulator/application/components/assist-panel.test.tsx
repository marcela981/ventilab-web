/*
* Funcionalidad: Simulator AI assist tests
* Descripción: Drives the "Asesoría IA" launcher and its lazy side panel against msw text/event-stream responses of
*   POST /api/simulation/sessions/{id}/assist: streamed deltas render and "Detener" aborts (no answer recorded), the
*   request body carries only the contract fields, the rating appears after `done` and the answer stays listed after
*   closing and reopening the panel, the policy disables the button with its reason (EXAM without a known policy,
*   DISABLED), a penalty policy asks for confirmation before every request, a 429 quota shows the standard quota
*   message, provider errors before and during the stream show the standard messages, and an inactive session closes
*   the panel. Depends on vitest, Testing Library, msw, the shared SSE test helpers and the simulator test helpers.
*   v1.1 (review of bc8a596): a longer wait for the first streamed text (deltas commit per animation frame, which lags
*   under full-suite load), the question given back after a failure before the stream, and host-kept answers listed.
*   v1.2 (W6, Bloque 4): a rating carries the SIMULATOR_ASSIST surface.
*   v1.3 (Bloque A): a DETERMINISTIC answer shows the fallback label and no rating; the real monitor assistance posts
*   the monitor state read at each request to /simulation/real/assist and rates the answer as an AI_CALL.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { configure, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AI_STREAM_ERROR_MESSAGES } from "@shared/ai-conversation";
import { controlledStream, deltaFrame, doneFrame, errorFrame, sseResponse } from "@shared/ai-conversation/application/sse-test-helpers";
import { ASSIST_POLICY_COPY, resolveAssistPolicy } from "../entities/sim-assist.entity";
import type { AssistancePolicyValue } from "../entities/sim-assist.entity";
import type { SimulationMode } from "../config/simulator.config";
import { apiUrl, envelope, renderWithSwr } from "../pages/simulator-test-helpers";
import { AssistLauncher } from "./assist-launcher";

const ASSIST_URL = apiUrl("/api/simulation/sessions/s1/assist");
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

// The lazy panel and MUI render slowly on the shared machine.
vi.setConfig({ testTimeout: 20_000 });

function renderLauncher(props: { mode?: SimulationMode, policy?: AssistancePolicyValue | null, active?: boolean } = {}) {
  const view = (active: boolean) => (
    <AssistLauncher sessionId="s1" mode={props.mode ?? "FREE"} policy={props.policy} active={active} />
  );
  const result = renderWithSwr(view(props.active ?? true));

  return { ...result, setActive: (active: boolean) => result.rerender(view(active)) };
}

async function openPanel() {
  fireEvent.click(screen.getByRole("button", { name: "Asesoría IA" }));

  return screen.findByRole("complementary", { name: "Asesoría IA" });
}

// The panel button (a confirmation dialog has its own "Solicitar asesoría").
const requestAssist = () => fireEvent.click(within(screen.getByRole("complementary", { name: "Asesoría IA", hidden: true })).getByRole("button", { name: "Solicitar asesoría", hidden: true }));

describe("resolveAssistPolicy", () => {
  it("allows FREE, fails safe in EXAM without a known policy and asks per use with a penalty", () => {
    expect(resolveAssistPolicy("FREE", undefined)).toEqual({ status: "allowed" });
    expect(resolveAssistPolicy("FREE", "DISABLED")).toEqual({ status: "disabled", reason: ASSIST_POLICY_COPY.disabled });
    expect(resolveAssistPolicy("EXAM", null)).toEqual({ status: "disabled", reason: ASSIST_POLICY_COPY.unverified });
    expect(resolveAssistPolicy("EXAM", "DISABLED")).toEqual({ status: "disabled", reason: ASSIST_POLICY_COPY.disabled });
    expect(resolveAssistPolicy("EXAM", "ALLOWED_WITH_PENALTY")).toEqual({ status: "penalty", message: ASSIST_POLICY_COPY.penalty });
  });
});

describe("AI assist panel", () => {
  it("streams the answer as it arrives and Detener aborts it without recording it", async() => {
    const stream = controlledStream();
    const bodies: unknown[] = [];

    server.use(http.post(ASSIST_URL, async({ request }) => {
      bodies.push(await request.json());

      return stream.response();
    }));
    renderLauncher();

    const panel = await openPanel();

    fireEvent.change(within(panel).getByLabelText("Pregunta (opcional)"), { target: { value: "  ¿Por qué suena la alarma?  " } });
    requestAssist();
    stream.push(deltaFrame("La presión pico "));
    stream.push(deltaFrame("supera el límite."));

    // Deltas commit once per animation frame; under full-suite load rAF can lag, so allow a longer wait.
    expect(await within(panel).findByText("La presión pico supera el límite.", undefined, { timeout: 10_000 })).toBeInTheDocument();
    expect(bodies).toEqual([{ language: "es", question: "¿Por qué suena la alarma?" }]);
    expect(within(panel).getByText("¿Por qué suena la alarma?")).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Detener" }));

    expect(await within(panel).findByText(/Respuesta detenida/)).toBeInTheDocument();
    expect(within(panel).queryByText("¿Te fue útil?")).not.toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Solicitar asesoría" })).toBeEnabled();
    stream.close();
  });

  it("shows the rating after done and keeps the answer listed when the panel is reopened", async() => {
    const bodies: unknown[] = [];

    server.use(http.post(ASSIST_URL, async({ request }) => {
      bodies.push(await request.json());

      return sseResponse([
        deltaFrame("Vas bien: la meseta está en rango."),
        doneFrame({ aiHelpEventId: "help-1", aiCallId: "call-1", source: "LLM" }),
      ]);
    }));
    renderLauncher();

    let panel = await openPanel();

    requestAssist();

    expect(await within(panel).findByText("¿Te fue útil?")).toBeInTheDocument();
    // The markdown renderer loads lazily.
    expect(await within(panel).findByText("Vas bien: la meseta está en rango.")).toBeInTheDocument();
    expect(bodies).toEqual([{ language: "es" }]);

    fireEvent.click(within(panel).getByRole("button", { name: "Cerrar asesoría" }));
    expect(screen.queryByRole("complementary", { name: "Asesoría IA" })).not.toBeInTheDocument();

    panel = await openPanel();
    await waitFor(() => expect(within(panel).getByRole("list", { name: "Asesorías de esta sesión" })).toHaveTextContent("Vas bien: la meseta está en rango."));
    expect(within(panel).getByText("¿Te fue útil?")).toBeInTheDocument();
  });

  it("labels a DETERMINISTIC answer as automatic and does not offer the rating (Bloque A)", async() => {
    server.use(http.post(ASSIST_URL, () => sseResponse([
      deltaFrame("Revisa la PEEP y la FiO2."),
      doneFrame({ aiHelpEventId: "help-2", aiCallId: "call-2", source: "DETERMINISTIC" }),
    ])));
    renderLauncher();

    const panel = await openPanel();

    requestAssist();

    expect(await within(panel).findByText("Respuesta automática (IA no disponible)")).toBeInTheDocument();
    expect(await within(panel).findByText("Revisa la PEEP y la FiO2.")).toBeInTheDocument();
    expect(within(panel).queryByText("¿Te fue útil?")).not.toBeInTheDocument();
  });

  it("in real mode posts the monitor state read at the request and rates the answer as an AI_CALL (Bloque A)", async() => {
    const bodies: unknown[] = [];
    const ratings: unknown[] = [];
    let spo2 = 95;
    const realMonitor = vi.fn(() => ({ mode: "VCV", metrics: { spo2Percent: spo2 }, alarms: ["HIGH_PRESSURE"] }));

    server.use(
      http.post(apiUrl("/api/simulation/real/assist"), async({ request }) => {
        bodies.push(await request.json());

        return sseResponse([deltaFrame("Revisa la presión pico."), doneFrame({ aiCallId: "call-real", source: "LLM" })]);
      }),
      http.put(apiUrl("/api/ai-ratings"), async({ request }) => {
        ratings.push(await request.json());

        return HttpResponse.json(envelope(null));
      }),
    );
    renderWithSwr(<AssistLauncher sessionId="" mode="FREE" active realMonitor={realMonitor} />);

    const panel = await openPanel();

    expect(within(panel).getByText(/nunca envía comandos al ventilador/)).toBeInTheDocument();
    spo2 = 91;
    fireEvent.change(within(panel).getByLabelText("Pregunta (opcional)"), { target: { value: "¿Qué reviso?" } });
    requestAssist();

    expect(await within(panel).findByText("¿Te fue útil?")).toBeInTheDocument();
    expect(bodies).toEqual([{ state: { mode: "VCV", metrics: { spo2Percent: 91 }, alarms: ["HIGH_PRESSURE"] }, question: "¿Qué reviso?", language: "es" }]);
    await waitFor(() => expect(within(panel).getByRole("button", { name: "Sí, fue útil" })).toBeEnabled());
    fireEvent.click(within(panel).getByRole("button", { name: "Sí, fue útil" }));
    await waitFor(() => expect(ratings).toHaveLength(1));
    expect(ratings[0]).toMatchObject({ targetType: "AI_CALL", targetId: "call-real", surface: "SIMULATOR_ASSIST" });
  });

  it("rates an answer with the SIM_ASSIST target and the SIMULATOR_ASSIST surface", async() => {
    const ratings: unknown[] = [];

    server.use(
      http.post(ASSIST_URL, () => sseResponse([
        deltaFrame("Revisa la PEEP."),
        doneFrame({ aiHelpEventId: "help-9", aiCallId: "call-9", source: "LLM" }),
      ])),
      http.put(apiUrl("/api/ai-ratings"), async({ request }) => {
        ratings.push(await request.json());

        return HttpResponse.json(envelope(null));
      }),
    );
    renderLauncher();

    const panel = await openPanel();

    requestAssist();
    await within(panel).findByText("¿Te fue útil?");
    // The widget loads the caller's previous rating first (thumbs disabled meanwhile).
    await waitFor(() => expect(within(panel).getByRole("button", { name: "Sí, fue útil" })).toBeEnabled());
    fireEvent.click(within(panel).getByRole("button", { name: "Sí, fue útil" }));

    await waitFor(() => expect(ratings).toEqual([{ targetType: "SIM_ASSIST", targetId: "help-9", helpful: true, surface: "SIMULATOR_ASSIST" }]));
  });

  it("disables the button with the reason when the policy forbids or cannot be verified", () => {
    const { unmount } = renderLauncher({ mode: "EXAM" });

    expect(screen.getByRole("button", { name: "Asesoría IA" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Asesoría IA" })).toHaveAccessibleDescription(ASSIST_POLICY_COPY.unverified);
    unmount();

    renderLauncher({ mode: "EXAM", policy: "DISABLED" });
    expect(screen.getByRole("button", { name: "Asesoría IA" })).toBeDisabled();
    expect(screen.getByText(ASSIST_POLICY_COPY.disabled)).toBeInTheDocument();
  });

  it("asks to accept the penalty before every request", async() => {
    let requests = 0;

    server.use(http.post(ASSIST_URL, () => {
      requests += 1;

      return sseResponse([deltaFrame(`Respuesta ${requests}.`), doneFrame({ aiHelpEventId: `help-${requests}`, aiCallId: `call-${requests}`, source: "LLM" })]);
    }));
    renderLauncher({ mode: "EXAM", policy: "ALLOWED_WITH_PENALTY" });

    const panel = await openPanel();

    requestAssist();

    const dialog = await screen.findByRole("dialog", { name: "¿Solicitar asesoría con penalización?" });

    expect(dialog).toHaveTextContent(ASSIST_POLICY_COPY.penalty);
    expect(requests).toBe(0);
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(requests).toBe(0);

    requestAssist();
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Solicitar asesoría" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await within(panel).findByText("Respuesta 1.")).toBeInTheDocument();
    expect(requests).toBe(1);

    // The penalty applies per use: the next request asks again.
    await within(panel).findByText("¿Te fue útil?");
    requestAssist();
    expect(await screen.findByRole("dialog", { name: "¿Solicitar asesoría con penalización?" })).toBeInTheDocument();
    expect(requests).toBe(1);
  });

  it("shows the standard quota message on a 429 with Retry-After", async() => {
    server.use(http.post(ASSIST_URL, () => HttpResponse.json(
      { success: false, message: "quota", data: null, code: "ai.quota_exceeded", timestamp: "", traceId: "t", pagination: null },
      { status: 429, headers: { "Retry-After": "600" } },
    )));
    renderLauncher();

    const panel = await openPanel();

    requestAssist();

    expect(await within(panel).findByText(/^Alcanzaste el límite de uso de la IA\. Podrás usarlo de nuevo a las \d{2}:\d{2}\.$/)).toBeInTheDocument();
  });

  it("shows the standard provider messages before and during the stream", async() => {
    server.use(http.post(ASSIST_URL, () => HttpResponse.json(
      { success: false, message: "down", data: null, code: "ai.providers_unavailable", timestamp: "", traceId: "t", pagination: null },
      { status: 503 },
    )));
    renderLauncher();

    const panel = await openPanel();

    requestAssist();
    expect(await within(panel).findByText(AI_STREAM_ERROR_MESSAGES.providerUnavailable)).toBeInTheDocument();

    server.use(http.post(ASSIST_URL, () => sseResponse([deltaFrame("Parcial."), errorFrame("ai-tutor.stream_failed", "boom")])));
    requestAssist();
    expect(await within(panel).findByText(AI_STREAM_ERROR_MESSAGES.failed)).toBeInTheDocument();
  });

  it("gives the question back when the request fails before the stream starts", async() => {
    server.use(http.post(ASSIST_URL, () => HttpResponse.json(
      { success: false, message: "down", data: null, code: "ai.providers_unavailable", timestamp: "", traceId: "t", pagination: null },
      { status: 503 },
    )));
    renderLauncher();

    const panel = await openPanel();
    const field = within(panel).getByLabelText("Pregunta (opcional)");

    fireEvent.change(field, { target: { value: "¿Subo la PEEP?" } });
    requestAssist();

    expect(await within(panel).findByText(AI_STREAM_ERROR_MESSAGES.providerUnavailable)).toBeInTheDocument();
    await waitFor(() => expect(field).toHaveValue("¿Subo la PEEP?"));
  });

  it("lists the answers the host keeps (they survive a console resync)", async() => {
    const onAnswered = vi.fn();

    renderWithSwr(
      <AssistLauncher
        sessionId="s1"
        mode="FREE"
        active
        history={[{ id: "help-9", aiHelpEventId: "help-9", aiCallId: "call-9", source: "LLM", question: "", answer: "Respuesta guardada." }]}
        onAnswered={onAnswered}
      />,
    );

    const panel = await openPanel();

    await waitFor(() => expect(within(panel).getByRole("list", { name: "Asesorías de esta sesión" })).toHaveTextContent("Respuesta guardada."), { timeout: 10_000 });
  });

  it("closes the panel when the session stops being active", async() => {
    const { setActive } = renderLauncher();

    await openPanel();
    setActive(false);

    await waitFor(() => expect(screen.queryByRole("complementary", { name: "Asesoría IA" })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Asesoría IA" })).toBeDisabled();
  });
});

describe("AI assist panel on the current state (fix sim-assist-current-state)", () => {
  it("sends the console context after the bounded flush and shows the state the server analyzed", async() => {
    const bodies: unknown[] = [];
    const helpContext = vi.fn(async() => await Promise.resolve({ simTimeMs: 76_200, unsentChanges: false, clientSnapshot: { spo2Percent: 72.2, status: "CRITICAL" } }));

    server.use(http.post(ASSIST_URL, async({ request }) => {
      bodies.push(await request.json());

      return sseResponse([
        deltaFrame("Prioriza la oxigenación."),
        doneFrame({ aiHelpEventId: "help-9", aiCallId: "call-9", source: "LLM", analysis: { simTimeMs: 76_200, severity: 0.48, patientStatus: "CRITICAL" } }),
      ]);
    }));
    renderWithSwr(<AssistLauncher sessionId="s1" mode="FREE" active helpContext={helpContext} />);

    const panel = await openPanel();

    requestAssist();

    expect(await within(panel).findByText("Analizado en t = 01:16 · gravedad 48 %")).toBeInTheDocument();
    expect(helpContext).toHaveBeenCalledTimes(1);
    expect(bodies).toEqual([{ language: "es", simTimeMs: 76_200, clientSnapshot: { spo2Percent: 72.2, status: "CRITICAL" } }]);
  });

  it("says the AI could not analyze the current state when the server sent the deterministic suggestion instead", async() => {
    server.use(http.post(ASSIST_URL, () => sseResponse([
      deltaFrame("Sube la PEEP y revisa la FiO2."),
      doneFrame({ aiHelpEventId: "help-10", aiCallId: "call-10", source: "DETERMINISTIC", notice: "INCONSISTENT_STATE", analysis: { simTimeMs: 1000, severity: 0.7, patientStatus: "CRITICAL" } }),
    ])));
    renderLauncher();

    const panel = await openPanel();

    requestAssist();

    expect(await within(panel).findByText("La IA no pudo analizar el estado actual")).toBeInTheDocument();
    expect(within(panel).queryByText("¿Te fue útil?")).not.toBeInTheDocument();
  });
});
