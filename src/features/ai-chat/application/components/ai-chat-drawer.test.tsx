/*
* Funcionalidad: AI chat drawer tests
* Descripción: Behaviour of the global AI assistant drawer: the AiChatProvider keeps the drawer state (open, conversation) across rerenders that simulate a page navigation; the AiChatLauncher (top bar button with aria-expanded/aria-controls) lazily opens the drawer with the chat panel inside, the composer gets the focus once it is open, Esc closes it and the focus returns to the launcher; "Expandir" is disabled until a conversation exists and then navigates to /assistant/[id] and closes the drawer; "Nueva conversación" remounts the panel with no conversation; entering the /assistant routes closes the drawer and remounts its panel (fresh reload, same conversation); the launcher is hidden on the /assistant routes and without a session. The ChatPanel is replaced by a light stub that mirrors its autoFocus and focusComposer contract (the real one is covered by its own tests). Depends on vitest, Testing Library, a mocked next/router and the session context.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "@shared/session/session.entity";
import { SessionContext } from "@shared/session/session-context";
import type { SessionContextValue } from "@shared/session/session-context";
import { AiChatLauncher } from "./ai-chat-launcher";
import { AiChatProvider, useAiChat } from "./ai-chat-provider";
import type { ChatPanelProps } from "./chat-panel";

const router = vi.hoisted(() => ({ pathname: "/learn", asPath: "/learn", push: vi.fn(() => Promise.resolve(true)) }));

vi.mock("next/router", () => ({ useRouter: () => router }));

// Mounts of the stub panel, to tell a remount from a rerender.
const panelMounts = vi.hoisted(() => ({ count: 0 }));

vi.mock("./chat-panel", () => ({
  ChatPanel: function ChatPanelStub({ conversationId, onConversationCreated, headerActions, ref, variant, autoFocus = true }: ChatPanelProps) {
    const composerRef = useRef<HTMLTextAreaElement | null>(null);
    const [mounted] = useState(() => {
      panelMounts.count += 1;

      return panelMounts.count;
    });

    useImperativeHandle(ref, () => ({ focusComposer: () => composerRef.current?.focus() }), []);

    // Same contract as the real panel: focus the composer on mount and when autoFocus turns on.
    useEffect(() => {
      if (autoFocus) {
        composerRef.current?.focus();
      }
    }, [autoFocus, conversationId]);

    return (
      <section aria-label="Conversación con el asistente" data-variant={variant} data-mount={mounted} data-autofocus={String(autoFocus)}>
        <p>{`Conversación: ${conversationId ?? "nueva"}`}</p>
        {headerActions}
        <textarea ref={composerRef} aria-label="Escribe tu pregunta" />
        <button type="button" onClick={() => onConversationCreated?.("c-42")}>Simular creación</button>
      </section>
    );
  },
}));

function sessionValue(status: SessionContextValue["status"] = "authenticated", role: Role = "STUDENT"): SessionContextValue {
  return {
    status,
    user: status === "authenticated" ? { id: "u1", email: "laura@ventylab.demo", name: "Laura Gómez", image: null, role } : null,
    role: status === "authenticated" ? role : null,
    permissions: [],
    error: null,
    hasRole: (...roles: Role[]) => roles.includes(role),
    hasPermission: () => false,
    establishSession: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
    reloadSession: vi.fn(),
    handleRoleChanged: vi.fn(),
  };
}

function StateProbe() {
  const chat = useAiChat();

  return <output aria-label="estado">{`${chat?.open ? "abierto" : "cerrado"}|${chat?.conversationId ?? "sin conversación"}`}</output>;
}

function tree(page: ReactNode, session = sessionValue()) {
  return (
    <SessionContext.Provider value={session}>
      <AiChatProvider>
        <AiChatLauncher />
        <StateProbe />
        {page}
      </AiChatProvider>
    </SessionContext.Provider>
  );
}

// hidden: while the drawer is open, MUI marks the rest of the page (the launcher included) aria-hidden.
const launcher = () => screen.getByRole("button", { name: "Abrir asistente IA", hidden: true });

async function openDrawer() {
  fireEvent.click(launcher());

  return screen.findByRole("dialog", { name: "Asistente IA" });
}

beforeEach(() => {
  router.pathname = "/learn";
  router.asPath = "/learn";
  router.push.mockClear();
  panelMounts.count = 0;
});

describe("AI chat drawer", () => {
  it("opens lazily from the launcher with the chat panel and focuses the composer", async() => {
    render(tree(<p>Página</p>));

    expect(launcher()).toHaveAttribute("aria-expanded", "false");
    expect(launcher()).not.toHaveAttribute("aria-controls");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const dialog = await openDrawer();

    expect(dialog).toHaveAttribute("id", "ai-chat-drawer");
    expect(screen.getByRole("region", { name: "Conversación con el asistente" })).toHaveAttribute("data-variant", "drawer");
    expect(screen.getByText("Conversación: nueva")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Escribe tu pregunta" })).toHaveFocus());
    expect(launcher()).toHaveAttribute("aria-expanded", "true");
    expect(launcher()).toHaveAttribute("aria-controls", "ai-chat-drawer");
  });

  it("keeps the drawer state across a navigation and shows the same conversation again", async() => {
    const { rerender } = render(tree(<p>Lección</p>));

    await openDrawer();
    fireEvent.click(screen.getByRole("button", { name: "Simular creación" }));
    expect(screen.getByLabelText("estado")).toHaveTextContent("abierto|c-42");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.getByLabelText("estado")).toHaveTextContent("cerrado|c-42"));

    // Another page renders under the same provider.
    router.pathname = "/evaluations";
    router.asPath = "/evaluations";
    rerender(tree(<p>Evaluaciones</p>));

    expect(screen.getByText("Evaluaciones")).toBeInTheDocument();
    expect(screen.getByLabelText("estado")).toHaveTextContent("cerrado|c-42");

    await openDrawer();
    expect(screen.getByText("Conversación: c-42")).toBeInTheDocument();
    // Kept mounted across the close: the same panel instance, not a remount.
    expect(panelMounts.count).toBe(1);
  });

  it("closes with Esc and returns the focus to the launcher", async() => {
    render(tree(<p>Página</p>));

    launcher().focus();
    await openDrawer();
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Escribe tu pregunta" })).toHaveFocus());

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Escribe tu pregunta" }), { key: "Escape" });

    await waitFor(() => expect(launcher()).toHaveAttribute("aria-expanded", "false"));
    await waitFor(() => expect(launcher()).toHaveFocus());
    // Kept mounted while closed, without stealing the focus.
    expect(screen.getByRole("region", { name: "Conversación con el asistente", hidden: true })).toHaveAttribute("data-autofocus", "false");
  });

  it("expands the conversation to /assistant/[id] and closes the drawer", async() => {
    render(tree(<p>Página</p>));

    await openDrawer();

    const expand = screen.getByRole("button", { name: "Expandir" });

    expect(expand).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Simular creación" }));
    expect(expand).toBeEnabled();

    fireEvent.click(expand);

    expect(router.push).toHaveBeenCalledWith("/assistant/c-42");
    expect(screen.getByLabelText("estado")).toHaveTextContent("cerrado|c-42");
  });

  it("starts a new conversation by remounting the panel without a conversation", async() => {
    render(tree(<p>Página</p>));

    await openDrawer();
    fireEvent.click(screen.getByRole("button", { name: "Simular creación" }));
    expect(screen.getByText("Conversación: c-42")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Nueva conversación" }));

    expect(await screen.findByText("Conversación: nueva")).toBeInTheDocument();
    expect(panelMounts.count).toBe(2);
    expect(screen.getByLabelText("estado")).toHaveTextContent("abierto|sin conversación");
  });

  it("closes the drawer and remounts its panel when the full-page chat opens, keeping the conversation", async() => {
    const { rerender } = render(tree(<p>Lección</p>));

    await openDrawer();
    fireEvent.click(screen.getByRole("button", { name: "Simular creación" }));

    router.pathname = "/assistant/[conversationId]";
    rerender(tree(<p>Asistente</p>));

    await waitFor(() => expect(screen.getByLabelText("estado")).toHaveTextContent("cerrado|c-42"));
    expect(panelMounts.count).toBe(2);
  });

  it("hides the launcher on the /assistant routes and without a session", () => {
    router.pathname = "/assistant/[conversationId]";

    const { rerender } = render(tree(<p>Asistente</p>));

    expect(screen.queryByRole("button", { name: "Abrir asistente IA" })).not.toBeInTheDocument();

    router.pathname = "/learn";
    rerender(tree(<p>Página</p>, sessionValue("unauthenticated")));

    expect(screen.queryByRole("button", { name: "Abrir asistente IA" })).not.toBeInTheDocument();
  });
});
