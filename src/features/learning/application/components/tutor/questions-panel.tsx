/*
* Funcionalidad: QuestionsPanel
* Descripción: "Preguntas" tab of the lesson viewer: a chat with the AI tutor about the lesson (default) or the whole module. The scope selector switches between LESSON (refId = lessonId) and MODULE (refId = moduleId); each scope reopens the caller's existing conversation (useScopeConversation, client-side refId lookup) and shows its history: student and tutor bubbles, tutor answers as markdown, a note on answers saved incomplete and the shared "¿Te fue útil?" widget per rateable answer (MESSAGE target = assistant message id). The first message starts the conversation (POST /api/tutor/conversations with scope, refId and currentPageId); later ones are sent to POST /api/tutor/conversations/{id}/messages; both stream the answer progressively (useAiStream) with a "Detener" button. After every stream the conversation is revalidated so the saved messages (including stopped, incomplete ones) replace the pending bubbles; an error before the stream gives the question back to the input. The thread is keyed by scope + refId, so switching scope, closing the panel or switching tab aborts the running answer. Depends on MUI, @shared/design-system, useAiStream, useScopeConversation, the tutor service, the AI error messages, TutorAnswer and the tutor CSS Module. v1.1 (L6 fix): "rejected before the stream" is decided by whether any frame was received (outcome.streamStarted), not by the HTTP status, so network failures (status 0: network.unavailable/timeout) also give the question back.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import SendIcon from "@mui/icons-material/Send";
import StopIcon from "@mui/icons-material/Stop";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useState } from "react";
import type { FormEvent } from "react";
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
  send: "Enviar",
  stop: "Detener",
} as const;

function MessageView({ message }: { message: ConversationMessage }) {
  if (message.role === "USER") {
    return <li className={cx(styles.turn)}><p className={cx(styles.bubble, styles.userBubble)}>{message.content}</p></li>;
  }

  return (
    <li className={cx(styles.turn)}>
      <TutorAnswer
        text={message.content}
        interruption={message.isIncomplete ? "incomplete" : null}
        ratingTargetId={canRateMessage(message) ? message.id : null}
      />
    </li>
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

  const send = async(event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSend) {
      return;
    }

    const message = draft.trim();
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
      <ul className={cx(styles.thread)} aria-label={COPY.threadLabel} aria-live="polite">
        {messages.map((message) => <MessageView key={message.id} message={message} />)}
        {pending === null ? null : (
          <li className={cx(styles.turn)}>
            <p className={cx(styles.bubble, styles.userBubble)}>{pending}</p>
            {stream.status === "error" && stream.text === "" ? null : (
              <TutorAnswer text={stream.text} isStreaming={isStreaming} interruption={stream.status === "aborted" ? "stopped" : null} />
            )}
          </li>
        )}
      </ul>
    );
  };

  return (
    <>
      {renderThread()}
      {stream.status === "error" ? <Alert severity="error">{getAiErrorMessage(stream.error)}</Alert> : null}
      <form className={cx(styles.form)} onSubmit={(event) => void send(event)}>
        <TextField
          label={COPY.message}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          size="small"
          multiline
          maxRows={6}
          disabled={messages === null}
          slotProps={{ htmlInput: { maxLength: QUESTION_MESSAGE_MAX } }}
        />
        <div className={cx(styles.actions)}>
          {isStreaming ? (
            <Button variant="outlined" color="inherit" startIcon={<StopIcon />} onClick={stream.stop}>
              {COPY.stop}
            </Button>
          ) : null}
          <Button type="submit" variant="contained" endIcon={<SendIcon />} disabled={!canSend}>
            {COPY.send}
          </Button>
        </div>
      </form>
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
