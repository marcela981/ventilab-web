/*
* Funcionalidad: DeepenPanel tests
* Descripción: Integration tests of the deepen accordion body against msw serving real text/event-stream bodies of POST /api/tutor/pages/{pageId}/deepen: deltas render progressively ("Consultando IA…" first) and the rating widget appears on `done`, an empty question expands the whole page, "Detener" stops the answer (no further text, stopped note) and the stopped answer is rated with the message id announced by the `start` frame (surface ACCORDION, scope PAGE; nothing to rate when stopped before the first fragment), a follow-up question reuses the conversation (also the one announced by a stopped first answer), the July error texts with "Inténtalo de nuevo" re-sending the failed turn in the same conversation, the prefill from a TutorAI suggestion, and a fresh thread when the page changes. v1.1 (L5 fix), v1.2 (S2 ai-chat), v1.3 (S2 review R3): see git history. v1.4 (W7, Bloque 2): rewritten for the accordion body with the July texts, the shared useTutorTurn engine (start frame), retry and ratings with surface and scope. RichContent is replaced by plain text (its lazy markdown renderer is covered in shared/rich-content). Depends on vitest, Testing Library, msw and the learning/SSE test helpers.
* Versión: 1.4
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
import { controlledStream, deltaFrame, doneFrame, errorFrame, sseResponse, startFrame } from "../../hooks/sse-test-helpers";
import type { ControlledStream } from "../../hooks/sse-test-helpers";
import { apiUrl, envelope, errorResponse, renderWithSession, SessionWrapper } from "../../pages/learning-test-helpers";
import { DeepenPanel } from "./deepen-panel";

vi.mock("@shared/rich-content/rich-content", () => ({
  RichContent: ({ content }: { content: unknown }) => <div>{typeof content === "string" ? content : ""}</div>,
}));

const DEEPEN_PATH = "/api/tutor/pages/:pageId/deepen";
const START = { conversationId: "conv-1", messageId: "msg-1" };
const DONE = { aiCallId: "call-1", ...START };
const server = setupServer();
let requests: { pageId: string, body: unknown }[] = [];
let ratings: unknown[] = [];
let stream: ControlledStream;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  requests = [];
  ratings = [];
  stream = controlledStream();
  server.use(
    http.post(apiUrl(DEEPEN_PATH), async({ request, params }) => {
      requests.push({ pageId: String(params.pageId), body: await request.json() });

      return stream.response();
    }),
    http.put(apiUrl("/api/ai-ratings"), async({ request }) => {
      ratings.push(await request.json());

      return HttpResponse.json(envelope(null));
    }),
  );
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

const sendButton = () => screen.getByRole("button", { name: "Enviar" });
const questionBox = () => screen.getByRole("textbox", { name: "Tu pregunta" });

function ask(question: string) {
  fireEvent.change(questionBox(), { target: { value: question } });
  fireEvent.click(sendButton());
}

function respondWith(...chunks: string[][]) {
  server.use(http.post(apiUrl(DEEPEN_PATH), async({ request, params }) => {
    requests.push({ pageId: String(params.pageId), body: await request.json() });

    return sseResponse(chunks[Math.min(requests.length - 1, chunks.length - 1)] ?? []);
  }));
}

describe("DeepenPanel", () => {
  it("shows the July texts and streams the answer progressively, then offers the rating", async() => {
    renderWithSession(<DeepenPanel pageId="p1" />);

    expect(screen.getByRole("heading", { name: "Expansión de Tema con IA" })).toBeInTheDocument();
    expect(questionBox()).toHaveAttribute("placeholder", "Escribe tu pregunta o deja en blanco para expandir automáticamente");

    ask("¿Cuándo subir la PEEP?");
    expect(await screen.findByText("Consultando IA…")).toBeInTheDocument();
    expect(screen.getByText("¿Cuándo subir la PEEP?")).toBeInTheDocument();

    stream.push(startFrame(START));
    stream.push(deltaFrame("Sube la PEEP "));
    expect(await screen.findByText("Sube la PEEP")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "¿Te fue útil?" })).not.toBeInTheDocument();

    stream.push(deltaFrame("si la oxigenación es baja."));
    stream.push(doneFrame(DONE));
    expect(await screen.findByRole("heading", { name: "¿Te fue útil?" })).toBeInTheDocument();
    expect(requests).toEqual([{ pageId: "p1", body: { question: "¿Cuándo subir la PEEP?" } }]);
    expect(sendButton()).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Sí, fue útil" }));
    await waitFor(() => expect(ratings).toEqual([{ targetType: "MESSAGE", targetId: "msg-1", helpful: true, surface: "ACCORDION", scope: "PAGE" }]));
  });

  it("expands the whole page when no question is written", async() => {
    renderWithSession(<DeepenPanel pageId="p1" />);

    fireEvent.click(sendButton());
    expect(await screen.findByText("Expandir esta página")).toBeInTheDocument();
    await waitFor(() => expect(requests).toEqual([{ pageId: "p1", body: {} }]));
  });

  it("stops the answer with Detener and rates the stopped answer with the announced message id", async() => {
    renderWithSession(<DeepenPanel pageId="p1" />);

    ask("Explica la distensibilidad");
    stream.push(startFrame(START));
    stream.push(deltaFrame("La distensibilidad"));
    expect(await screen.findByText("La distensibilidad")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    expect(await screen.findByText("Respuesta detenida. Solo se muestra la parte recibida.")).toBeInTheDocument();
    stream.push(deltaFrame(" es la relación volumen/presión."));
    stream.close();

    await waitFor(() => expect(screen.queryByRole("button", { name: "Detener" })).not.toBeInTheDocument());
    expect(screen.getByText("La distensibilidad", VISIBLE)).toBeInTheDocument();
    expect(screen.queryByText(/volumen\/presión/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "No fue útil" }));
    await waitFor(() => expect(ratings).toEqual([{ targetType: "MESSAGE", targetId: "msg-1", helpful: false, surface: "ACCORDION", scope: "PAGE" }]));
  });

  it("has nothing to rate when the answer is stopped before the first fragment", async() => {
    renderWithSession(<DeepenPanel pageId="p1" />);

    ask("Explica la PEEP");
    stream.push(startFrame(START));
    expect(await screen.findByRole("button", { name: "Detener" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    stream.close();

    expect(await screen.findByText("Respuesta detenida. Solo se muestra la parte recibida.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "¿Te fue útil?" })).not.toBeInTheDocument();
  });

  it("continues the conversation announced by a stopped first answer", async() => {
    renderWithSession(<DeepenPanel pageId="p1" />);

    ask("Primera");
    stream.push(startFrame(START));
    stream.push(deltaFrame("Parte"));
    expect(await screen.findByText("Parte")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Detener" }));
    stream.close();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Detener" })).not.toBeInTheDocument());

    respondWith([startFrame({ ...START, messageId: "msg-2" }), deltaFrame("Otra"), doneFrame({ ...DONE, messageId: "msg-2" })]);
    ask("Segunda");

    expect(await screen.findByText("Otra", VISIBLE)).toBeInTheDocument();
    expect(requests[1]).toEqual({ pageId: "p1", body: { question: "Segunda", conversationId: "conv-1" } });
    expect(screen.getByText("Parte")).toBeInTheDocument();
  });

  it("shows the July error text and retries the failed turn in the same conversation", async() => {
    renderWithSession(<DeepenPanel pageId="p1" />);
    respondWith(
      [startFrame(START), deltaFrame("Parcial"), errorFrame("ai.stream_interrupted", "cortado")],
      [startFrame({ ...START, messageId: "msg-2" }), deltaFrame("Respuesta completa"), doneFrame({ ...DONE, messageId: "msg-2" })],
    );

    ask("Pregunta");
    expect(await screen.findByText("Error al expandir el tema")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Inténtalo de nuevo" }));

    expect(await screen.findByText("Respuesta completa", VISIBLE)).toBeInTheDocument();
    expect(screen.queryByText("Error al expandir el tema")).not.toBeInTheDocument();
    expect(requests).toEqual([
      { pageId: "p1", body: { question: "Pregunta" } },
      { pageId: "p1", body: { question: "Pregunta", conversationId: "conv-1" } },
    ]);
  });

  it("uses the July texts for too many requests and a lost connection", async() => {
    server.use(http.post(apiUrl(DEEPEN_PATH), () => errorResponse("ai.quota_exceeded", 429)));
    const view = renderWithSession(<DeepenPanel pageId="p1" />);

    fireEvent.click(sendButton());
    expect(await screen.findByText("Demasiadas solicitudes. Por favor, espera un momento.")).toBeInTheDocument();

    server.use(http.post(apiUrl(DEEPEN_PATH), () => HttpResponse.error()));
    view.rerender(<SessionWrapper role="STUDENT"><DeepenPanel pageId="p2" /></SessionWrapper>);
    fireEvent.click(sendButton());
    expect(await screen.findByText("Sin conexión")).toBeInTheDocument();
  });

  it("fills and focuses the question with a suggestion prompt without sending it", async() => {
    const view = renderWithSession(<DeepenPanel pageId="p1" prefill={{ id: 1, prompt: "Resúmeme esta página" }} />);

    expect(questionBox()).toHaveValue("Resúmeme esta página");
    await waitFor(() => expect(questionBox()).toHaveFocus());

    view.rerender(<SessionWrapper role="STUDENT"><DeepenPanel pageId="p1" prefill={{ id: 2, prompt: "Dame un mapa mental" }} /></SessionWrapper>);
    expect(questionBox()).toHaveValue("Dame un mapa mental");
    expect(requests).toEqual([]);
  });

  it("starts a fresh thread when the page changes (keyed by the parent)", async() => {
    const view = renderWithSession(<DeepenPanel key="p1" pageId="p1" />);

    ask("Pregunta de la página 1");
    stream.push(deltaFrame("Texto de la página 1"));
    expect(await screen.findByText("Texto de la página 1")).toBeInTheDocument();

    view.rerender(<SessionWrapper role="STUDENT"><DeepenPanel key="p2" pageId="p2" /></SessionWrapper>);
    stream.push(deltaFrame(" tardío"));

    expect(screen.queryByText(/Texto de la página 1/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Detener" })).not.toBeInTheDocument();
    expect(sendButton()).toBeEnabled();
  });
});
