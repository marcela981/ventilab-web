/*
* Funcionalidad: AiChatLauncher
* Descripción: Button of the AppShell top bar that opens the AI assistant drawer ("Abrir asistente IA", aria-expanded with the drawer state, aria-controls once the drawer is in the document). It is contributed to the shell through the shared top-bar-actions slot from pages/_app.js. It renders nothing without an AiChatProvider, without an authenticated session, and on the /assistant routes, where the full-page chat is already on screen. Small on purpose (app shell bundle): it only imports MUI IconButton, one icon and the AiChatProvider context. Depends on React, MUI, @shared/session and the AiChatProvider.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import IconButton from "@mui/material/IconButton";
import { useSession } from "@shared/session/use-session";
import { AI_CHAT_DRAWER_ID, useAiChat } from "./ai-chat-provider";

// TODO(i18n): move to an ai-chat namespace in src/i18n.
export const AI_CHAT_LAUNCHER_LABEL = "Abrir asistente IA";

export function AiChatLauncher() {
  const chat = useAiChat();
  const { status } = useSession();

  if (!chat || status !== "authenticated" || chat.isAssistantRoute) {
    return null;
  }

  const controls = chat.drawerMounted ? { "aria-controls": AI_CHAT_DRAWER_ID } : {};

  return (
    <IconButton
      aria-label={AI_CHAT_LAUNCHER_LABEL}
      aria-haspopup="dialog"
      aria-expanded={chat.open}
      {...controls}
      onClick={chat.openDrawer}
    >
      <SmartToyOutlinedIcon />
    </IconButton>
  );
}
