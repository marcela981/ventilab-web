/*
* Funcionalidad: QuestionsPanel
* Descripción: "Preguntas" tab of the TutorAI popup: a chat with the AI tutor about the lesson (default) or the whole module. The scope selector switches between LESSON (refId = lessonId) and MODULE (refId = moduleId); each scope reopens the caller's existing conversation (useScopeConversation, client-side refId lookup) and shows its history: student and tutor bubbles, tutor answers as markdown, a note on answers saved incomplete and the shared "¿Te fue útil?" widget per rateable answer (MESSAGE target = assistant message id, surface POPUP, scope of the conversation). The first message starts the conversation (POST /api/tutor/conversations with scope, refId and currentPageId); later ones are sent to POST /api/tutor/conversations/{id}/messages; both stream the answer progressively with "Detener". After every stream the conversation is revalidated so the saved messages (including stopped, incomplete ones) replace the pending bubbles; an error before the stream gives the question back to the input. "Abrir en el asistente" opens the conversation in /assistant/[id] (disabled until its id is known). The thread is keyed by scope + refId, so switching scope or closing the popup aborts the running answer. Depends on MUI, next/router, @shared/design-system, @shared/ai-conversation (MessageList, MessageBubble, Composer, useTutorTurn), the ai-chat routes entry, useScopeConversation, useTutorPromptRequest, the tutor service, the AI error messages, TutorAnswer and the tutor CSS Module. v1.1 (L6 fix): "rejected before the stream" is decided by outcome.streamStarted. v1.2 (S2 ai-chat): shared thread, bubbles and Composer. v1.3 (W7, Bloque 2): it lives in the TutorAI popup. The stream runs on the shared useTutorTurn (the conversation id of a first message is adopted from the early `start` frame, so even a stopped first answer opens the right conversation); a failed answer offers "Reintentar" (re-sends the last message); ratings send surface POPUP and the conversation scope; "Abrir en el asistente"; a TutorAI suggestion for the questions target prefills the message.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ReplayIcon from "@mui/icons-material/Replay";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useRouter } from "next/router";
import { Fragment, useEffect, useState } from "react";
import { Composer } from "@shared/ai-conversation/application/composer";
import { MessageBubble } from "@shared/ai-conversation/application/message-bubble";
import { MessageList } from "@shared/ai-conversation/application/message-list";
import { useTutorTurn } from "@shared/ai-conversation/application/use-tutor-turn";
import type { TutorTurnOutcome } from "@shared/ai-conversation/application/use-tutor-turn";
import { ErrorState } from "@shared/design-system/components/error-state";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { buildConversationUrl } from "@features/ai-chat/routes.entry";
import { sendMessageRequest, startConversationRequest } from "../../../api/services/tutor.service";
import { getAiErrorMessage } from "../../entities/ai-error-messages";
import { getLearningErrorMessage } from "../../entities/learning-error-messages";
import { canRateMessage } from "../../entities/tutor.entity";
import type { ConversationMessage, QuestionScope } from "../../entities/tutor.entity";
import { useScopeConversation } from "../../hooks/use-scope-conversation";
import { useTutorPromptRequest } from "../../hooks/use-tutor-prompt";
import { TutorAnswer } from "./tutor-answer";
import styles from "../../../UI/tutor-panel.module.css";

// Backend limit (ventylab-server ai-tutor-request.dto MAX_TUTOR_MESSAGE_LENGTH).
export const QUESTION_MESSAGE_MAX = 4000;

// TODO(i18n): move to a learning namespace in src/i18n.
export const QUESTIONS_COPY = {
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
  retry: "Reintentar",
  openInAssistant: "Abrir en el asistente",
} as const;

function MessageView({ message, scope }: { message: ConversationMessage, scope: QuestionScope }) {
  if (message.role === "USER") {
    return <MessageBubble role="user" content={message.content} />;
  }

  return (
    <TutorAnswer
      text={message.content}
      interruption={message.isIncomplete ? "incomplete" : null}
      ratingTargetId={canRateMessage(message) ? message.id : null}
      ratingSurface="POPUP"
      ratingScope={scope}
    />
  );
}

type ConversationThreadProps = {
  scope: QuestionScope
  refId: string
  currentPageId: string | null
};

function ConversationThread({ scope, refId, currentPageId }: ConversationThreadProps) {
  const router = useRouter();
  const conversation = useScopeConversation(scope, refId);
  const turn = useTutorTurn();
  const { request: prefill, consume } = useTutorPromptRequest("questions");
  const [draft, setDraft] = useState(prefill?.prompt ?? "");
  const [appliedPrefill, setAppliedPrefill] = useState(prefill?.id ?? null);
  // Question whose answer is streaming (or was just streamed) until the saved conversation replaces it.
  const [pending, setPending] = useState<string | null>(null);
  // Last message sent, re-sent by "Reintentar".
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const isStreaming = turn.status === "streaming";
  const { messages } = conversation;
  const canSend = messages !== null && !isStreaming && pending === null && draft.trim() !== "";
  const conversationId = conversation.conversationId ?? turn.conversationId;

  // A TutorAI suggestion fills the message (state update during render, once per request id).
  if (prefill && prefill.id !== appliedPrefill) {
    setAppliedPrefill(prefill.id);
    setDraft(prefill.prompt);
  }

  useEffect(() => {
    if (prefill) {
      consume(prefill.id);
    }
  }, [prefill, consume]);

  const settle = async(message: string, outcome: TutorTurnOutcome) => {
    if (outcome.status === "error" && !outcome.streamStarted) {
      // Rejected before the stream started: nothing was saved, give the question back.
      setDraft((current) => (current === "" ? message : current));
      setPending(null);

      return;
    }

    if (!conversation.conversationId && outcome.conversationId) {
      await conversation.adopt(outcome.conversationId);
    } else {
      await conversation.refresh();
    }

    setPending(null);
  };

  // Receives the trimmed message from the Composer, which only submits while canSend holds.
  const send = async(message: string) => {
    if (!canSend) {
      return;
    }

    const knownId = conversation.conversationId;

    setLastMessage(message);
    setDraft("");
    setPending(message);

    const outcome = await turn.start((adoptedId) => {
      const id = knownId ?? adoptedId;

      return id
        ? sendMessageRequest(id, { message, currentPageId })
        : startConversationRequest({ scope, refId, message, currentPageId });
    });

    await settle(message, outcome);
  };

  const retry = async() => {
    const message = lastMessage;

    if (message === null || isStreaming) {
      return;
    }

    setDraft((current) => (current === message ? "" : current));
    setPending(message);

    const outcome = await turn.retry();

    if (outcome) {
      await settle(message, outcome);
    }
  };

  const renderThread = () => {
    if (messages === null) {
      return conversation.error
        ? <ErrorState title={QUESTIONS_COPY.loadErrorTitle} description={getLearningErrorMessage(conversation.error)} onRetry={() => void conversation.reload()} />
        : <ListSkeleton label={QUESTIONS_COPY.loading} />;
    }

    if (messages.length === 0 && pending === null) {
      return <p className={cx(styles.hint)}>{QUESTIONS_COPY.empty[scope]}</p>;
    }

    return (
      <MessageList label={QUESTIONS_COPY.threadLabel}>
        {messages.map((message) => <MessageView key={message.id} message={message} scope={scope} />)}
        {pending === null ? null : (
          <Fragment key="pending">
            <MessageBubble role="user" content={pending} />
            {turn.status === "error" && turn.text === "" ? null : (
              <TutorAnswer text={turn.text} live isStreaming={isStreaming} interruption={turn.status === "aborted" ? "stopped" : null} />
            )}
          </Fragment>
        )}
      </MessageList>
    );
  };

  return (
    <>
      <div className={cx(styles.threadActions)}>
        <Button
          size="small"
          startIcon={<OpenInNewIcon />}
          disabled={conversationId === null}
          onClick={() => {
            if (conversationId) {
              void router.push(buildConversationUrl(conversationId));
            }
          }}
        >
          {QUESTIONS_COPY.openInAssistant}
        </Button>
      </div>
      {renderThread()}
      {turn.status === "error" ? (
        <Alert
          severity="error"
          action={turn.canRetry && lastMessage !== null ? (
            <Button color="inherit" size="small" startIcon={<ReplayIcon />} onClick={() => void retry()}>
              {QUESTIONS_COPY.retry}
            </Button>
          ) : undefined}
        >
          {getAiErrorMessage(turn.error)}
        </Alert>
      ) : null}
      <Composer
        label={QUESTIONS_COPY.message}
        value={draft}
        onValueChange={setDraft}
        onSubmit={(message) => void send(message)}
        maxLength={QUESTION_MESSAGE_MAX}
        maxRows={6}
        disabled={messages === null}
        submitDisabled={pending !== null}
        isStreaming={isStreaming}
        onStop={turn.stop}
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
          aria-label={QUESTIONS_COPY.scopeLabel}
          onChange={(_, value: QuestionScope | null) => {
            if (value) {
              setScope(value);
            }
          }}
        >
          <ToggleButton value="LESSON">{QUESTIONS_COPY.lesson}</ToggleButton>
          <ToggleButton value="MODULE">{QUESTIONS_COPY.module}</ToggleButton>
        </ToggleButtonGroup>
      </div>
      <ConversationThread key={`${scope}:${refId}`} scope={scope} refId={refId} currentPageId={currentPageId} />
    </div>
  );
}
