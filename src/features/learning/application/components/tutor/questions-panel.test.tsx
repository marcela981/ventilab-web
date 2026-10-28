/*
* Funcionalidad: QuestionsPanel tests
* Descripción: Integration tests of the "Preguntas" panel against msw (real text/event-stream bodies for the streamed answers): it reopens the caller's LESSON conversation (client-side refId lookup, also on a later page of the listing) and shows its history with the incomplete note and the rating widget, sending a message streams the answer progressively and then shows the saved conversation, the first message starts a conversation with scope/refId/currentPageId, switching to MODULE looks up and starts with the moduleId, "Detener" stops the answer, an error before the stream gives the question back, and unmounting aborts the running stream. v1.2 (S2 ai-chat): Enter keeps inserting a new line (no submit) and no character counter is shown, as before the shared Composer. RichContent is replaced by plain text. Depends on vitest, Testing Library, msw and the learning/SSE test helpers. v1.1 (L6 fix): a network failure before the stream (status 0) also gives the question back. v1.3 (W7, Bloque 2): an answer saved incomplete with text is rateable; ratings send surface POPUP and the conversation scope; "Abrir en el asistente" is disabled until the conversation id is known and pushes /assistant/[id]; a stopped first message adopts the conversation announced by the start frame; "Reintentar" re-sends a failed message; a TutorAI suggestion prefills the message.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_ERROR_MESSAGES } from "../../entities/ai-error-messages";
import { controlledStream, deltaFrame, doneFrame, errorFrame, sseResponse, startFrame } from "../../hooks/sse-test-helpers";
import type { ControlledStream } from "../../hooks/sse-test-helpers";
import { TutorPromptContext } from "../../hooks/use-tutor-prompt";
import { routerStore } from "../../learning-router-test-helpers";
import { apiUrl, envelope, errorResponse, renderWithSession } from "../../pages/learning-test-helpers";
import { createTutorPromptStore } from "../../session/tutor-prompt-store";
import { QuestionsPanel } from "./questions-panel";

vi.mock("next/router", async() => (await import("../../learning-router-test-helpers")).nextRouterMock);

vi.mock("@shared/rich-content/rich-content", () => ({
  RichContent: ({ content }: { content: unknown }) => <div>{typeof content === "string" ? content : ""}</div>,
}));

type MessageFixture = { id: string, role: "USER" | "ASSISTANT", content: string, isIncomplete?: boolean, aiCallId?: string | null };

const conversationDto = (id: string, scope: string, refId: string) => ({
  id,
  scope,
  refId,
  title: `Conversación ${id}`,
  createdAt: "2026-10-14T00:00:00.000Z",
  updatedAt: "2026-10-14T00:00:00.000Z",
});

const messageDto = ({ id, role, content, isIncomplete = false, aiCallId = role === "ASSISTANT" ? `call-${id}` : null }: MessageFixture) => ({
  id,
  role,
  content,
  isIncomplete,
  aiCallId,
  createdAt: "2026-10-14T00:00:00.000Z",
});

const pagination = (page: number, pages: number) => ({ page, pages, limit: 100, total: pages * 100, next: null, previous: null });

const server = setupServer();
// Listing per scope and page; conversation messages by id.
let listings: Record<string, { items: ReturnType<typeof conversationDto>[], pages: number }[]> = {};
let details: Record<string, MessageFixture[]> = {};
let listQueries: string[] = [];
let streamRequests: { path: string, body: unknown }[] = [];
let ratings: unknown[] = [];
let stream: ControlledStream;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  listQueries = [];
  streamRequests = [];
  ratings = [];
  routerStore.reset();
  stream = controlledStream();
  listings = {
    LESSON: [{ items: [conversationDto("c-other", "LESSON", "l9"), conversationDto("c-l1", "LESSON", "l1")], pages: 1 }],
    MODULE: [{ items: [conversationDto("c-m9", "MODULE", "m9")], pages: 1 }],
  };
  details = {
    "c-l1": [
      { id: "u1", role: "USER", content: "¿Qué es la PEEP?" },
      { id: "a1", role: "ASSISTANT", content: "La PEEP es la presión al final de la espiración." },
      { id: "u2", role: "USER", content: "¿Y la meseta?" },
      { id: "a2", role: "ASSISTANT", content: "La presión meseta se mide", isIncomplete: true, aiCallId: null },
    ],
  };
  server.use(
    http.get(apiUrl("/api/tutor/conversations"), ({ request }) => {
      const url = new URL(request.url);
      const scope = url.searchParams.get("scope") ?? "";
      const page = Number(url.searchParams.get("page") ?? "1");
      const listing = listings[scope]?.[page - 1] ?? { items: [], pages: 1 };

      listQueries.push(url.search);

      return HttpResponse.json({ ...envelope(listing.items), pagination: pagination(page, listing.pages) });
    }),
    http.get(apiUrl("/api/tutor/conversations/:conversationId"), ({ params }) => {
      const id = String(params.conversationId);
      const messages = details[id];

      return messages
        ? HttpResponse.json(envelope({ ...conversationDto(id, "LESSON", "l1"), messages: messages.map(messageDto) }))
        : errorResponse("ai-tutor.conversation_not_found", 404);
    }),
    http.get(apiUrl("/api/ai-ratings/mine"), () => HttpResponse.json(envelope(null))),
    http.put(apiUrl("/api/ai-ratings"), async({ request }) => {
      ratings.push(await request.json());

      return HttpResponse.json(envelope(null));
    }),
    http.post(apiUrl("/api/tutor/conversations"), async({ request }) => {
      streamRequests.push({ path: "/api/tutor/conversations", body: await request.json() });

      return stream.response();
    }),
    http.post(apiUrl("/api/tutor/conversations/:conversationId/messages"), async({ request, params }) => {
      streamRequests.push({ path: `/api/tutor/conversations/${String(params.conversationId)}/messages`, body: await request.json() });

      return stream.response();
    }),
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

function renderPanel() {
  return renderWithSession(<QuestionsPanel moduleId="m1" lessonId="l1" currentPageId="p1" />);
}

function send(text: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Tu pregunta" }), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
}

describe("QuestionsPanel", () => {
  it("reopens the lesson conversation and shows its history", async() => {
    renderPanel();

    expect(await screen.findByText("La PEEP es la presión al final de la espiración.")).toBeInTheDocument();
    expect(screen.getByText("¿Qué es la PEEP?")).toBeInTheDocument();
    expect(screen.getByText("Respuesta incompleta: se interrumpió antes de terminar.")).toBeInTheDocument();
    // The complete answer and the incomplete one with text (a stopped answer) are rateable.
    expect(await screen.findAllByRole("heading", { name: "¿Te fue útil?" })).toHaveLength(2);
    expect(listQueries[0]).toContain("scope=LESSON");
    expect(screen.getByRole("button", { name: "Esta lección" })).toHaveAttribute("aria-pressed", "true");
  });

  it("finds the conversation on a later page of the listing", async() => {
    listings.LESSON = [
      { items: [conversationDto("c-other", "LESSON", "l9")], pages: 2 },
      { items: [conversationDto("c-l1", "LESSON", "l1")], pages: 2 },
    ];
    renderPanel();

    expect(await screen.findByText("¿Qué es la PEEP?")).toBeInTheDocument();
    expect(listQueries.some((query) => query.includes("page=2"))).toBe(true);
  });

  it("streams the answer to a new message and then shows the saved conversation", async() => {
    renderPanel();
    await screen.findByText("¿Qué es la PEEP?");

    send("¿Cuándo sube la PEEP?");
    expect(await screen.findByText("¿Cuándo sube la PEEP?")).toBeInTheDocument();
    stream.push(deltaFrame("Cuando la "));
    expect(await screen.findByText("Cuando la")).toBeInTheDocument();
    stream.push(deltaFrame("oxigenación cae."));
    expect(await screen.findByText("Cuando la oxigenación cae.")).toBeInTheDocument();

    details["c-l1"] = [
      ...(details["c-l1"] ?? []),
      { id: "u3", role: "USER", content: "¿Cuándo sube la PEEP?" },
      { id: "a3", role: "ASSISTANT", content: "Cuando la oxigenación cae." },
    ];
    stream.push(doneFrame({ aiCallId: "call-a3", messageId: "a3", conversationId: "c-l1" }));

    await waitFor(() => expect(screen.getAllByRole("heading", { name: "¿Te fue útil?" })).toHaveLength(2));
    expect(screen.getAllByText("¿Cuándo sube la PEEP?")).toHaveLength(1);
    expect(streamRequests).toEqual([{ path: "/api/tutor/conversations/c-l1/messages", body: { message: "¿Cuándo sube la PEEP?", currentPageId: "p1" } }]);
  });

  it("starts a new conversation with the first message", async() => {
    listings.LESSON = [{ items: [], pages: 1 }];
    renderPanel();

    expect(await screen.findByText("Pregunta al tutor de IA lo que quieras sobre esta lección.")).toBeInTheDocument();
    send("Primera pregunta");
    stream.push(deltaFrame("Primera respuesta"));
    details["c-new"] = [
      { id: "u1", role: "USER", content: "Primera pregunta" },
      { id: "a1", role: "ASSISTANT", content: "Primera respuesta" },
    ];
    stream.push(doneFrame({ aiCallId: "call-a1", messageId: "a1", conversationId: "c-new" }));

    expect(await screen.findByRole("heading", { name: "¿Te fue útil?" })).toBeInTheDocument();
    expect(screen.getAllByText("Primera pregunta")).toHaveLength(1);
    expect(streamRequests).toEqual([{
      path: "/api/tutor/conversations",
      body: { scope: "LESSON", refId: "l1", message: "Primera pregunta", currentPageId: "p1" },
    }]);
  });

  it("switches to the module scope and uses the moduleId", async() => {
    renderPanel();
    await screen.findByText("¿Qué es la PEEP?");

    fireEvent.click(screen.getByRole("button", { name: "Este módulo" }));

    expect(await screen.findByText("Pregunta al tutor de IA lo que quieras sobre este módulo.")).toBeInTheDocument();
    expect(listQueries.at(-1)).toContain("scope=MODULE");
    send("Pregunta del módulo");

    await waitFor(() => expect(streamRequests).toHaveLength(1));
    expect(streamRequests[0]?.body).toEqual({ scope: "MODULE", refId: "m1", message: "Pregunta del módulo", currentPageId: "p1" });
  });

  it("stops the answer with Detener and reloads the saved conversation", async() => {
    renderPanel();
    await screen.findByText("¿Qué es la PEEP?");

    send("Explica la compliance");
    stream.push(deltaFrame("La compliance"));
    expect(await screen.findByText("La compliance")).toBeInTheDocument();

    details["c-l1"] = [
      ...(details["c-l1"] ?? []),
      { id: "u3", role: "USER", content: "Explica la compliance" },
      { id: "a3", role: "ASSISTANT", content: "La compliance", isIncomplete: true },
    ];
    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    stream.push(deltaFrame(" es la distensibilidad."));
    stream.push(doneFrame({ aiCallId: "call-a3", messageId: "a3", conversationId: "c-l1" }));

    await waitFor(() => expect(screen.getAllByText("Respuesta incompleta: se interrumpió antes de terminar.")).toHaveLength(2));
    expect(screen.queryByText(/distensibilidad/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Detener" })).not.toBeInTheDocument();
  });

  it("rates an answer with surface POPUP and the conversation scope", async() => {
    renderPanel();
    await screen.findByText("La PEEP es la presión al final de la espiración.");

    fireEvent.click((await screen.findAllByRole("button", { name: "Sí, fue útil" }))[0]!);

    await waitFor(() => expect(ratings).toEqual([{ targetType: "MESSAGE", targetId: "a1", helpful: true, surface: "POPUP", scope: "LESSON" }]));
  });

  it("opens the conversation in the assistant once its id is known", async() => {
    renderPanel();
    const open = screen.getByRole("button", { name: "Abrir en el asistente" });

    expect(open).toBeDisabled();
    await screen.findByText("¿Qué es la PEEP?");
    await waitFor(() => expect(open).toBeEnabled());

    fireEvent.click(open);
    expect(routerStore.push).toHaveBeenCalledWith("/assistant/c-l1");
  });

  it("adopts the conversation announced by a stopped first message", async() => {
    listings.LESSON = [{ items: [], pages: 1 }];
    renderPanel();
    await screen.findByText("Pregunta al tutor de IA lo que quieras sobre esta lección.");
    expect(screen.getByRole("button", { name: "Abrir en el asistente" })).toBeDisabled();

    send("Primera pregunta");
    stream.push(startFrame({ conversationId: "c-new", messageId: "a1" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Abrir en el asistente" })).toBeEnabled());
    stream.push(deltaFrame("Parte"));
    expect(await screen.findByText("Parte")).toBeInTheDocument();

    details["c-new"] = [
      { id: "u1", role: "USER", content: "Primera pregunta" },
      { id: "a1", role: "ASSISTANT", content: "Parte", isIncomplete: true, aiCallId: null },
    ];
    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    stream.close();

    expect(await screen.findByText("Respuesta incompleta: se interrumpió antes de terminar.")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "No fue útil" }));
    await waitFor(() => expect(ratings).toEqual([{ targetType: "MESSAGE", targetId: "a1", helpful: false, surface: "POPUP", scope: "LESSON" }]));

    fireEvent.click(screen.getByRole("button", { name: "Abrir en el asistente" }));
    expect(routerStore.push).toHaveBeenCalledWith("/assistant/c-new");
  });

  it("re-sends a message that failed mid-stream with Reintentar", async() => {
    const responses = [
      () => sseResponse([startFrame({ conversationId: "c-l1", messageId: "a3" }), deltaFrame("Parcial"), errorFrame("ai.stream_interrupted", "cortado")]),
      () => sseResponse([startFrame({ conversationId: "c-l1", messageId: "a4" }), deltaFrame("Completa"), doneFrame({ aiCallId: "call-a4", messageId: "a4", conversationId: "c-l1" })]),
    ];

    server.use(http.post(apiUrl("/api/tutor/conversations/:conversationId/messages"), async({ request }) => {
      streamRequests.push({ path: "messages", body: await request.json() });

      return (responses.shift() ?? responses[0])!();
    }));
    renderPanel();
    await screen.findByText("¿Qué es la PEEP?");

    send("Explica la PEEP");
    expect(await screen.findByText(AI_ERROR_MESSAGES.interrupted)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(streamRequests).toHaveLength(2));
    expect(streamRequests[1]?.body).toEqual({ message: "Explica la PEEP", currentPageId: "p1" });
    await waitFor(() => expect(screen.queryByText(AI_ERROR_MESSAGES.interrupted)).not.toBeInTheDocument());
  });

  it("fills the message with a TutorAI suggestion prompt without sending it", async() => {
    const store = createTutorPromptStore();

    store.request("questions", "Resume los puntos clave de la lección");
    renderWithSession(
      <TutorPromptContext.Provider value={store}>
        <QuestionsPanel moduleId="m1" lessonId="l1" currentPageId="p1" />
      </TutorPromptContext.Provider>,
    );

    expect(screen.getByRole("textbox", { name: "Tu pregunta" })).toHaveValue("Resume los puntos clave de la lección");
    await waitFor(() => expect(store.getSnapshot()).toBeNull());
    expect(streamRequests).toEqual([]);
  });

  it("keeps Enter as a new line and shows no character counter, as before the shared composer", async() => {
    renderPanel();
    await screen.findByText("¿Qué es la PEEP?");

    const field = screen.getByRole("textbox", { name: "Tu pregunta" });

    fireEvent.change(field, { target: { value: "a".repeat(3990) } });
    // fireEvent returns false only when the default action (the new line) was prevented.
    expect(fireEvent.keyDown(field, { key: "Enter" })).toBe(true);
    expect(screen.queryByText(/\/ 4000/)).not.toBeInTheDocument();
    expect(field).toHaveAttribute("maxLength", "4000");

    // Give a submit the time to reach the server; nothing may be sent.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(streamRequests).toEqual([]);
    expect(field).toHaveValue("a".repeat(3990));
  });

  it("gives the question back when the tutor is unavailable before the stream", async() => {
    server.use(http.post(apiUrl("/api/tutor/conversations/:conversationId/messages"), () => errorResponse("ai.providers_unavailable", 503)));
    renderPanel();
    await screen.findByText("¿Qué es la PEEP?");

    send("¿Sigue disponible?");

    expect(await screen.findByText(AI_ERROR_MESSAGES.providerUnavailable)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Tu pregunta" })).toHaveValue("¿Sigue disponible?");
  });

  it("gives the question back when the network fails before the stream", async() => {
    server.use(http.post(apiUrl("/api/tutor/conversations/:conversationId/messages"), () => HttpResponse.error()));
    renderPanel();
    await screen.findByText("¿Qué es la PEEP?");

    send("¿Hay conexión?");

    await waitFor(() => expect(screen.getByRole("textbox", { name: "Tu pregunta" })).toHaveValue("¿Hay conexión?"));
    expect(screen.getAllByText("¿Qué es la PEEP?")).toHaveLength(1);
    expect(screen.queryByText("¿Hay conexión?", { selector: "p" })).not.toBeInTheDocument();
  });

  it("aborts the running answer when the panel unmounts", async() => {
    const abort = vi.spyOn(AbortController.prototype, "abort");
    const view = renderPanel();

    await screen.findByText("¿Qué es la PEEP?");
    send("Pregunta larga");
    stream.push(deltaFrame("Respuesta en curso"));
    expect(await screen.findByText("Respuesta en curso")).toBeInTheDocument();

    const callsBefore = abort.mock.calls.length;

    view.unmount();

    expect(abort.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("shows a finished answer streamed in one go", async() => {
    server.use(http.post(apiUrl("/api/tutor/conversations/:conversationId/messages"), () => sseResponse([
      deltaFrame("Todo junto"),
      doneFrame({ aiCallId: "call-a3", messageId: "a3", conversationId: "c-l1" }),
    ])));
    details["c-l1"] = [{ id: "u1", role: "USER", content: "¿Qué es la PEEP?" }];
    renderPanel();
    await screen.findByText("¿Qué es la PEEP?");

    details["c-l1"] = [...(details["c-l1"] ?? []), { id: "u2", role: "USER", content: "Rápido" }, { id: "a2", role: "ASSISTANT", content: "Todo junto" }];
    send("Rápido");

    expect(await screen.findByText("Todo junto")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "¿Te fue útil?" })).toBeInTheDocument();
  });
});
