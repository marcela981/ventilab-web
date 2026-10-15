/*
* Funcionalidad: DeepenPanel
* Descripción: "Profundizar" tab of the lesson viewer. "¿Deseas profundizar en el tema?" asks the AI tutor to deepen the visible Page (POST /api/tutor/pages/{pageId}/deepen, SSE) with an optional question; the answer renders progressively as markdown, "Detener" aborts it, and when it is done the shared "¿Te fue útil?" widget rates it (MESSAGE target = returned messageId). Follow-up questions reuse the returned conversationId and the thread of the current Page stays visible. The thread is keyed by pageId: changing page (and closing the panel or switching tab, which unmount it) aborts the running answer and starts a fresh thread. Errors use the shared AI messages (quota with the local reset time, provider unavailable, unpublished page, interrupted stream). Depends on MUI, useAiStream, the tutor service, the AI error messages, TutorAnswer and the tutor CSS Module. v1.1 (L5 fix, documented): a conversationId is adopted only from `done`; the backend tutor SSE (ventylab-server tutor-sse.ts) sends conversationId only in the `done` frame (delta = {text}, error = {code, message}), so a first answer stopped or failed after the stream started has no id to adopt and the next question starts a new conversation (BACKEND GAP). The id of an earlier finished answer survives later failures.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import StopIcon from "@mui/icons-material/Stop";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import type { FormEvent } from "react";
import { cx } from "@shared/lib/class-names";
import { deepenPageRequest } from "../../../api/services/tutor.service";
import { AI_ERROR_MESSAGES, getAiErrorMessage } from "../../entities/ai-error-messages";
import { useAiStream } from "../../hooks/use-ai-stream";
import type { AiStreamStatus } from "../../hooks/use-ai-stream";
import { TutorAnswer } from "./tutor-answer";
import styles from "../../../UI/tutor-panel.module.css";

// Backend limit (ventylab-server ai-tutor-request.dto MAX_TUTOR_QUESTION_LENGTH).
export const DEEPEN_QUESTION_MAX = 1000;

// TODO(i18n): move to a learning namespace in src/i18n.
const COPY = {
  intro: "El tutor de IA explica esta página con más detalle o responde una pregunta sobre ella.",
  noPage: "Abre una página de la lección para profundizar en ella.",
  question: "Tu pregunta (opcional)",
  deepen: "¿Deseas profundizar en el tema?",
  stop: "Detener",
  wholePage: "Profundizar en esta página",
  threadLabel: "Respuestas del tutor sobre esta página",
} as const;

type DeepenTurn = {
  id: number
  question: string | null
  answer: string
  status: AiStreamStatus
  messageId: string | null
};

function TurnView({ turn, error }: { turn: DeepenTurn, error: unknown }) {
  return (
    <li className={cx(styles.turn)}>
      <p className={cx(styles.bubble, styles.userBubble)}>{turn.question ?? COPY.wholePage}</p>
      {turn.status === "error" && turn.answer === "" ? null : (
        <TutorAnswer
          text={turn.answer}
          isStreaming={turn.status === "streaming"}
          interruption={turn.status === "aborted" ? "stopped" : null}
          ratingTargetId={turn.status === "done" ? turn.messageId : null}
          initialRating={null}
        />
      )}
      {turn.status === "error" ? <Alert severity="error">{getAiErrorMessage(error, { notFound: AI_ERROR_MESSAGES.pageNotPublished })}</Alert> : null}
    </li>
  );
}

function DeepenThread({ pageId }: { pageId: string }) {
  const stream = useAiStream();
  const [question, setQuestion] = useState("");
  // Finished turns of this Page; the running (or last) turn is built from the stream state.
  const [history, setHistory] = useState<DeepenTurn[]>([]);
  const [current, setCurrent] = useState<{ id: number, question: string | null } | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const isStreaming = stream.status === "streaming";
  const currentTurn: DeepenTurn | null = current
    ? { ...current, answer: stream.text, status: stream.status, messageId: stream.done?.messageId ?? null }
    : null;

  const submit = async(event: FormEvent<HTMLFormElement>) => {
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

    const outcome = await stream.start(deepenPageRequest(pageId, { question: asked ?? undefined, conversationId }));

    // Only `done` carries conversationId (backend SSE contract); stopped or failed answers keep the current one.
    if (outcome.status === "done") {
      setConversationId(outcome.done.conversationId);
    }
  };

  const turns = currentTurn ? [...history, currentTurn] : history;

  return (
    <div className={cx(styles.panel)}>
      <p className={cx(styles.intro)}>{COPY.intro}</p>
      {turns.length > 0 ? (
        <ul className={cx(styles.thread)} aria-label={COPY.threadLabel} aria-live="polite">
          {turns.map((turn) => <TurnView key={turn.id} turn={turn} error={turn === currentTurn ? stream.error : null} />)}
        </ul>
      ) : null}
      <form className={cx(styles.form)} onSubmit={(event) => void submit(event)}>
        <TextField
          label={COPY.question}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          size="small"
          multiline
          maxRows={4}
          disabled={isStreaming}
          slotProps={{ htmlInput: { maxLength: DEEPEN_QUESTION_MAX } }}
        />
        <div className={cx(styles.actions)}>
          {isStreaming ? (
            <Button variant="outlined" color="inherit" startIcon={<StopIcon />} onClick={stream.stop}>
              {COPY.stop}
            </Button>
          ) : null}
          <Button type="submit" variant="contained" startIcon={<AutoAwesomeIcon />} disabled={isStreaming}>
            {COPY.deepen}
          </Button>
        </div>
      </form>
    </div>
  );
}

export type DeepenPanelProps = {
  // Page shown in the viewer; null while it loads or when the lesson has no Pages.
  pageId: string | null
};

export function DeepenPanel({ pageId }: DeepenPanelProps) {
  if (!pageId) {
    return <p className={cx(styles.hint)}>{COPY.noPage}</p>;
  }

  return <DeepenThread key={pageId} pageId={pageId} />;
}
