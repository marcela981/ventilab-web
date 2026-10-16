/*
* Funcionalidad: AiChatProvider
* Descripción: Global state of the AI assistant drawer, mounted once in pages/_app.js above the pages so it survives navigation: whether the drawer is open, the conversation of its free chat (null = a new chat; set by onConversationCreated after the first send) and a panel key that remounts the chat panel for "Nueva conversación". The drawer (ChatPanel, markdown, KaTeX) is loaded through React.lazy + retryImport only when it is first opened and stays mounted afterwards, so the state of the chat persists across closes; it only renders for an authenticated backend session, and the state resets when the session user changes. On the /assistant routes (the full-page chat) the drawer closes and its panel remounts, so a later open reloads the conversation from the server instead of showing a stale thread. v1.1 (A3 review R3-drawer-load-failure-silent): if the drawer chunk fails to import or the drawer throws while rendering, the provider closes and unmounts it (the launcher's aria-expanded/aria-controls stay truthful), shows the "No se pudo abrir el asistente. Inténtalo de nuevo." error toast of the shared ToastProvider (when present) and creates a new lazy component, so the next click retries the load. v1.2 (closing review R3-failure-after-successful-load): a failure after the drawer had already rendered shows a runtime message ("El asistente tuvo un problema y se cerró. Puedes volver a abrirlo.") instead of the open-failure one; the conversation id survives, so the next open reloads it from the server. This module stays tiny for the app shell bundle: no markdown, KaTeX or ChatPanel import at module level. Depends on React, next/router, @shared/session, the design-system toast context, @shared/lib/retry-import and the AI chat routes (ASSISTANT_URL).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useRouter } from "next/router";
import { Component, createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, LazyExoticComponent, ReactNode } from "react";
import { ToastContext } from "@shared/design-system/components/use-toast";
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

// TODO(i18n): move to an ai-chat namespace in src/i18n.
export const AI_CHAT_LOAD_ERROR = "No se pudo abrir el asistente. Inténtalo de nuevo.";
export const AI_CHAT_RUNTIME_ERROR = "El asistente tuvo un problema y se cerró. Puedes volver a abrirlo.";

type LazyDrawer = LazyExoticComponent<ComponentType>;

// React.lazy caches its result (also a rejection), so every retry after a failure needs a new lazy component.
function createLazyDrawer(): LazyDrawer {
  return lazy(() => retryImport(() => import("./ai-chat-drawer")).then((module) => ({ default: module.AiChatDrawer })));
}

type DrawerBoundaryProps = { children: ReactNode, onError: () => void };
type DrawerBoundaryState = { failed: boolean };

// The drawer is optional chrome: an import or render failure inside it must never break the page. It reports the
// failure so the provider closes the drawer; the boundary unmounts with it, so the next open starts clean.
class DrawerErrorBoundary extends Component<DrawerBoundaryProps, DrawerBoundaryState> {
  override state: DrawerBoundaryState = { failed: false };

  static getDerivedStateFromError(): DrawerBoundaryState {
    return { failed: true };
  }

  override componentDidCatch() {
    this.props.onError();
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Rendered after the drawer inside its Suspense boundary: it only mounts once the drawer chunk resolved and the
// drawer rendered, so it tells a failure while opening apart from a later failure.
function DrawerReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);

  return null;
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
  const [Drawer, setDrawer] = useState<LazyDrawer>(() => createLazyDrawer());
  // Optional: without a ToastProvider the failure only closes the drawer.
  const toast = useContext(ToastContext);
  // True once the mounted drawer rendered successfully (reset on every failure).
  const drawerReadyRef = useRef(false);
  const markDrawerReady = useCallback(() => {
    drawerReadyRef.current = true;
  }, []);

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

  // The drawer chunk failed to load or the drawer failed to render: close it (truthful launcher aria state),
  // unmount it, say so, and prepare a new lazy component so the next open retries.
  const handleDrawerFailure = useCallback(() => {
    const failedAfterLoad = drawerReadyRef.current;

    drawerReadyRef.current = false;
    setState((current) => ({ ...current, open: false, loaded: false }));
    setDrawer(() => createLazyDrawer());
    toast?.error(failedAfterLoad ? AI_CHAT_RUNTIME_ERROR : AI_CHAT_LOAD_ERROR);
  }, [toast]);

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
        <DrawerErrorBoundary onError={handleDrawerFailure}>
          <Suspense fallback={null}>
            <Drawer />
            <DrawerReady onReady={markDrawerReady} />
          </Suspense>
        </DrawerErrorBoundary>
      ) : null}
    </AiChatContext.Provider>
  );
}
