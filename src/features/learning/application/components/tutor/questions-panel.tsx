/*
* Funcionalidad: QuestionsPanel
* Descripción: "Preguntas" tab of the lesson viewer: a chat with the AI tutor about the lesson (default) or the whole module. The scope selector switches between LESSON (refId = lessonId) and MODULE (refId = moduleId); each scope reopens the caller's existing conversation (useScopeConversation, client-side refId lookup) and shows its history: student and tutor bubbles, tutor answers as markdown, a note on answers saved incomplete and the shared "¿Te fue útil?" widget per rateable answer (MESSAGE target = assistant message id). The first message starts the conversation (POST /api/tutor/conversations with scope, refId and currentPageId); later ones are sent to POST /api/tutor/conversations/{id}/messages; both stream the answer progressively (useAiStream) with a "Detener" button. After every stream the conversation is revalidated so the saved messages (including stopped, incomplete ones) replace the pending bubbles; an error before the stream gives the question back to the input. The thread is keyed by scope + refId, so switching scope, closing the panel or switching tab aborts the running answer. Depends on MUI, @shared/design-system, @shared/ai-conversation (MessageList, MessageBubble, Composer), useAiStream, useScopeConversation, the tutor service, the AI error messages, TutorAnswer and the tutor CSS Module. v1.1 (L6 fix): "rejected before the stream" is decided by whether any frame was received (outcome.streamStarted), not by the HTTP status, so network failures (status 0: network.unavailable/timeout) also give the question back. v1.2 (S2 ai-chat): the thread, bubbles and question form use the shared @shared/ai-conversation pieces (same labels, 4000-character limit, Enviar/Detener); only the streamed answer is announced (StreamingMessage fragments), the list itself is no longer aria-live. The Composer keeps the previous form behaviour: Enter inserts a new line (only Enviar sends) and no character counter is shown.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { Fragment, useState } from "react";
import { Composer } from "@shared/ai-conversation/application/composer";
import { MessageBubble } from "@shared/ai-conversation/application/message-bubble";
import { MessageList } from "@shared/ai-conversation/application/message-list";
import { ErrorState } from "@shared/design-system/components/error-state";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { sendMessageRequest, startConversationRequest } from "../../../api/services/tutor.service";
import { getAiErrorMessage } from "../../entities/ai-error-messages";
import { getLearningErrorMessage } from "../../entities/learning-error-messages";
import { canRateMessage } from "../../entities/tutor.entity";
import type { ConversationMessage, QuestionScope } from "../../entities/tutor.entity";
import { useAiStream } from "../../hooks/use-ai-stream";
import { useScopeConversation } from "../../hooks/use-scope-conversation";
import { TutorAnswer } from "./tutor-answer";
import styles from "../../../UI/tutor-panel.module.css";

// Backend limit (ventylab-server ai-tutor-request.dto MAX_TUTOR_MESSAGE_LENGTH).
export const QUESTION_MESSAGE_MAX = 4000;

// TODO(i18n): move to a learning namespace in src/i18n.
const COPY = {
  scopeLabel: "Preguntar sobre",
  lesson: "Esta lección",
  module: "Este módulo",
  loading: "Cargando la conversación…",
  loadErrorTitle: "No se pudo cargar la conversación",
  empty: {
    LESSON: "Pregunta al tutor de IA lo que quieras sobre esta lección.",
    MODULE: "Pregunta al tutor de IA lo que quieras sobre este módulo.",
  },
  threadLabel: "Conversación con el tutor",
  message: "Tu pregunta",
} as const;

function MessageView({ message }: { message: ConversationMessage }) {
  if (message.role === "USER") {
    return <MessageBubble role="user" content={message.content} />;
  }

  return (
    <TutorAnswer
      text={message.content}
      interruption={message.isIncomplete ? "incomplete" : null}
      ratingTargetId={canRateMessage(message) ? message.id : null}
    />
  );
}

type ConversationThreadProps = {
  scope: QuestionScope
  refId: string
  currentPageId: string | null
};

function ConversationThread({ scope, refId, currentPageId }: ConversationThreadProps) {
  const conversation = useScopeConversation(scope, refId);
  const stream = useAiStream();
  const [draft, setDraft] = useState("");
  // Question whose answer is streaming (or was just streamed) until the saved conversation replaces it.
  const [pending, setPending] = useState<string | null>(null);
  const isStreaming = stream.status === "streaming";
  const { messages } = conversation;
  const canSend = messages !== null && !isStreaming && pending === null && draft.trim() !== "";

  // Receives the trimmed message from the Composer, which only submits while canSend holds.
  const send = async(message: string) => {
    if (!canSend) {
      return;
    }

    const existingId = conversation.conversationId;

    setDraft("");
    setPending(message);

    const outcome = await stream.start(existingId
      ? sendMessageRequest(existingId, { message, currentPageId })
      : startConversationRequest({ scope, refId, message, currentPageId }));

    if (outcome.status === "error" && !outcome.streamStarted) {
      // Rejected before the stream started: nothing was saved, give the question back.
      setDraft((current) => (current === "" ? message : current));
      setPending(null);

      return;
    }

    if (outcome.status === "done" && !existingId) {
      await conversation.adopt(outcome.done.conversationId);
    } else {
      await conversation.refresh();
    }

    setPending(null);
  };

  const renderThread = () => {
    if (messages === null) {
      return conversation.error
        ? <ErrorState title={COPY.loadErrorTitle} description={getLearningErrorMessage(conversation.error)} onRetry={() => void conversation.reload()} />
        : <ListSkeleton label={COPY.loading} />;
    }

    if (messages.length === 0 && pending === null) {
      return <p className={cx(styles.hint)}>{COPY.empty[scope]}</p>;
    }

    return (
      <MessageList label={COPY.threadLabel}>
        {messages.map((message) => <MessageView key={message.id} message={message} />)}
        {pending === null ? null : (
          <Fragment key="pending">
            <MessageBubble role="user" content={pending} />
            {stream.status === "error" && stream.text === "" ? null : (
              <TutorAnswer text={stream.text} live isStreaming={isStreaming} interruption={stream.status === "aborted" ? "stopped" : null} />
            )}
          </Fragment>
        )}
      </MessageList>
    );
  };

  return (
    <>
      {renderThread()}
      {stream.status === "error" ? <Alert severity="error">{getAiErrorMessage(stream.error)}</Alert> : null}
      <Composer
        label={COPY.message}
        value={draft}
        onValueChange={setDraft}
        onSubmit={(message) => void send(message)}
        maxLength={QUESTION_MESSAGE_MAX}
        maxRows={6}
        disabled={messages === null}
        submitDisabled={pending !== null}
        isStreaming={isStreaming}
        onStop={stream.stop}
        submitOnEnter={false}
        showCounter={false}
      />
    </>
  );
}

export type QuestionsPanelProps = {
  moduleId: string
  lessonId: string
  // Page shown in the viewer; sent as currentPageId so the tutor prioritizes it.
  currentPageId: string | null
};

export function QuestionsPanel({ moduleId, lessonId, currentPageId }: QuestionsPanelProps) {
  const [scope, setScope] = useState<QuestionScope>("LESSON");
  const refId = scope === "LESSON" ? lessonId : moduleId;

  return (
    <div className={cx(styles.panel)}>
      <div className={cx(styles.scope)}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={scope}
          aria-label={COPY.scopeLabel}
          onChange={(_, value: QuestionScope | null) => {
            if (value) {
              setScope(value);
            }
          }}
        >
          <ToggleButton value="LESSON">{COPY.lesson}</ToggleButton>
          <ToggleButton value="MODULE">{COPY.module}</ToggleButton>
        </ToggleButtonGroup>
      </div>
      <ConversationThread key={`${scope}:${refId}`} scope={scope} refId={refId} currentPageId={currentPageId} />
    </div>
  );
}
