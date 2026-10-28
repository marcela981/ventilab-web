/*
* Funcionalidad: ChatMessageView
* Descripción: One message of the AI assistant thread. A user message is a plain bubble. An off-topic reply (the fixed backend text) is an informational notice (role note, info styling, never an error) that explains the assistant only covers medicine and the respiratory system. Any other assistant answer renders through the shared StreamingMessage with ONE element tree for live and stored answers (the live region is dropped with `announce`, so the rating widget in the footer is not remounted): while streaming it shows the typing indicator and the growing text; once complete it gets "Copiar", its sources (SourceCitations, only when present) and the "¿Te fue útil?" widget (target MESSAGE with the server message id, only for answers produced by an AI call); an interrupted answer shows "Respuesta interrumpida" and, for the last turn, "Reintentar". Depends on MUI, @shared/ai-conversation, @shared/ai-rating, the AI chat entity, CopyMessageButton and the chat panel CSS Module. v1.1 (W7, Bloque 2): the rating sends surface ASSISTANT (no scope: the backend derives it from the conversation, so LESSON/MODULE/PAGE conversations opened here never answer 422) and an interrupted answer with text and a message id can be rated too.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ReplayIcon from "@mui/icons-material/Replay";
import Button from "@mui/material/Button";
import { MessageBubble, SourceCitations, StreamingMessage } from "@shared/ai-conversation";
import { AiRatingWidget } from "@shared/ai-rating";
import { cx } from "@shared/lib/class-names";
import type { ChatMessage } from "../entities/ai-chat.entity";
import { CopyMessageButton } from "./copy-message-button";
import styles from "../../UI/chat-panel.module.css";

// TODO(i18n): move to an ai-chat namespace in src/i18n.
export const CHAT_MESSAGE_COPY = {
  thinking: "Pensando…",
  interrupted: "Respuesta interrumpida",
  retry: "Reintentar",
  offTopicTitle: "Fuera del alcance del asistente",
  offTopicHint: "El asistente solo responde preguntas de medicina y del sistema respiratorio, en especial ventilación mecánica.",
} as const;

export type ChatMessageViewProps = {
  message: ChatMessage
  // The answer of the turn sent in this session: announced to screen readers while it streams.
  live?: boolean
  // Shows "Reintentar" on an interrupted answer (only the last turn can be retried).
  onRetry?: (() => void) | undefined
  retryDisabled?: boolean
};

export function ChatMessageView({ message, live = false, onRetry, retryDisabled = false }: ChatMessageViewProps) {
  if (message.role === "user") {
    return <MessageBubble role="user" content={message.content} />;
  }

  if (message.kind === "off-topic" && message.status === "complete") {
    return (
      <div className={cx(styles.offTopic)} role="note" aria-label={CHAT_MESSAGE_COPY.offTopicTitle}>
        <InfoOutlinedIcon className={cx(styles.offTopicIcon)} aria-hidden="true" />
        <div className={cx(styles.offTopicBody)}>
          <p className={cx(styles.offTopicTitle)}>{CHAT_MESSAGE_COPY.offTopicTitle}</p>
          <p className={cx(styles.offTopicText)}>{message.content}</p>
          <p className={cx(styles.offTopicHint)}>{CHAT_MESSAGE_COPY.offTopicHint}</p>
        </div>
      </div>
    );
  }

  const isComplete = message.status === "complete";
  const isInterrupted = message.status === "interrupted";
  // A complete AI answer, or an interrupted one with text (the backend stores the received part and rates it).
  const canRate = message.messageId !== null
    && ((isComplete && message.aiCallId !== null) || (isInterrupted && message.content.trim() !== ""));
  const footer = isInterrupted || isComplete ? (
    <>
      {isInterrupted ? (
        <div className={cx(styles.interrupted)}>
          <p className={cx(styles.note)}>{CHAT_MESSAGE_COPY.interrupted}</p>
          {onRetry ? (
            <Button size="small" variant="outlined" startIcon={<ReplayIcon />} onClick={onRetry} disabled={retryDisabled}>
              {CHAT_MESSAGE_COPY.retry}
            </Button>
          ) : null}
        </div>
      ) : null}
      {isComplete ? <SourceCitations sources={message.sources} /> : null}
      {canRate && message.messageId ? (
        <AiRatingWidget key={message.messageId} targetType="MESSAGE" targetId={message.messageId} surface="ASSISTANT" />
      ) : null}
    </>
  ) : undefined;

  return (
    <StreamingMessage
      text={message.content}
      isStreaming={message.status === "streaming"}
      announce={live}
      typingLabel={CHAT_MESSAGE_COPY.thinking}
      {...(isComplete && message.content !== "" ? { actions: <CopyMessageButton text={message.content} /> } : {})}
      {...(footer === undefined ? {} : { footer })}
    />
  );
}
