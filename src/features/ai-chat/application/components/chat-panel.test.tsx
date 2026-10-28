/*
* Funcionalidad: ChatPanel tests
* Descripción: Behaviour of the AI assistant conversation view against msw with real SSE bodies: a new chat shows the scope text and suggested questions and a suggestion sends it (POST /api/tutor/conversations {scope: FREE}), streams the answer, reports the created conversation once and shows "¿Te fue útil?" for the complete answer; "Detener" leaves "Respuesta interrumpida" and "Reintentar" resends the same message; the fixed off-topic reply renders as an informational note (no alert); a 429 quota error shows the local reset time without a retry; "Copiar" writes the answer to the clipboard and confirms "Copiado"; scrolling up shows "Ir al final", which scrolls back to the end; a detail load failure shows "Reintentar", blocks sending and reloads. Depends on Testing Library, msw, the shared SSE test helpers and the AI chat test helpers. v1.1 (W7, Bloque 2): ratings send surface ASSISTANT without scope, also for a LESSON conversation, and an answer stopped after the start frame is rateable.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { controlledStream, deltaFrame, doneFrame, sseResponse, startFrame } from "@shared/ai-conversation/application/sse-test-helpers";
import { OFF_TOPIC_REPLY, SUGGESTED_QUESTIONS } from "../config/ai-chat.config";
import { apiUrl, conversationDto, envelope, errorResponse, messageDto, SwrWrapper } from "../hooks/ai-chat-test-helpers";
import type { AiConversationMessageDTO } from "../../api/dtos/ai-chat.dto";
import { ChatPanel } from "./chat-panel";

vi.mock("@shared/rich-content/rich-content", () => ({
  RichContent: ({ content }: { content: unknown }) => <div>{typeof content === "string" ? content : ""}</div>,
}));

const LIST_URL = apiUrl("/api/tutor/conversations");
const DETAIL_URL = apiUrl("/api/tutor/conversations/:conversationId");
const MESSAGES_URL = apiUrl("/api/tutor/conversations/:conversationId/messages");
const PAGINATION = { page: 1, pages: 1, limit: 20, total: 0 };
const server = setupServer();
let details: Record<string, AiConversationMessageDTO[]> = {};
let ratings: unknown[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  details = { c1: [] };
  ratings = [];
  server.use(
    http.put(apiUrl("/api/ai-ratings"), async({ request }) => {
      ratings.push(await request.json());

      return HttpResponse.json(envelope(null));
    }),
    http.get(LIST_URL, () => HttpResponse.json(envelope([], PAGINATION))),
    http.get(DETAIL_URL, ({ params }) => {
      const id = String(params.conversationId);
      const messages = details[id];

      return messages
        ? HttpResponse.json(envelope({ ...conversationDto(id), messages }))
        : errorResponse("ai-tutor.conversation_not_found", 404);
    }),
    http.get(apiUrl("/api/ai-ratings/mine"), () => HttpResponse.json(envelope(null))),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

function renderPanel(props: Parameters<typeof ChatPanel>[0] = {}) {
  return render(<SwrWrapper><ChatPanel {...props} /></SwrWrapper>);
}

function type(text: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Escribe tu pregunta" }), { target: { value: text } });
}

describe("ChatPanel", () => {
  it("sends a suggested question from the empty state, streams the answer and offers the rating", async() => {
    const bodies: unknown[] = [];
    const onConversationCreated = vi.fn();
    const question = SUGGESTED_QUESTIONS[0] ?? "";

    details["c-new"] = [];
    server.use(http.post(LIST_URL, async({ request }) => {
      bodies.push(await request.json());

      return sseResponse([
        deltaFrame("La ventilación por volumen fija el volumen tidal."),
        doneFrame({ aiCallId: "call-1", messageId: "m-1", conversationId: "c-new" }),
      ]);
    }));

    renderPanel({ onConversationCreated });

    expect(screen.getByRole("heading", { name: "Nueva conversación" })).toBeInTheDocument();
    expect(screen.getByText(/Puedo responder preguntas sobre medicina/)).toBeInTheDocument();
    expect(screen.getByText("Herramienta educativa. No usar para decisiones sobre pacientes reales.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: question }));

    // Once in the bubble and once in the live region of the streamed turn.
    expect(await screen.findAllByText("La ventilación por volumen fija el volumen tidal.")).not.toHaveLength(0);
    expect(bodies).toEqual([{ scope: "FREE", message: question }]);
    expect(await screen.findByRole("heading", { name: "¿Te fue útil?" })).toBeInTheDocument();
    await waitFor(() => expect(onConversationCreated).toHaveBeenCalledWith("c-new"));
    expect(onConversationCreated).toHaveBeenCalledTimes(1);
  });

  it("stops the answer, marks it interrupted and retries the same message", async() => {
    const stream = controlledStream();
    const bodies: unknown[] = [];

    server.use(http.post(MESSAGES_URL, async({ request }) => {
      bodies.push(await request.json());

      return bodies.length === 1
        ? stream.response()
        : sseResponse([deltaFrame("Respuesta completa."), doneFrame({ aiCallId: "call-2", messageId: "m-2", conversationId: "c1" })]);
    }));

    renderPanel({ conversationId: "c1" });

    await waitFor(() => expect(screen.queryByText("Cargando la conversación…")).not.toBeInTheDocument());
    type("¿Qué es la PEEP?");
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Escribe tu pregunta" }), { key: "Enter" });
    stream.push(deltaFrame("La PEEP es"));
    expect(await screen.findByText("La PEEP es")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    stream.close();

    expect(await screen.findByText("Respuesta interrumpida")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findAllByText("Respuesta completa.")).not.toHaveLength(0);
    expect(bodies).toEqual([{ message: "¿Qué es la PEEP?" }, { message: "¿Qué es la PEEP?" }]);
  });

  it("rates answers with surface ASSISTANT and no scope, also in a lesson conversation and after a stop", async() => {
    const stream = controlledStream();

    details["c-lesson"] = [
      messageDto("u1", "USER", "¿Qué es la PEEP?"),
      messageDto("a1", "ASSISTANT", "La PEEP mantiene los alvéolos abiertos.", { aiCallId: "call-a1" }),
    ];
    server.use(
      http.get(DETAIL_URL, ({ params }) => HttpResponse.json(envelope({
        ...conversationDto(String(params.conversationId), { scope: "LESSON", refId: "l1" }),
        messages: details[String(params.conversationId)] ?? [],
      }))),
      http.post(MESSAGES_URL, () => stream.response()),
    );

    renderPanel({ conversationId: "c-lesson" });

    fireEvent.click(await screen.findByRole("button", { name: "Sí, fue útil" }));
    await waitFor(() => expect(ratings).toEqual([{ targetType: "MESSAGE", targetId: "a1", helpful: true, surface: "ASSISTANT" }]));

    type("¿Y la meseta?");
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Escribe tu pregunta" }), { key: "Enter" });
    stream.push(startFrame({ conversationId: "c-lesson", messageId: "a2" }));
    stream.push(deltaFrame("La meseta"));
    expect(await screen.findAllByText("La meseta")).not.toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    stream.close();

    expect(await screen.findByText("Respuesta interrumpida")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole("button", { name: "No fue útil" })).toHaveLength(2));
    fireEvent.click(screen.getAllByRole("button", { name: "No fue útil" })[1]!);
    await waitFor(() => expect(ratings).toContainEqual({ targetType: "MESSAGE", targetId: "a2", helpful: false, surface: "ASSISTANT" }));
  });

  it("renders the off-topic reply as an informational note, not an error", async() => {
    server.use(http.post(MESSAGES_URL, () => sseResponse([
      deltaFrame(OFF_TOPIC_REPLY),
      doneFrame({ aiCallId: "call-3", messageId: "m-3", conversationId: "c1" }),
    ])));

    renderPanel({ conversationId: "c1" });

    await waitFor(() => expect(screen.queryByText("Cargando la conversación…")).not.toBeInTheDocument());
    type("¿Quién ganó el partido?");
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    const note = await screen.findByRole("note", { name: "Fuera del alcance del asistente" });

    expect(note).toHaveTextContent(OFF_TOPIC_REPLY);
    expect(note).toHaveTextContent(/medicina y del sistema respiratorio/);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the daily quota with its reset time and no retry", async() => {
    server.use(http.post(MESSAGES_URL, () => errorResponse("ai.quota_exceeded", 429, { "Retry-After": "3600" })));

    renderPanel({ conversationId: "c1" });

    await waitFor(() => expect(screen.queryByText("Cargando la conversación…")).not.toBeInTheDocument());
    type("Pregunta");
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(/Alcanzaste el límite de uso de la IA\. Podrás usarlo de nuevo a las \d{2}:\d{2}/);
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  it("copies a complete answer to the clipboard", async() => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    details.c1 = [messageDto("u1", "USER", "Hola"), messageDto("a1", "ASSISTANT", "Respuesta guardada.")];

    renderPanel({ conversationId: "c1" });

    fireEvent.click(await screen.findByRole("button", { name: "Copiar" }));

    expect(await screen.findByRole("button", { name: "Copiado" })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith("Respuesta guardada.");
  });

  it("offers \"Ir al final\" after scrolling up and scrolls back to the end", async() => {
    details.c1 = [messageDto("u1", "USER", "Hola"), messageDto("a1", "ASSISTANT", "Respuesta guardada.")];

    renderPanel({ conversationId: "c1" });

    await screen.findByText("Respuesta guardada.");

    const region = screen.getByRole("region", { name: "Mensajes de la conversación" });

    Object.defineProperty(region, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(region, "clientHeight", { value: 200, configurable: true });
    expect(screen.queryByRole("button", { name: "Ir al final" })).not.toBeInTheDocument();

    region.scrollTop = 100;
    fireEvent.scroll(region);
    fireEvent.click(await screen.findByRole("button", { name: "Ir al final" }));

    expect(region.scrollTop).toBe(1000);
    expect(screen.queryByRole("button", { name: "Ir al final" })).not.toBeInTheDocument();
  });

  it("shows a detail load failure with Reintentar, blocks sending and reloads", async() => {
    let fail = true;

    server.use(http.get(DETAIL_URL, ({ params }) => (fail
      ? errorResponse("internal_error", 500)
      : HttpResponse.json(envelope({ ...conversationDto(String(params.conversationId)), messages: [messageDto("u1", "USER", "Mensaje guardado")] })))));

    renderPanel({ conversationId: "c1" });

    expect(await screen.findByText("No se pudo cargar la conversación")).toBeInTheDocument();
    expect(screen.getByText(/No puedes enviar mensajes hasta que la conversación cargue/)).toBeInTheDocument();
    type("Pregunta");
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();

    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Mensaje guardado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeEnabled();
  });
});
