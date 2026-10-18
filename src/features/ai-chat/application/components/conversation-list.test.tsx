/*
* Funcionalidad: ConversationList tests
* Descripción: Behaviour of the assistant conversation list against msw: the scope toggle sends `scope` and returns to page 1, the title filter only keeps matching loaded conversations, inline rename saves with Enter (PATCH {title}) and Esc cancels without a request, delete asks for confirmation before DELETE and reports the deleted id, and a LESSON conversation shows its "Ir a la lección" link resolved from the lesson read. v1.1 (A3, review R3-page-not-clamped): deleting the only conversation of the last page moves the list back to the last existing page. Depends on Testing Library, msw and the AI chat test helpers. v1.2 (closure B1): Testing Library waits up to 5 s and each test up to 20 s, since the defaults (1 s / 5 s) failed under the full parallel suite.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { apiUrl, conversationDto, envelope, SwrWrapper } from "../hooks/ai-chat-test-helpers";
import type { AiConversationDTO } from "../../api/dtos/ai-chat.dto";
import { ConversationList } from "./conversation-list";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string, children: ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

// Under the full parallel suite the first msw round trip and MUI render exceed the 1 s default wait and the 5 s test timeout.
configure({ asyncUtilTimeout: 5_000 });
vi.setConfig({ testTimeout: 20_000 });

const LIST_URL = apiUrl("/api/tutor/conversations");
const ITEM_URL = apiUrl("/api/tutor/conversations/:conversationId");
const server = setupServer();
let conversations: AiConversationDTO[] = [];
let listQueries: string[] = [];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  listQueries = [];
  conversations = [
    conversationDto("c1", { title: "PEEP en SDRA" }),
    conversationDto("c2", { title: "Destete ventilatorio" }),
  ];
  server.use(http.get(LIST_URL, ({ request }) => {
    const url = new URL(request.url);
    const scope = url.searchParams.get("scope");
    const items = scope ? conversations.filter((conversation) => conversation.scope === scope) : conversations;

    listQueries.push(url.search);

    return HttpResponse.json(envelope(items, { page: 1, pages: 1, limit: 20, total: items.length }));
  }));
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function renderList(props: Partial<Parameters<typeof ConversationList>[0]> = {}) {
  return render(
    <SwrWrapper>
      <ConversationList activeId={null} onNewConversation={vi.fn()} {...props} />
    </SwrWrapper>,
  );
}

describe("ConversationList", () => {
  it("sends the scope filter to the listing", async() => {
    conversations.push(conversationDto("c3", { title: "Pregunta de lección", scope: "LESSON", refId: "l1" }));
    server.use(http.get(apiUrl("/api/lessons/:id"), () => HttpResponse.json(envelope({ id: "l1", moduleId: "m1" }))));

    renderList();

    expect(await screen.findByRole("link", { name: /PEEP en SDRA/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lección" }));

    await waitFor(() => expect(listQueries.at(-1)).toContain("scope=LESSON"));
    expect(listQueries.at(-1)).toContain("page=1");
    expect(await screen.findByRole("link", { name: /^Pregunta de lección/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /PEEP en SDRA/ })).not.toBeInTheDocument();
  });

  it("filters the loaded conversations by title", async() => {
    renderList();

    await screen.findByRole("link", { name: /PEEP en SDRA/ });
    fireEvent.change(screen.getByRole("searchbox", { name: "Filtrar conversaciones cargadas" }), { target: { value: "destete" } });

    expect(screen.getByRole("link", { name: /Destete ventilatorio/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /PEEP en SDRA/ })).not.toBeInTheDocument();
  });

  it("renames inline with Enter and cancels with Escape", async() => {
    const renames: unknown[] = [];

    server.use(http.patch(ITEM_URL, async({ request, params }) => {
      renames.push({ id: params.conversationId, body: await request.json() });
      conversations[0] = conversationDto("c1", { title: "PEEP óptima" });

      return HttpResponse.json(envelope(null));
    }));

    renderList();

    fireEvent.click(await screen.findByRole("button", { name: "Renombrar «Destete ventilatorio»" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Nuevo título" }), { target: { value: "No se guarda" } });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Nuevo título" }), { key: "Escape" });

    expect(screen.queryByRole("textbox", { name: "Nuevo título" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Destete ventilatorio/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Renombrar «PEEP en SDRA»" }));

    const field = screen.getByRole("textbox", { name: "Nuevo título" });

    expect(field).toHaveAttribute("maxlength", "120");
    fireEvent.change(field, { target: { value: "   " } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(await screen.findByText("El título debe tener entre 1 y 120 caracteres.")).toBeInTheDocument();

    fireEvent.change(field, { target: { value: "PEEP óptima" } });
    fireEvent.keyDown(field, { key: "Enter" });

    expect(await screen.findByRole("link", { name: /PEEP óptima/ })).toBeInTheDocument();
    expect(renames).toEqual([{ id: "c1", body: { title: "PEEP óptima" } }]);
  });

  it("deletes a conversation only after confirmation and reports it", async() => {
    const deleted: string[] = [];
    const onDeleted = vi.fn();

    server.use(http.delete(ITEM_URL, ({ params }) => {
      deleted.push(String(params.conversationId));
      conversations = conversations.filter((conversation) => conversation.id !== params.conversationId);

      return HttpResponse.json(envelope(null));
    }));

    renderList({ activeId: "c1", onDeleted });

    expect(await screen.findByRole("link", { name: /PEEP en SDRA/ })).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByRole("button", { name: "Eliminar «PEEP en SDRA»" }));

    const dialog = await screen.findByRole("dialog", { name: "¿Eliminar la conversación?" });

    expect(deleted).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith("c1"));
    expect(deleted).toEqual(["c1"]);
    await waitFor(() => expect(screen.queryByRole("link", { name: /PEEP en SDRA/ })).not.toBeInTheDocument());
  });

  it("moves back to the last existing page after deleting the only conversation of the last page", async() => {
    conversations = Array.from({ length: 21 }, (_unused, index) => conversationDto(`c${index + 1}`, { title: `Conversación ${index + 1}` }));
    server.use(
      http.get(LIST_URL, ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get("page") ?? "1");
        const limit = Number(url.searchParams.get("limit") ?? "20");
        const pages = Math.max(1, Math.ceil(conversations.length / limit));

        listQueries.push(url.search);

        return HttpResponse.json(envelope(conversations.slice((page - 1) * limit, page * limit), { page, pages, limit, total: conversations.length }));
      }),
      http.delete(ITEM_URL, ({ params }) => {
        conversations = conversations.filter((conversation) => conversation.id !== params.conversationId);

        return HttpResponse.json(envelope(null));
      }),
    );

    renderList();

    expect(await screen.findByRole("link", { name: /Conversación 1(?![0-9])/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /page 2/ }));
    expect(await screen.findByRole("link", { name: /Conversación 21/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Eliminar «Conversación 21»" }));
    fireEvent.click(within(await screen.findByRole("dialog", { name: "¿Eliminar la conversación?" })).getByRole("button", { name: "Eliminar" }));

    // Page 2 no longer exists: the list goes back to page 1 instead of claiming there are no conversations
    // (delete, page 2 revalidation and the page 1 read happen in sequence, hence the longer wait).
    expect(await screen.findByRole("link", { name: /Conversación 1(?![0-9])/ }, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.queryByText("Aún no tienes conversaciones")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Páginas de conversaciones" })).not.toBeInTheDocument();
    // Renders two full server pages and three sequential reads: slower than the default budget under a full run.
  }, 15000);

  it("shows the learning origin link of a LESSON conversation", async() => {
    conversations = [conversationDto("c3", { title: "Pregunta de lección", scope: "LESSON", refId: "l1" })];
    server.use(http.get(apiUrl("/api/lessons/:id"), () => HttpResponse.json(envelope({ id: "l1", moduleId: "m1" }))));

    renderList();

    const origin = await screen.findByRole("link", { name: "Ir a la lección: Pregunta de lección" });

    expect(origin).toHaveAttribute("href", "/learn/modules/m1/lessons/l1/1");
    expect(screen.getByText("Lección", { selector: ".MuiChip-label" })).toBeInTheDocument();
  });
});
