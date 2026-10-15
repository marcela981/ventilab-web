/*
* Funcionalidad: DeepenPanel tests
* Descripción: Integration tests of the "Profundizar" panel against msw serving real text/event-stream bodies of POST /api/tutor/pages/{pageId}/deepen: deltas render progressively and the rating widget appears on `done`, "Detener" stops the answer (no further text, stopped note, no rating), a follow-up question reuses the returned conversationId, changing page resets the thread, and the 429 quota (local reset time), 503 provider and 404 unpublished page errors show their messages. v1.1 (L5 fix): the conversationId of a finished answer survives a later failed answer; a first answer stopped before `done` has no conversationId to reuse (the backend only sends it in `done`). RichContent is replaced by plain text (its lazy markdown renderer is covered in shared/rich-content). v1.2 (S2 ai-chat): the current answer is also rendered in the visually hidden live region of the shared StreamingMessage, so text queries of the visible answer skip that region and the stopped answer is checked to be announced. v1.3 (S2 review R3): a rating given to an answer stays selected after a follow-up question. Depends on vitest, Testing Library, msw and the learning/SSE test helpers.
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
import { controlledStream, deltaFrame, doneFrame, errorFrame, sseResponse } from "../../hooks/sse-test-helpers";
import type { ControlledStream } from "../../hooks/sse-test-helpers";
import { apiUrl, envelope, errorResponse, renderWithSession, SessionWrapper } from "../../pages/learning-test-helpers";
import { DeepenPanel } from "./deepen-panel";

vi.mock("@shared/rich-content/rich-content", () => ({
  RichContent: ({ content }: { content: unknown }) => <div>{typeof content === "string" ? content : ""}</div>,
}));

const DEEPEN_PATH = "/api/tutor/pages/:pageId/deepen";
const DONE = { aiCallId: "call-1", messageId: "msg-1", conversationId: "conv-1" };
const server = setupServer();
let requests: { pageId: string, body: unknown }[] = [];
let stream: ControlledStream;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  requests = [];
  stream = controlledStream();
  server.use(http.post(apiUrl(DEEPEN_PATH), async({ request, params }) => {
    requests.push({ pageId: String(params.pageId), body: await request.json() });

    return stream.response();
  }));
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// A finished (or stopped) current answer is also in the visually hidden live region that announces it;
// text queries of the visible bubble skip that region.
const VISIBLE = { ignore: "script, style, [aria-live] *" } as const;
const liveRegion = () => document.querySelector("[aria-live=\"polite\"]");

const deepenButton = () => screen.getByRole("button", { name: "¿Deseas profundizar en el tema?" });

function ask(question: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Tu pregunta (opcional)" }), { target: { value: question } });
  fireEvent.click(deepenButton());
}

describe("DeepenPanel", () => {
  it("streams the answer progressively and offers the rating widget when it is done", async() => {
    renderWithSession(<DeepenPanel pageId="p1" />);

    ask("¿Cuándo subir la PEEP?");
    expect(await screen.findByText("Pensando…")).toBeInTheDocument();
    expect(screen.getByText("¿Cuándo subir la PEEP?")).toBeInTheDocument();

    stream.push(deltaFrame("Sube la PEEP "));
    expect(await screen.findByText("Sube la PEEP")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "¿Te fue útil?" })).not.toBeInTheDocument();

    stream.push(deltaFrame("si la oxigenación es baja."));
    expect(await screen.findByText("Sube la PEEP si la oxigenación es baja.")).toBeInTheDocument();

    stream.push(doneFrame(DONE));
    expect(await screen.findByRole("heading", { name: "¿Te fue útil?" })).toBeInTheDocument();
    expect(requests).toEqual([{ pageId: "p1", body: { question: "¿Cuándo subir la PEEP?" } }]);
    expect(deepenButton()).toBeEnabled();
  });

  it("deepens the whole page when no question is written", async() => {
    renderWithSession(<DeepenPanel pageId="p1" />);

    fireEvent.click(deepenButton());
    expect(await screen.findByText("Profundizar en esta página")).toBeInTheDocument();
    await waitFor(() => expect(requests).toEqual([{ pageId: "p1", body: {} }]));
  });

  it("stops the answer with Detener and ignores later text", async() => {
    renderWithSession(<DeepenPanel pageId="p1" />);

    ask("Explica la distensibilidad");
    stream.push(deltaFrame("La distensibilidad"));
    expect(await screen.findByText("La distensibilidad")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    expect(await screen.findByText("Respuesta detenida. Solo se muestra la parte recibida.")).toBeInTheDocument();
    stream.push(deltaFrame(" es la relación volumen/presión."));
    stream.push(doneFrame(DONE));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Detener" })).not.toBeInTheDocument());
    expect(screen.getByText("La distensibilidad", VISIBLE)).toBeInTheDocument();
    expect(liveRegion()).toHaveTextContent("La distensibilidad");
    expect(screen.queryByText(/volumen\/presión/)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "¿Te fue útil?" })).not.toBeInTheDocument();
  });

  it("sends a follow-up question in the same conversation and keeps the thread", async() => {
    renderWithSession(<DeepenPanel pageId="p1" />);

    ask("Primera");
    stream.push(deltaFrame("Respuesta uno"));
    stream.push(doneFrame(DONE));
    expect(await screen.findByRole("heading", { name: "¿Te fue útil?" })).toBeInTheDocument();

    server.use(http.post(apiUrl(DEEPEN_PATH), async({ request, params }) => {
      requests.push({ pageId: String(params.pageId), body: await request.json() });

      return sseResponse([deltaFrame("Respuesta dos"), doneFrame({ ...DONE, messageId: "msg-2" })]);
    }));
    ask("Segunda");

    expect(await screen.findByText("Respuesta dos", VISIBLE)).toBeInTheDocument();
    expect(screen.getByText("Respuesta uno")).toBeInTheDocument();
    expect(requests[1]).toEqual({ pageId: "p1", body: { question: "Segunda", conversationId: "conv-1" } });
    await waitFor(() => expect(screen.getAllByRole("heading", { name: "¿Te fue útil?" })).toHaveLength(2));
  });

  it("keeps the rating of an earlier answer after a follow-up question", async() => {
    const ratings: unknown[] = [];

    server.use(http.put(apiUrl("/api/ai-ratings"), async({ request }) => {
      ratings.push(await request.json());

      return HttpResponse.json(envelope(null));
    }));
    renderWithSession(<DeepenPanel pageId="p1" />);

    ask("Primera");
    stream.push(deltaFrame("Respuesta uno"));
    stream.push(doneFrame(DONE));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, fue útil" }));
    await waitFor(() => expect(ratings).toEqual([{ targetType: "MESSAGE", targetId: "msg-1", helpful: true }]));
    await waitFor(() => expect(screen.getByRole("button", { name: "Sí, fue útil" })).toBeEnabled());

    server.use(http.post(apiUrl(DEEPEN_PATH), () => sseResponse([deltaFrame("Respuesta dos"), doneFrame({ ...DONE, messageId: "msg-2" })])));
    ask("Segunda");

    await waitFor(() => expect(screen.getAllByRole("button", { name: "Sí, fue útil" })).toHaveLength(2));
    const [first, second] = screen.getAllByRole("button", { name: "Sí, fue útil" });

    expect(first).toHaveAttribute("aria-pressed", "true");
    expect(second).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps the conversation of a finished answer after a later answer fails", async() => {
    renderWithSession(<DeepenPanel pageId="p1" />);

    ask("Primera");
    stream.push(deltaFrame("Respuesta uno"));
    stream.push(doneFrame(DONE));
    expect(await screen.findByRole("heading", { name: "¿Te fue útil?" })).toBeInTheDocument();

    server.use(http.post(apiUrl(DEEPEN_PATH), async({ request, params }) => {
      requests.push({ pageId: String(params.pageId), body: await request.json() });

      return requests.length === 2
        ? sseResponse([deltaFrame("Parcial"), errorFrame("ai.stream_interrupted", "cortado")])
        : sseResponse([deltaFrame("Respuesta tres"), doneFrame({ ...DONE, messageId: "msg-3" })]);
    }));
    ask("Segunda");
    expect(await screen.findByText(AI_ERROR_MESSAGES.interrupted)).toBeInTheDocument();
    ask("Tercera");

    expect(await screen.findByText("Respuesta tres", VISIBLE)).toBeInTheDocument();
    expect(requests[2]).toEqual({ pageId: "p1", body: { question: "Tercera", conversationId: "conv-1" } });
  });

  it("starts the next answer without a conversation when the first one was stopped before done", async() => {
    renderWithSession(<DeepenPanel pageId="p1" />);

    ask("Primera");
    stream.push(deltaFrame("Parte"));
    expect(await screen.findByText("Parte")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Detener" })).not.toBeInTheDocument());

    server.use(http.post(apiUrl(DEEPEN_PATH), async({ request, params }) => {
      requests.push({ pageId: String(params.pageId), body: await request.json() });

      return sseResponse([deltaFrame("Otra"), doneFrame(DONE)]);
    }));
    ask("Segunda");

    expect(await screen.findByText("Otra", VISIBLE)).toBeInTheDocument();
    // BACKEND GAP (documented): only `done` carries conversationId, so nothing can be adopted from a stopped answer.
    expect(requests[1]).toEqual({ pageId: "p1", body: { question: "Segunda" } });
  });

  it("starts a fresh thread when the page changes", async() => {
    const view = renderWithSession(<DeepenPanel pageId="p1" />);

    ask("Pregunta de la página 1");
    stream.push(deltaFrame("Texto de la página 1"));
    expect(await screen.findByText("Texto de la página 1")).toBeInTheDocument();

    view.rerender(<SessionWrapper role="STUDENT"><DeepenPanel pageId="p2" /></SessionWrapper>);
    stream.push(deltaFrame(" tardío"));

    expect(screen.queryByText(/Texto de la página 1/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Detener" })).not.toBeInTheDocument();
    expect(deepenButton()).toBeEnabled();
  });

  it("shows the local reset time when the AI quota is exceeded", async() => {
    server.use(http.post(apiUrl(DEEPEN_PATH), () => {
      const response = errorResponse("ai.quota_exceeded", 429);

      response.headers.set("Retry-After", "3600");

      return response;
    }));
    renderWithSession(<DeepenPanel pageId="p1" />);

    fireEvent.click(deepenButton());

    expect(await screen.findByText(/^Alcanzaste el límite de uso del tutor de IA\. Podrás usarlo de nuevo a las \d{2}:\d{2}\.$/)).toBeInTheDocument();
  });

  it("explains when the AI provider is unavailable", async() => {
    server.use(http.post(apiUrl(DEEPEN_PATH), () => errorResponse("ai.providers_unavailable", 503)));
    renderWithSession(<DeepenPanel pageId="p1" />);

    fireEvent.click(deepenButton());

    expect(await screen.findByText(AI_ERROR_MESSAGES.providerUnavailable)).toBeInTheDocument();
  });

  it("explains when the page is not published", async() => {
    server.use(http.post(apiUrl(DEEPEN_PATH), () => HttpResponse.json(
      { success: false, message: "Page not found", data: null, code: "pages.page_not_found", timestamp: "", traceId: "t", pagination: null },
      { status: 404 },
    )));
    renderWithSession(<DeepenPanel pageId="p1" />);

    fireEvent.click(deepenButton());

    expect(await screen.findByText(AI_ERROR_MESSAGES.pageNotPublished)).toBeInTheDocument();
  });

  it("asks to open a page while none is visible", () => {
    renderWithSession(<DeepenPanel pageId={null} />);

    expect(screen.getByText("Abre una página de la lección para profundizar en ella.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "¿Deseas profundizar en el tema?" })).not.toBeInTheDocument();
  });
});
