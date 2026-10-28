/*
* Funcionalidad: DeepenPanel
* Descripción: Body of the deepen accordion at the end of each page ("Expansión de Tema con IA", July AITopicExpander texts). It asks the AI tutor to deepen the visible Page (POST /api/tutor/pages/{pageId}/deepen, SSE) with an optional question ("Tu pregunta"; left blank, the whole page is expanded); the answer renders progressively as markdown with "Consultando IA…" until the first fragment, "Detener" aborts it, and the shared "¿Te fue útil?" widget rates it (MESSAGE target with surface ACCORDION and scope PAGE) once it is done or stopped after some text. Follow-up questions continue the same page conversation and the thread of the current Page stays visible. Errors use the July texts (too many requests, offline, timeout, generic) with "Inténtalo de nuevo", which re-sends the failed turn. The thread is keyed by pageId by its parent. A prompt from the TutorAI suggestions arrives as `prefill`: it fills the question and focuses it, it is never sent by itself. Depends on MUI, @shared/ai-conversation (MessageList, MessageBubble, useTutorTurn), the tutor service, the AI error messages, TutorAnswer and the tutor CSS Module. v1.1 (L5 fix): a conversationId is adopted only from `done`. v1.2 (S2 ai-chat): shared thread and bubbles. v1.3 (W7, Bloque 2): it is the body of the deepen accordion (no longer a side panel tab), with the July texts, retry and rating of stopped answers; the stream runs on the shared useTutorTurn, which adopts the conversation and message ids from the early `start` frame, so a first answer stopped or failed after it started keeps its conversation for the next question.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ReplayIcon from "@mui/icons-material/Replay";
import SendIcon from "@mui/icons-material/Send";
import StopIcon from "@mui/icons-material/Stop";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { MessageBubble } from "@shared/ai-conversation/application/message-bubble";
import { MessageList } from "@shared/ai-conversation/application/message-list";
import { useTutorTurn } from "@shared/ai-conversation/application/use-tutor-turn";
import type { StreamingStatus } from "@shared/ai-conversation/application/use-streaming-response";
import { cx } from "@shared/lib/class-names";
import { deepenPageRequest } from "../../../api/services/tutor.service";
import { getDeepenErrorMessage } from "../../entities/ai-error-messages";
import { TutorAnswer } from "./tutor-answer";
import styles from "../../../UI/tutor-panel.module.css";

// Backend limit (ventylab-server ai-tutor-request.dto MAX_TUTOR_QUESTION_LENGTH).
export const DEEPEN_QUESTION_MAX = 1000;

// July ai.json topicExpander.panel. TODO(i18n): move to a learning namespace in src/i18n.
export const DEEPEN_COPY = {
  title: "Expansión de Tema con IA",
  question: "Tu pregunta",
  placeholder: "Escribe tu pregunta o deja en blanco para expandir automáticamente",
  submit: "Enviar",
  stop: "Detener",
  loading: "Consultando IA…",
  retry: "Inténtalo de nuevo",
  wholePage: "Expandir esta página",
  threadLabel: "Respuestas del tutor sobre esta página",
} as const;

type DeepenTurn = {
  id: number
  question: string | null
  answer: string
  status: StreamingStatus
  ratingId: string | null
};

export type DeepenPrefill = {
  id: number
  prompt: string
};

// `live` marks the turn of the running (or last) stream: its answer is announced by the StreamingMessage.
function TurnView({ turn, live }: { turn: DeepenTurn, live: boolean }) {
  return (
    <>
      <MessageBubble role="user" content={turn.question ?? DEEPEN_COPY.wholePage} />
      {turn.status === "error" && turn.answer === "" ? null : (
        <TutorAnswer
          text={turn.answer}
          live={live}
          isStreaming={turn.status === "streaming"}
          interruption={turn.status === "aborted" ? "stopped" : null}
          ratingTargetId={turn.ratingId}
          initialRating={null}
          ratingSurface="ACCORDION"
          ratingScope="PAGE"
          typingLabel={DEEPEN_COPY.loading}
        />
      )}
    </>
  );
}

export type DeepenPanelProps = {
  pageId: string
  // Prompt chosen in the TutorAI suggestions; a new id fills the question again.
  prefill?: DeepenPrefill | null
};

export function DeepenPanel({ pageId, prefill = null }: DeepenPanelProps) {
  const titleId = useId();
  const turn = useTutorTurn();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [question, setQuestion] = useState(prefill?.prompt ?? "");
  const [appliedPrefill, setAppliedPrefill] = useState(prefill?.id ?? null);
  // Finished turns of this Page; the running (or last) turn is built from the engine state.
  const [history, setHistory] = useState<DeepenTurn[]>([]);
  const [current, setCurrent] = useState<{ id: number, question: string | null } | null>(null);
  const isStreaming = turn.status === "streaming";
  const currentTurn: DeepenTurn | null = current
    ? { ...current, answer: turn.text, status: turn.status, ratingId: turn.ratableMessageId }
    : null;

  // A newer suggestion replaces the question (state update during render, applied once per id).
  if (prefill && prefill.id !== appliedPrefill) {
    setAppliedPrefill(prefill.id);
    setQuestion(prefill.prompt);
  }

  useEffect(() => {
    if (appliedPrefill !== null) {
      inputRef.current?.focus();
    }
  }, [appliedPrefill]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isStreaming) {
      return;
    }

    const asked = question.trim() === "" ? null : question.trim();

    // A failed turn without text is dropped; every other turn stays in the thread.
    if (currentTurn && !(currentTurn.status === "error" && currentTurn.answer === "")) {
      setHistory((turns) => [...turns, currentTurn]);
    }

    setCurrent({ id: (currentTurn?.id ?? 0) + 1, question: asked });
    setQuestion("");
    void turn.start((conversationId) => deepenPageRequest(pageId, { question: asked ?? undefined, conversationId }));
  };

  const turns = currentTurn ? [...history, currentTurn] : history;

  return (
    <section className={cx(styles.panel)} aria-labelledby={titleId}>
      <h3 id={titleId} className={cx(styles.panelTitle)}>{DEEPEN_COPY.title}</h3>
      {turns.length > 0 ? (
        <MessageList label={DEEPEN_COPY.threadLabel}>
          {turns.map((item) => <TurnView key={item.id} turn={item} live={item === currentTurn} />)}
        </MessageList>
      ) : null}
      {turn.status === "error" ? (
        <Alert
          severity="error"
          action={(
            <Button color="inherit" size="small" startIcon={<ReplayIcon />} onClick={() => void turn.retry()}>
              {DEEPEN_COPY.retry}
            </Button>
          )}
        >
          {getDeepenErrorMessage(turn.error)}
        </Alert>
      ) : null}
      <form className={cx(styles.form)} onSubmit={submit}>
        <TextField
          label={DEEPEN_COPY.question}
          placeholder={DEEPEN_COPY.placeholder}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          size="small"
          multiline
          minRows={2}
          maxRows={6}
          disabled={isStreaming}
          inputRef={inputRef}
          slotProps={{ htmlInput: { maxLength: DEEPEN_QUESTION_MAX } }}
        />
        <div className={cx(styles.actions)}>
          {isStreaming ? (
            <Button variant="outlined" color="inherit" startIcon={<StopIcon />} onClick={turn.stop}>
              {DEEPEN_COPY.stop}
            </Button>
          ) : null}
          <Button type="submit" variant="contained" startIcon={<SendIcon />} disabled={isStreaming}>
            {DEEPEN_COPY.submit}
          </Button>
        </div>
      </form>
    </section>
  );
}
