/*
* Funcionalidad: AssistantPage (AssistantScreen)
* Descripción: Screen of /assistant and /assistant/[conversationId]. Desktop (≥ 900px): two columns, the ConversationList on the left and the ChatPanel on the right (a new chat when no conversation is open). Mobile: list and conversation are separate screens; /assistant shows the list ("Nueva conversación" opens an empty chat in place, with a back button), /assistant/[id] shows the conversation with a "Volver a las conversaciones" link. When the first send creates the conversation the URL moves to /assistant/[id] with a shallow router.replace whose href stays on the /assistant page (`{pathname: "/assistant", query: {conversationId}}` as `/assistant/[id]`), so the same ChatPanel keeps its thread. "Nueva conversación" and deleting the open conversation go to /assistant. An unknown conversation (missing or another user's) renders the not-found view of the ChatPanel. Depends on React, next/head, next/link, next/router, MUI, @shared/design-system, the AI chat entity, ConversationList, ChatPanel and the assistant CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Button from "@mui/material/Button";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";
import { PageHeader } from "@shared/design-system/components/page-header";
import { cx } from "@shared/lib/class-names";
import { AI_CHAT_SCOPE_TEXT } from "../config/ai-chat.config";
import { ASSISTANT_URL, buildConversationUrl } from "../entities/ai-chat.entity";
import { ChatPanel } from "../components/chat-panel";
import { ConversationList } from "../components/conversation-list";
import styles from "../../UI/assistant.module.css";

// TODO(i18n): move to an ai-chat namespace in src/i18n.
export const ASSISTANT_PAGE_COPY = {
  documentTitle: "Asistente IA | VentyLab",
  title: "Asistente IA",
  backToList: "Volver a las conversaciones",
} as const;

export type AssistantPageProps = {
  // Open conversation; null/undefined shows a new chat.
  conversationId?: string | null | undefined
};

export function AssistantPage({ conversationId }: AssistantPageProps) {
  const router = useRouter();
  const activeId = conversationId ?? null;
  // Mobile only: "Nueva conversación" on /assistant shows the empty chat instead of the list.
  const [composing, setComposing] = useState(false);
  const showChatOnMobile = activeId !== null || composing;

  const openNew = useCallback(() => {
    setComposing(true);

    if (activeId !== null) {
      void router.push(ASSISTANT_URL);
    }
  }, [activeId, router]);

  const handleCreated = useCallback((id: string) => {
    // Same page file (/assistant), so the shallow replace keeps this ChatPanel and its thread mounted.
    void router.replace({ pathname: ASSISTANT_URL, query: { conversationId: id } }, buildConversationUrl(id), { shallow: true });
  }, [router]);

  const handleDeleted = useCallback((id: string) => {
    if (id === activeId) {
      setComposing(false);
      void router.push(ASSISTANT_URL);
    }
  }, [activeId, router]);

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{ASSISTANT_PAGE_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={ASSISTANT_PAGE_COPY.title} subtitle={AI_CHAT_SCOPE_TEXT} />
      <div className={cx(styles.columns)}>
        <div className={cx(styles.listColumn, showChatOnMobile && styles.hiddenOnMobile)}>
          <ConversationList activeId={activeId} onNewConversation={openNew} onDeleted={handleDeleted} />
        </div>
        <div className={cx(styles.chatColumn, !showChatOnMobile && styles.hiddenOnMobile)}>
          <div className={cx(styles.mobileBack)}>
            {activeId !== null ? (
              <Link href={ASSISTANT_URL} className={cx(styles.backLink)} onClick={() => setComposing(false)}>
                <ArrowBackIcon fontSize="small" aria-hidden="true" />
                {ASSISTANT_PAGE_COPY.backToList}
              </Link>
            ) : (
              <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => setComposing(false)}>
                {ASSISTANT_PAGE_COPY.backToList}
              </Button>
            )}
          </div>
          <ChatPanel
            conversationId={activeId}
            onConversationCreated={handleCreated}
            onNewConversation={openNew}
            variant="page"
            className={cx(styles.chat)}
          />
        </div>
      </div>
    </div>
  );
}
