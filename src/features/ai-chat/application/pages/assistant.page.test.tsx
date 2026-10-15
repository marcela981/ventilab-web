/*
* Funcionalidad: AssistantPage tests
* Descripción: Behaviour of the /assistant screen against msw: an unknown conversation id (missing or of another user, 404) renders the not-found view (its "Nueva conversación" goes to /assistant), and the first send of a new chat replaces the URL shallowly with /assistant/[id] while keeping the /assistant page (href with the conversationId query). Depends on Testing Library, msw, a mocked next/router and next/link and the AI chat test helpers.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { deltaFrame, doneFrame, sseResponse } from "@shared/ai-conversation/application/sse-test-helpers";
import { apiUrl, conversationDto, envelope, errorResponse, SwrWrapper } from "../hooks/ai-chat-test-helpers";
import { AssistantPage } from "./assistant.page";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), query: {} }));

vi.mock("next/router", () => ({ useRouter: () => router }));
vi.mock("next/head", () => ({ default: () => null }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string, children: ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("@shared/rich-content/rich-content", () => ({
  RichContent: ({ content }: { content: unknown }) => <div>{typeof content === "string" ? content : ""}</div>,
}));

const LIST_URL = apiUrl("/api/tutor/conversations");
const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
  server.use(
    http.get(LIST_URL, () => HttpResponse.json(envelope([], { page: 1, pages: 1, limit: 20, total: 0 }))),
    http.get(apiUrl("/api/tutor/conversations/:conversationId"), ({ params }) => (params.conversationId === "c-new"
      ? HttpResponse.json(envelope({ ...conversationDto("c-new"), messages: [] }))
      : errorResponse("ai-tutor.conversation_not_found", 404))),
    http.get(apiUrl("/api/ai-ratings/mine"), () => HttpResponse.json(envelope(null))),
  );
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("AssistantPage", () => {
  it("renders the not-found view for an unknown conversation", async() => {
    render(<SwrWrapper><AssistantPage conversationId="ghost" /></SwrWrapper>);

    expect(await screen.findByText("Conversación no disponible")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Escribe tu pregunta" })).not.toBeInTheDocument();

    // The not-found action (the last "Nueva conversación"; the first one is the list header) leaves for /assistant.
    const startNew = screen.getAllByRole("button", { name: "Nueva conversación" }).at(-1);

    expect(startNew).toBeDefined();
    fireEvent.click(startNew as HTMLElement);
    expect(router.push).toHaveBeenCalledWith("/assistant");
  });

  it("moves the URL to the created conversation with a shallow replace on the same page", async() => {
    server.use(http.post(LIST_URL, () => sseResponse([
      deltaFrame("Hola."),
      doneFrame({ aiCallId: "call-1", messageId: "m-1", conversationId: "c-new" }),
    ])));

    render(<SwrWrapper><AssistantPage /></SwrWrapper>);

    fireEvent.change(screen.getByRole("textbox", { name: "Escribe tu pregunta" }), { target: { value: "¿Qué es la PEEP?" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(
      { pathname: "/assistant", query: { conversationId: "c-new" } },
      "/assistant/c-new",
      { shallow: true },
    ));
    expect(router.replace).toHaveBeenCalledTimes(1);
  });
});
