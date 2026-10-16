/*
* Funcionalidad: AiChatDrawer
* Descripción: Global AI assistant drawer, loaded lazily by AiChatProvider on the first open and kept mounted afterwards (keepMounted), so a running answer and the thread survive closing it. An MUI Drawer anchored right: full screen on phones, a side panel on wider screens (CSS Module). It holds the ChatPanel "drawer" variant for the provider's conversation (null = a new free chat; the created id is stored in the provider) with three header actions: "Nueva conversación" (empty chat, remounts the panel), "Expandir" (closes the drawer and opens /assistant/[id]; disabled until a conversation exists) and "Cerrar". The paper is a labelled modal dialog: MUI traps focus inside it, Esc closes it and focus returns to the launcher; the composer gets the focus on open (ChatPanel autoFocus while open: on the first open the panel mounts already open, since MUI skips the enter transition; later opens also focus it when the slide-in transition ends, because the kept-mounted panel is hidden until then). Depends on React, MUI, next/router, the AI chat routes, the AiChatProvider context, ChatPanel and the drawer CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import { useRouter } from "next/router";
import { useCallback, useRef } from "react";
import { cx } from "@shared/lib/class-names";
import { buildConversationUrl } from "../config/ai-chat.routes";
import { AI_CHAT_DRAWER_ID, useAiChat } from "./ai-chat-provider";
import { ChatPanel } from "./chat-panel";
import type { ChatPanelHandle } from "./chat-panel";
import styles from "../../UI/ai-chat-drawer.module.css";

// TODO(i18n): move to an ai-chat namespace in src/i18n.
export const AI_CHAT_DRAWER_COPY = {
  label: "Asistente IA",
  newConversation: "Nueva conversación",
  expand: "Expandir",
  close: "Cerrar",
} as const;

export function AiChatDrawer() {
  const chat = useAiChat();
  const router = useRouter();
  const panelRef = useRef<ChatPanelHandle | null>(null);
  const setConversationId = chat?.setConversationId;
  const handleCreated = useCallback((id: string) => setConversationId?.(id), [setConversationId]);
  const open = chat?.open ?? false;
  // Later opens: the kept-mounted composer is hidden until the slide-in starts, so it is focused again once
  // the transition ends (the first open mounts already open, MUI skips that transition and the panel's
  // autoFocus focuses it on mount).
  const focusComposer = useCallback(() => panelRef.current?.focusComposer(), []);

  if (!chat) {
    return null;
  }

  const { conversationId, panelKey, closeDrawer, newConversation } = chat;

  const expand = () => {
    if (conversationId === null) {
      return;
    }

    closeDrawer();
    void router.push(buildConversationUrl(conversationId));
  };

  const headerActions = (
    <>
      <IconButton size="small" aria-label={AI_CHAT_DRAWER_COPY.newConversation} title={AI_CHAT_DRAWER_COPY.newConversation} onClick={newConversation}>
        <AddCommentOutlinedIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        aria-label={AI_CHAT_DRAWER_COPY.expand}
        title={AI_CHAT_DRAWER_COPY.expand}
        onClick={expand}
        disabled={conversationId === null}
      >
        <OpenInFullIcon fontSize="small" />
      </IconButton>
      <IconButton size="small" aria-label={AI_CHAT_DRAWER_COPY.close} title={AI_CHAT_DRAWER_COPY.close} onClick={closeDrawer}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </>
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={closeDrawer}
      keepMounted
      slotProps={{
        paper: {
          id: AI_CHAT_DRAWER_ID,
          role: "dialog",
          "aria-modal": true,
          "aria-label": AI_CHAT_DRAWER_COPY.label,
          className: cx(styles.paper),
        },
        transition: { onEntered: focusComposer },
      }}
    >
      <ChatPanel
        key={panelKey}
        ref={panelRef}
        conversationId={conversationId}
        onConversationCreated={handleCreated}
        onNewConversation={newConversation}
        variant="drawer"
        autoFocus={open}
        headerActions={headerActions}
      />
    </Drawer>
  );
}
