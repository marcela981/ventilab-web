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
*   v1.2 (W6, Bloque 4): the rating carries the SIMULATOR_ASSIST surface (thesis analytics by surface).
*   v1.3 (Bloque 5, C6): a console drawer of 380 px that takes the focus when it opens; Escape inside the panel closes it (a dialog inside it closes
*   first: MUI stops that Escape).
*   v1.4 (Bloque A): an answer whose `done.source` is DETERMINISTIC (no provider answered) carries the shared label
*   "Respuesta automática (IA no disponible)" and is not rated (the ratings measure the language model).
*   v1.5 (Bloque A): with `realMonitor` (the real console) the request is POST /simulation/real/assist with the
*   monitor state read at that moment, the intro speaks of the ventilator and an answer is rated as an AI_CALL (its
*   aiCallId) with the SIMULATOR_ASSIST surface. The AI never sends commands to the ventilator.
* Versión: 1.5
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
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import {
  AI_ERROR_CODES,
  AiFallbackLabel,
  COMPOSER_COPY,
  isFallbackSource,
  isNearLimit,
  MessageBubble,
  MessageList,
  StreamingMessage,
  useStreamingResponse,
} from "@shared/ai-conversation";
import { AiRatingWidget } from "@shared/ai-rating";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { cx } from "@shared/lib/class-names";
import { realAssistRequest } from "../../api/services/simulation-alarm-help.service";
import type { RealMonitorStateDTO } from "../../api/services/simulation-alarm-help.service";
import { assistStreamRequest } from "../../api/services/simulation-assist.service";
import { AI_CALL_RATING_TARGET_TYPE, ASSIST_QUESTION_MAX_LENGTH, ASSIST_RATING_SURFACE, ASSIST_RATING_TARGET_TYPE } from "../config/sim-assist.config";
import { getAssistErrorMessage } from "../entities/assist-error-messages";
import { isAssistDone, isRealAssistDone } from "../entities/sim-assist.entity";
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
  realIntro: "La asesoría revisa el estado actual del ventilador (ajustes, mediciones y alarmas recientes). Puedes escribir una pregunta concreta o dejarla vacía. La IA solo sugiere: nunca envía comandos al ventilador.",
  realAnswers: "Asesorías de esta conexión",
  realTyping: "Analizando el ventilador…",
  realStopped: "Respuesta detenida.",
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
  /** v1.5: the real monitor state; the request goes to the real-mode assistance with it. */
  realMonitor?: (() => RealMonitorStateDTO) | undefined
};

/** Done metadata of either route as one turn: a session answer has its AI_HELP event, a real one only its AI call. */
function doneTurnOf(done: unknown, real: boolean): Pick<AssistTurn, "id" | "aiHelpEventId" | "aiCallId" | "source"> | null {
  if (real) {
    return isRealAssistDone(done) ? { id: done.aiCallId, aiHelpEventId: null, aiCallId: done.aiCallId, source: done.source } : null;
  }

  return isAssistDone(done) ? { id: done.aiHelpEventId, aiHelpEventId: done.aiHelpEventId, aiCallId: done.aiCallId, source: done.source } : null;
}

function AnswerView({ turn }: { turn: AssistTurn }) {
  return (
    <div className={cx(styles.turn)}>
      {turn.question === "" ? null : <MessageBubble role="user" content={turn.question} />}
      <StreamingMessage
        text={turn.answer}
        isStreaming={false}
        announce={false}
        footer={isFallbackSource(turn.source)
          ? <AiFallbackLabel />
          : (
            <AiRatingWidget
              targetType={turn.aiHelpEventId === null ? AI_CALL_RATING_TARGET_TYPE : ASSIST_RATING_TARGET_TYPE}
              targetId={turn.aiHelpEventId ?? turn.aiCallId}
              surface={ASSIST_RATING_SURFACE}
            />
          )}
      />
    </div>
  );
}

export function AssistPanel({ id, sessionId, policy, history, onAnswered, onClose, realMonitor }: AssistPanelProps) {
  const stream = useStreamingResponse<AssistStreamDone>();
  const real = realMonitor !== undefined;
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [confirming, setConfirming] = useState(false);
  const titleId = useId();
  const counterId = useId();
  const panelRef = useRef<HTMLElement | null>(null);
  const isStreaming = stream.status === "streaming";
  const showCounter = isNearLimit(question.length, ASSIST_QUESTION_MAX_LENGTH);
  const done = stream.status === "done" ? doneTurnOf(stream.done, real) : null;
  const recorded = done !== null && history.some((turn) => turn.id === done.id);

  // A finished answer joins the session list (owned by the launcher) with the text the stream ended with.
  useEffect(() => {
    if (done !== null && !recorded) {
      onAnswered({ ...done, question: asked, answer: stream.text });
    }
  }, [asked, done, onAnswered, recorded, stream.text]);

  const send = () => {
    const typed = question;

    setConfirming(false);
    setAsked(typed.trim());
    setQuestion("");
    void stream.start(realMonitor ? realAssistRequest(realMonitor(), typed) : assistStreamRequest(sessionId, typed)).then((outcome) => {
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

  // The drawer takes the focus when it opens (Escape then closes it; the launcher gets the focus back).
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  };

  const showCurrent = stream.status !== "idle" && !recorded;
  const error = stream.status === "error" && stream.error ? stream.error : null;

  return (
    <aside ref={panelRef} id={id} className={cx(styles.panel)} aria-labelledby={titleId} tabIndex={-1} onKeyDown={onKeyDown}>
      <header className={cx(styles.header)}>
        <h2 id={titleId} className={cx(styles.title)}>{ASSIST_PANEL_COPY.title}</h2>
        <IconButton aria-label={ASSIST_PANEL_COPY.close} onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </header>
      <div className={cx(styles.body)}>
        <p className={cx(styles.intro)}>{real ? ASSIST_PANEL_COPY.realIntro : ASSIST_PANEL_COPY.intro}</p>
        {policy.status === "penalty" ? <Alert severity="warning">{policy.message}</Alert> : null}
        {history.length > 0 ? (
          <MessageList label={real ? ASSIST_PANEL_COPY.realAnswers : ASSIST_PANEL_COPY.answers}>
            {history.map((turn) => <AnswerView key={turn.id} turn={turn} />)}
          </MessageList>
        ) : null}
        {showCurrent ? (
          <div className={cx(styles.turn)}>
            {asked === "" ? null : <MessageBubble role="user" content={asked} />}
            {stream.status === "error" && stream.text === "" ? null : (
              <StreamingMessage text={stream.text} isStreaming={isStreaming} typingLabel={real ? ASSIST_PANEL_COPY.realTyping : ASSIST_PANEL_COPY.typing} />
            )}
            {stream.status === "aborted" ? <p className={cx(styles.note)} role="status">{real ? ASSIST_PANEL_COPY.realStopped : ASSIST_PANEL_COPY.stopped}</p> : null}
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
