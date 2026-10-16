/*
* Funcionalidad: AiChatProvider
* Descripción: Global state of the AI assistant drawer, mounted once in pages/_app.js above the pages so it survives navigation: whether the drawer is open, the conversation of its free chat (null = a new chat; set by onConversationCreated after the first send) and a panel key that remounts the chat panel for "Nueva conversación". The drawer (ChatPanel, markdown, KaTeX) is loaded through React.lazy + retryImport only when it is first opened and stays mounted afterwards, so the state of the chat persists across closes; it only renders for an authenticated backend session, and the state resets when the session user changes. On the /assistant routes (the full-page chat) the drawer closes and its panel remounts, so a later open reloads the conversation from the server instead of showing a stale thread. This module stays tiny for the app shell bundle: no markdown, KaTeX or ChatPanel import at module level. Depends on React, next/router, @shared/session, @shared/lib/retry-import and the AI chat routes (ASSISTANT_URL).
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { Component, createContext, lazy, Suspense, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { retryImport } from "@shared/lib/retry-import";
import { useSession } from "@shared/session/use-session";
import { ASSISTANT_URL } from "../config/ai-chat.routes";

// Id of the drawer paper, referenced by the launcher's aria-controls.
export const AI_CHAT_DRAWER_ID = "ai-chat-drawer";

export type AiChatContextValue = {
  open: boolean
  // Conversation of the drawer chat; null starts a new FREE chat on the first send.
  conversationId: string | null
  // Changes whenever the drawer chat panel must remount (new conversation, back from /assistant).
  panelKey: number
  // True once the drawer was loaded (first open) and is in the document.
  drawerMounted: boolean
  // True on /assistant and /assistant/[id], where the drawer makes no sense.
  isAssistantRoute: boolean
  openDrawer: () => void
  closeDrawer: () => void
  setConversationId: (conversationId: string) => void
  newConversation: () => void
};

const AiChatContext = createContext<AiChatContextValue | null>(null);

// Null outside an AiChatProvider.
export function useAiChat(): AiChatContextValue | null {
  return useContext(AiChatContext);
}

function NoDrawer() {
  return null;
}

const LazyAiChatDrawer = lazy(() =>
  retryImport(() => import("./ai-chat-drawer"))
    .then((module) => ({ default: module.AiChatDrawer }))
    .catch(() => ({ default: NoDrawer })),
);

type DrawerBoundaryState = { failed: boolean };

// The drawer is optional chrome: a render failure inside it must never break the page.
class DrawerErrorBoundary extends Component<{ children: ReactNode }, DrawerBoundaryState> {
  override state: DrawerBoundaryState = { failed: false };

  static getDerivedStateFromError(): DrawerBoundaryState {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

type DrawerState = {
  open: boolean
  conversationId: string | null
  panelKey: number
  loaded: boolean
};

const INITIAL_STATE: DrawerState = { open: false, conversationId: null, panelKey: 0, loaded: false };

export function isAssistantPath(pathname: string): boolean {
  return pathname === ASSISTANT_URL || pathname.startsWith(`${ASSISTANT_URL}/`);
}

export type AiChatProviderProps = {
  children: ReactNode
};

export function AiChatProvider({ children }: AiChatProviderProps) {
  const router = useRouter();
  const { status, user } = useSession();
  const authenticated = status === "authenticated";
  const userId = authenticated ? user?.id ?? null : null;
  const [state, setState] = useState<DrawerState>(INITIAL_STATE);
  const [ownerId, setOwnerId] = useState<string | null>(userId);
  const isAssistantRoute = isAssistantPath(router.pathname);
  const [wasAssistantRoute, setWasAssistantRoute] = useState(isAssistantRoute);

  // Another user (or none) took the session: the previous chat must not leak (state update during render).
  if (ownerId !== userId) {
    setOwnerId(userId);
    setState(INITIAL_STATE);
  }

  // Entering the full-page chat: close the drawer and remount its panel, so the next open re-reads the
  // conversation (the page may have added turns to it). State update during render, like the reset above.
  if (wasAssistantRoute !== isAssistantRoute) {
    setWasAssistantRoute(isAssistantRoute);

    if (isAssistantRoute) {
      setState((current) => (current.loaded || current.open ? { ...current, open: false, panelKey: current.panelKey + 1 } : current));
    }
  }

  const openDrawer = useCallback(() => setState((current) => ({ ...current, open: true, loaded: true })), []);
  const closeDrawer = useCallback(() => setState((current) => (current.open ? { ...current, open: false } : current)), []);
  const setConversationId = useCallback((conversationId: string) => {
    setState((current) => (current.conversationId === conversationId ? current : { ...current, conversationId }));
  }, []);
  const newConversation = useCallback(() => {
    setState((current) => ({ ...current, conversationId: null, panelKey: current.panelKey + 1 }));
  }, []);

  const drawerMounted = authenticated && state.loaded;
  const value = useMemo<AiChatContextValue>(() => ({
    open: authenticated && state.open,
    conversationId: state.conversationId,
    panelKey: state.panelKey,
    drawerMounted,
    isAssistantRoute,
    openDrawer,
    closeDrawer,
    setConversationId,
    newConversation,
  }), [authenticated, state, drawerMounted, isAssistantRoute, openDrawer, closeDrawer, setConversationId, newConversation]);

  return (
    <AiChatContext.Provider value={value}>
      {children}
      {drawerMounted ? (
        <DrawerErrorBoundary>
          <Suspense fallback={null}>
            <LazyAiChatDrawer />
          </Suspense>
        </DrawerErrorBoundary>
      ) : null}
    </AiChatContext.Provider>
  );
}
