/*
* Funcionalidad: Simulator AI assist panel
* Descripción: Collapsible side panel of the running console (T7, loaded on demand by the assist launcher, so the AI
*   pieces stay out of the console chunk). An optional question (limit of SimulationAssistDTO with the AI chat counter
*   rule) and "Solicitar asesoría" stream POST /simulation/sessions/{id}/assist through the shared useStreamingResponse:
*   the answer renders as it arrives in the shared StreamingMessage (safe markdown, live region), "Detener" aborts it
*   (the backend then records no AI_HELP event). After `done` the answer moves to the list of this session's answers
*   with the shared "¿Te fue útil?" rating (targetType SIM_ASSIST, targetId aiHelpEventId). With a penalty policy a
*   confirmation stating the penalty is shown before every request. Errors use the shared AI messages (quota with its
*   reset time, provider unavailable, interrupted, failed) through getAssistErrorMessage. The request never pauses the
*   simulation; unmounting the panel (closed, session ended) aborts the stream. Depends on React, MUI,
*   @shared/ai-conversation, @shared/ai-rating, the design-system confirm dialog, the assist service, config and
*   entities, and the panel CSS Module. v1.1 (review of bc8a596): a request that fails before the stream starts gives
*   the typed question back to the field.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import CloseIcon from "@mui/icons-material/Close";
import StopIcon from "@mui/icons-material/Stop";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import { useEffect, useId, useState } from "react";
import type { FormEvent } from "react";
import {
  AI_ERROR_CODES,
  COMPOSER_COPY,
  isNearLimit,
  MessageBubble,
  MessageList,
  StreamingMessage,
  useStreamingResponse,
} from "@shared/ai-conversation";
import { AiRatingWidget } from "@shared/ai-rating";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { cx } from "@shared/lib/class-names";
import { assistStreamRequest } from "../../api/services/simulation-assist.service";
import { ASSIST_QUESTION_MAX_LENGTH, ASSIST_RATING_TARGET_TYPE } from "../config/sim-assist.config";
import { getAssistErrorMessage } from "../entities/assist-error-messages";
import { isAssistDone } from "../entities/sim-assist.entity";
import type { AssistPolicy, AssistStreamDone, AssistTurn } from "../entities/sim-assist.entity";
import styles from "../../UI/assist-panel.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const ASSIST_PANEL_COPY = {
  title: "Asesoría IA",
  close: "Cerrar asesoría",
  intro: "La asesoría revisa el estado actual de tu simulación. Puedes escribir una pregunta concreta o dejarla vacía. La simulación sigue corriendo mientras respondo.",
  question: "Pregunta (opcional)",
  request: "Solicitar asesoría",
  answers: "Asesorías de esta sesión",
  typing: "Analizando la simulación…",
  stopped: "Respuesta detenida. No se registró esta asesoría.",
  confirmTitle: "¿Solicitar asesoría con penalización?",
  confirmCancel: "Cancelar",
} as const;

export type AssistPanelProps = {
  id?: string | undefined
  sessionId: string
  /** Only allowed or penalty policies open the panel. */
  policy: Exclude<AssistPolicy, { status: "disabled" }>
  /** Answers of this session, kept by the launcher so they survive closing the panel. */
  history: readonly AssistTurn[]
  onAnswered: (turn: AssistTurn) => void
  onClose: () => void
};

function AnswerView({ turn }: { turn: AssistTurn }) {
  return (
    <div className={cx(styles.turn)}>
      {turn.question === "" ? null : <MessageBubble role="user" content={turn.question} />}
      <StreamingMessage
        text={turn.answer}
        isStreaming={false}
        announce={false}
        footer={<AiRatingWidget targetType={ASSIST_RATING_TARGET_TYPE} targetId={turn.aiHelpEventId} />}
      />
    </div>
  );
}

export function AssistPanel({ id, sessionId, policy, history, onAnswered, onClose }: AssistPanelProps) {
  const stream = useStreamingResponse<AssistStreamDone>();
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [confirming, setConfirming] = useState(false);
  const titleId = useId();
  const counterId = useId();
  const isStreaming = stream.status === "streaming";
  const showCounter = isNearLimit(question.length, ASSIST_QUESTION_MAX_LENGTH);
  const done = stream.status === "done" && isAssistDone(stream.done) ? stream.done : null;
  const recorded = done !== null && history.some((turn) => turn.aiHelpEventId === done.aiHelpEventId);

  // A finished answer joins the session list (owned by the launcher) with the text the stream ended with.
  useEffect(() => {
    if (done !== null && !recorded) {
      onAnswered({ aiHelpEventId: done.aiHelpEventId, aiCallId: done.aiCallId, source: done.source, question: asked, answer: stream.text });
    }
  }, [asked, done, onAnswered, recorded, stream.text]);

  const send = () => {
    const typed = question;

    setConfirming(false);
    setAsked(typed.trim());
    setQuestion("");
    void stream.start(assistStreamRequest(sessionId, typed)).then((outcome) => {
      // Refused before any frame (quota, provider down, network): give the question back, unless a new one was typed.
      if (outcome.status === "error" && !outcome.streamStarted) {
        setQuestion((current) => (current === "" ? typed : current));
      }
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isStreaming) {
      return;
    }

    if (policy.status === "penalty") {
      setConfirming(true);
    } else {
      send();
    }
  };

  const showCurrent = stream.status !== "idle" && !recorded;
  const error = stream.status === "error" && stream.error ? stream.error : null;

  return (
    <aside id={id} className={cx(styles.panel)} aria-labelledby={titleId}>
      <header className={cx(styles.header)}>
        <h2 id={titleId} className={cx(styles.title)}>{ASSIST_PANEL_COPY.title}</h2>
        <IconButton aria-label={ASSIST_PANEL_COPY.close} onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </header>
      <div className={cx(styles.body)}>
        <p className={cx(styles.intro)}>{ASSIST_PANEL_COPY.intro}</p>
        {policy.status === "penalty" ? <Alert severity="warning">{policy.message}</Alert> : null}
        {history.length > 0 ? (
          <MessageList label={ASSIST_PANEL_COPY.answers}>
            {history.map((turn) => <AnswerView key={turn.aiHelpEventId} turn={turn} />)}
          </MessageList>
        ) : null}
        {showCurrent ? (
          <div className={cx(styles.turn)}>
            {asked === "" ? null : <MessageBubble role="user" content={asked} />}
            {stream.status === "error" && stream.text === "" ? null : (
              <StreamingMessage text={stream.text} isStreaming={isStreaming} typingLabel={ASSIST_PANEL_COPY.typing} />
            )}
            {stream.status === "aborted" ? <p className={cx(styles.note)} role="status">{ASSIST_PANEL_COPY.stopped}</p> : null}
          </div>
        ) : null}
        {error ? (
          <Alert severity={error.code === AI_ERROR_CODES.quotaExceeded ? "warning" : "error"} className={cx(styles.error)}>
            {getAssistErrorMessage(error)}
          </Alert>
        ) : null}
      </div>
      <form className={cx(styles.form)} onSubmit={submit}>
        <TextField
          label={ASSIST_PANEL_COPY.question}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          size="small"
          multiline
          minRows={2}
          maxRows={5}
          disabled={isStreaming}
          slotProps={{ htmlInput: { maxLength: ASSIST_QUESTION_MAX_LENGTH, ...(showCounter ? { "aria-describedby": counterId } : {}) } }}
        />
        <div className={cx(styles.formFooter)}>
          {showCounter ? <p id={counterId} className={cx(styles.counter)}>{`${question.length} / ${ASSIST_QUESTION_MAX_LENGTH}`}</p> : null}
          <div className={cx(styles.actions)}>
            {isStreaming ? (
              <Button variant="outlined" color="inherit" startIcon={<StopIcon />} onClick={stream.abort}>
                {COMPOSER_COPY.stop}
              </Button>
            ) : null}
            <Button type="submit" variant="contained" disabled={isStreaming}>
              {ASSIST_PANEL_COPY.request}
            </Button>
          </div>
        </div>
      </form>
      {policy.status === "penalty" ? (
        <ConfirmDialog
          open={confirming}
          title={ASSIST_PANEL_COPY.confirmTitle}
          description={policy.message}
          confirmLabel={ASSIST_PANEL_COPY.request}
          cancelLabel={ASSIST_PANEL_COPY.confirmCancel}
          onConfirm={send}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </aside>
  );
}
