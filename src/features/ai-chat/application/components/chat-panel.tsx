/*
* Funcionalidad: ChatPanel
* Descripción: Conversation view of the AI assistant, shared by the /assistant pages ("page" variant) and the global drawer ("drawer" variant). It runs useChatSession for the given conversation (none = a new FREE chat created by the first send) and shows: a header with the conversation title (plus optional host actions); the thread (MessageList of ChatMessageView, only the answer of the current session turn is announced) inside a focusable scroll region that sticks to the bottom while streaming unless the reader scrolled up, then "Ir al final" appears; the empty state of a new chat (scope text and suggested questions that send on click); loading, load-error ("Reintentar" reloads the detail and sending stays blocked) and not-found states; the error of the last turn (quota with its reset time and no retry; provider unavailable, interrupted connection and generic failures with "Reintentar"); the Composer (Enter sends, Shift+Enter new line, counter near the 4000 limit, "Detener" while streaming) and the permanent disclaimer. When the first send creates the conversation it calls onConversationCreated(id) once, so the host can move the URL without remounting the panel. The composer gets focus on mount and when another conversation opens (autoFocus), and the imperative handle exposes focusComposer() for the drawer. It never imports the learning feature (no origin link), so the drawer chunk stays small. BACKEND GAP: no quota usage endpoint, so no usage is shown. Depends on React, MUI, @shared/ai-conversation, @shared/design-system, the AI chat config, entity, useChatSession, useStickToBottom, ChatMessageView and the chat panel CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ReplayIcon from "@mui/icons-material/Replay";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ReactNode, Ref } from "react";
import { Composer, MessageList } from "@shared/ai-conversation";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { cx } from "@shared/lib/class-names";
import { AI_CHAT_DISCLAIMER, AI_CHAT_MESSAGE_MAX_LENGTH, AI_CHAT_SCOPE_TEXT, SUGGESTED_QUESTIONS } from "../config/ai-chat.config";
import { classifyChatError } from "../entities/ai-chat.entity";
import type { ChatError } from "../entities/ai-chat.entity";
import { useChatSession } from "../hooks/use-chat-session";
import { useStickToBottom } from "../hooks/use-stick-to-bottom";
import { ChatMessageView } from "./chat-message-view";
import styles from "../../UI/chat-panel.module.css";

// TODO(i18n): move to an ai-chat namespace in src/i18n.
export const CHAT_PANEL_COPY = {
  newTitle: "Nueva conversación",
  threadLabel: "Mensajes de la conversación",
  regionLabel: "Conversación con el asistente",
  composerLabel: "Escribe tu pregunta",
  composerPlaceholder: "Pregunta sobre ventilación mecánica o el sistema respiratorio",
  emptyTitle: "¿En qué te puedo ayudar?",
  suggestionsLabel: "Preguntas sugeridas",
  loading: "Cargando la conversación…",
  loadErrorTitle: "No se pudo cargar la conversación",
  loadErrorBlocked: "No puedes enviar mensajes hasta que la conversación cargue.",
  notFoundTitle: "Conversación no disponible",
  notFoundDescription: "La conversación no existe, fue eliminada o pertenece a otra persona.",
  startNew: "Nueva conversación",
  scrollToEnd: "Ir al final",
  retry: "Reintentar",
} as const;

export type ChatPanelHandle = {
  focusComposer: () => void
};

export type ChatPanelProps = {
  // Conversation to open; null/undefined starts a new FREE chat on the first send.
  conversationId?: string | null | undefined
  // Called once with the id of the conversation created by the first send of a new chat.
  onConversationCreated?: ((conversationId: string) => void) | undefined
  // "Nueva conversación" of the not-found state; without it the panel resets itself to a new chat.
  onNewConversation?: (() => void) | undefined
  variant?: "page" | "drawer"
  // Focuses the composer on mount and when another conversation opens.
  autoFocus?: boolean
  // Extra header actions of the host (e.g. expand or close in the drawer).
  headerActions?: ReactNode
  className?: string
  ref?: Ref<ChatPanelHandle>
};

function TurnError({ error, canRetry, onRetry }: { error: ChatError, canRetry: boolean, onRetry: () => void }) {
  const severity = error.kind === "quota" ? "warning" : "error";

  return (
    <Alert
      severity={severity}
      className={cx(styles.turnError)}
      action={canRetry ? (
        <Button color="inherit" size="small" startIcon={<ReplayIcon />} onClick={onRetry}>
          {CHAT_PANEL_COPY.retry}
        </Button>
      ) : undefined}
    >
      {error.message}
    </Alert>
  );
}

export function ChatPanel({
  conversationId,
  onConversationCreated,
  onNewConversation,
  variant = "page",
  autoFocus = true,
  headerActions,
  className,
  ref,
}: ChatPanelProps) {
  const requestedId = conversationId ?? null;
  const session = useChatSession({ conversationId: requestedId });
  const [draft, setDraft] = useState("");
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const notifiedRef = useRef<string | null>(null);
  const { messages, status } = session;
  const lastMessage = messages[messages.length - 1];
  const threadRef = useRef<HTMLDivElement | null>(null);
  const { onScroll, isPinned, scrollToBottom } = useStickToBottom(threadRef, `${messages.length}:${lastMessage?.content.length ?? 0}:${lastMessage?.status ?? ""}`);

  useImperativeHandle(ref, () => ({ focusComposer: () => composerRef.current?.focus() }), []);

  // A new chat got its conversation from the first send: tell the host once (it may move the URL).
  useEffect(() => {
    const createdId = session.conversationId;

    if (createdId !== null && requestedId === null && notifiedRef.current !== createdId) {
      notifiedRef.current = createdId;
      onConversationCreated?.(createdId);
    }
  }, [session.conversationId, requestedId, onConversationCreated]);

  useEffect(() => {
    if (autoFocus) {
      composerRef.current?.focus();
    }
  }, [autoFocus, requestedId]);

  const send = (text: string) => {
    setDraft("");
    void session.send(text);
  };

  const startNew = () => {
    if (onNewConversation) {
      onNewConversation();
    } else {
      session.reset();
    }
  };

  if (status === "not-found") {
    return (
      <section className={cx(styles.panel, styles[variant], className)} aria-label={CHAT_PANEL_COPY.regionLabel}>
        <EmptyState
          icon={<ChatBubbleOutlineIcon />}
          title={CHAT_PANEL_COPY.notFoundTitle}
          description={CHAT_PANEL_COPY.notFoundDescription}
          action={<Button variant="contained" onClick={startNew}>{CHAT_PANEL_COPY.startNew}</Button>}
        />
      </section>
    );
  }

  const isNewChat = session.conversationId === null && messages.length === 0;
  const title = session.conversation?.title ?? (session.conversationId === null ? CHAT_PANEL_COPY.newTitle : "");
  const lastIndex = messages.length - 1;
  const blocked = status === "loading" || status === "load-error";
  let body: ReactNode;

  if (status === "loading") {
    body = <LoadingState label={CHAT_PANEL_COPY.loading} />;
  } else if (status === "load-error") {
    body = (
      <ErrorState
        title={CHAT_PANEL_COPY.loadErrorTitle}
        description={`${classifyChatError(session.loadError).message} ${CHAT_PANEL_COPY.loadErrorBlocked}`}
        onRetry={() => void session.reload()}
        retryLabel={CHAT_PANEL_COPY.retry}
      />
    );
  } else if (isNewChat) {
    body = (
      <div className={cx(styles.empty)}>
        <h3 className={cx(styles.emptyTitle)}>{CHAT_PANEL_COPY.emptyTitle}</h3>
        <p className={cx(styles.scopeText)}>{AI_CHAT_SCOPE_TEXT}</p>
        <ul className={cx(styles.suggestions)} aria-label={CHAT_PANEL_COPY.suggestionsLabel}>
          {SUGGESTED_QUESTIONS.map((question) => (
            <li key={question}>
              <Button variant="outlined" className={cx(styles.suggestion)} onClick={() => send(question)} disabled={session.isStreaming}>
                {question}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    );
  } else {
    body = (
      <MessageList label={CHAT_PANEL_COPY.threadLabel}>
        {messages.map((message, index) => (
          <ChatMessageView
            key={message.id}
            message={message}
            live={index === lastIndex && message.id.startsWith("local-")}
            onRetry={index === lastIndex && session.canRetry && message.status === "interrupted" ? () => void session.retry() : undefined}
            retryDisabled={session.isStreaming}
          />
        ))}
      </MessageList>
    );
  }

  return (
    <section className={cx(styles.panel, styles[variant], className)} aria-label={CHAT_PANEL_COPY.regionLabel}>
      <header className={cx(styles.header)}>
        <h2 className={cx(styles.title)}>{title}</h2>
        {headerActions ? <div className={cx(styles.headerActions)}>{headerActions}</div> : null}
      </header>
      <div className={cx(styles.threadArea)}>
        <div
          ref={threadRef}
          className={cx(styles.thread)}
          onScroll={onScroll}
          tabIndex={0}
          role="region"
          aria-label={CHAT_PANEL_COPY.threadLabel}
        >
          {body}
          {session.error ? <TurnError error={session.error} canRetry={session.canRetry} onRetry={() => void session.retry()} /> : null}
        </div>
        {!isPinned && messages.length > 0 ? (
          <Button
            variant="contained"
            size="small"
            className={cx(styles.scrollToEnd)}
            startIcon={<ArrowDownwardIcon />}
            onClick={scrollToBottom}
          >
            {CHAT_PANEL_COPY.scrollToEnd}
          </Button>
        ) : null}
      </div>
      <div className={cx(styles.composerArea)}>
        <Composer
          ref={composerRef}
          value={draft}
          onValueChange={setDraft}
          onSubmit={send}
          label={CHAT_PANEL_COPY.composerLabel}
          placeholder={CHAT_PANEL_COPY.composerPlaceholder}
          maxLength={AI_CHAT_MESSAGE_MAX_LENGTH}
          submitDisabled={blocked}
          isStreaming={session.isStreaming}
          onStop={session.stop}
        />
        <p className={cx(styles.disclaimer)}>{AI_CHAT_DISCLAIMER}</p>
      </div>
    </section>
  );
}
