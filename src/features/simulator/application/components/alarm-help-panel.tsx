/*
* Funcionalidad: Alarm help panel ("¿Cómo estabilizar?")
* Descripción: Content of the July console drawer "¿Cómo estabilizar?" for one alarm (Bloque A, DISENO_AJUSTES_A §5),
*   loaded on demand (lazy-alarm-help-panel) so the AI pieces stay out of the console chunk. It names the alarm, then
*   streams the request built when it is asked (`buildRequest`: the real monitor reads its state at that moment) through the shared useStreamingResponse: (1) the deterministic rules of the `rules`
*   frame (text and source reference), always shown once they arrive, also when the AI part fails afterwards, and (2)
*   the streamed AI suggestion in the shared StreamingMessage. A DETERMINISTIC answer carries the label "Sugerencia
*   automática (IA no disponible)" and is not rated; an LLM answer gets "¿Te fue útil?" (targetType AI_CALL, targetId
*   aiCallId, surface SIM_ALARM). Without a request (EXAM with the help disabled) it shows only the alarm description
*   and "Ayuda no disponible durante el examen". With a penalty policy the student asks for it explicitly after the
*   warning. "Detener" aborts the stream; unmounting (drawer closed, another alarm) aborts it too. Errors use the
*   assist error messages. Depends on React, MUI, @shared/ai-conversation, @shared/ai-rating, the simulator assist
*   config and entities and the alarm help CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import StopIcon from "@mui/icons-material/Stop";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import { AI_ERROR_CODES, AiFallbackLabel, COMPOSER_COPY, isFallbackSource, StreamingMessage, useStreamingResponse } from "@shared/ai-conversation";
import type { StreamRequest } from "@shared/ai-conversation";
import { AiRatingWidget } from "@shared/ai-rating";
import { cx } from "@shared/lib/class-names";
import type { ConsoleAlarmHelpTarget } from "@shared/ventilator-console";
import { AI_CALL_RATING_TARGET_TYPE, ALARM_HELP_RATING_SURFACE } from "../config/sim-assist.config";
import { getAssistErrorMessage } from "../entities/assist-error-messages";
import { isAlarmHelpDone, parseAlarmRules } from "../entities/sim-alarm-help.entity";
import type { AlarmHelpAvailability, AlarmHelpDone } from "../entities/sim-alarm-help.entity";
import styles from "../../UI/alarm-help-panel.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const ALARM_HELP_PANEL_COPY = {
  alarm: "Alarma",
  rules: "Qué revisar primero",
  rulesLoading: "Buscando las recomendaciones para esta alarma…",
  noRules: "No hay recomendaciones registradas para esta alarma.",
  reference: (reference: string) => `Fuente: ${reference}`,
  suggestion: "Sugerencia de la IA",
  typing: "Analizando la alarma…",
  fallback: "Sugerencia automática (IA no disponible)",
  stopped: "Sugerencia detenida.",
  request: "Solicitar ayuda",
  retry: "Reintentar",
  note: "La IA solo sugiere: revisa cada cambio antes de aplicarlo en la consola.",
} as const;

export type AlarmHelpPanelProps = {
  target: ConsoleAlarmHelpTarget
  /** Builds the stream request when the help is asked; null when the help is unavailable (no request is ever sent). */
  buildRequest: (() => StreamRequest) | null
  availability: AlarmHelpAvailability
};

export function AlarmHelpPanel({ target, buildRequest, availability }: AlarmHelpPanelProps) {
  const stream = useStreamingResponse<AlarmHelpDone>();
  const rulesId = useId();
  const suggestionId = useId();
  const unavailable = availability.status === "unavailable" || buildRequest === null;
  const isStreaming = stream.status === "streaming";
  const rules = useMemo(() => parseAlarmRules(stream.rules), [stream.rules]);
  const done = stream.status === "done" && isAlarmHelpDone(stream.done) ? stream.done : null;
  const fallback = done !== null && isFallbackSource(done.source);
  const error = stream.status === "error" && stream.error ? stream.error : null;
  const { start } = stream;

  const ask = useCallback(() => {
    if (buildRequest) {
      void start(buildRequest());
    }
  }, [buildRequest, start]);
  // The host rebuilds its props with the alarms (≤ 4 Hz): the automatic start reads the latest ones, once per mount.
  const autoStartRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    autoStartRef.current = !unavailable && availability.status === "available" ? ask : null;
  });

  // Allowed: the help starts as the drawer opens (one request per mount). Penalty: asked after the warning.
  useEffect(() => {
    autoStartRef.current?.();
  }, []);

  let footer = null;

  if (done && fallback) {
    footer = <AiFallbackLabel label={ALARM_HELP_PANEL_COPY.fallback} />;
  } else if (done) {
    footer = <AiRatingWidget targetType={AI_CALL_RATING_TARGET_TYPE} targetId={done.aiCallId} surface={ALARM_HELP_RATING_SURFACE} />;
  }

  return (
    <div className={cx(styles.panel)}>
      <p className={cx(styles.alarm)}>
        <span className={cx(styles.alarmLabel)}>{ALARM_HELP_PANEL_COPY.alarm}</span>
        <span>{target.message}</span>
      </p>
      {unavailable ? (
        <p className={cx(styles.unavailable)} role="note">
          {availability.status === "unavailable" ? availability.reason : ALARM_HELP_PANEL_COPY.noRules}
        </p>
      ) : (
        <>
          {availability.status === "penalty" ? <Alert severity="warning">{availability.message}</Alert> : null}
          {stream.status === "idle" && availability.status === "penalty" ? (
            <Button variant="contained" onClick={ask}>{ALARM_HELP_PANEL_COPY.request}</Button>
          ) : null}
          {stream.status === "idle" ? null : (
            <section className={cx(styles.section)} aria-labelledby={rulesId}>
              <h3 id={rulesId} className={cx(styles.heading)}>{ALARM_HELP_PANEL_COPY.rules}</h3>
              {rules === null && isStreaming ? <p className={cx(styles.muted)} role="status">{ALARM_HELP_PANEL_COPY.rulesLoading}</p> : null}
              {rules !== null && rules.rules.length === 0 ? <p className={cx(styles.muted)}>{ALARM_HELP_PANEL_COPY.noRules}</p> : null}
              {rules !== null && rules.rules.length > 0 ? (
                <ol className={cx(styles.rules)} aria-label={ALARM_HELP_PANEL_COPY.rules}>
                  {rules.rules.map((rule) => (
                    <li key={rule.id} className={cx(styles.rule)}>
                      <span>{rule.text}</span>
                      {rule.reference ? <span className={cx(styles.reference)}>{ALARM_HELP_PANEL_COPY.reference(rule.reference)}</span> : null}
                    </li>
                  ))}
                </ol>
              ) : null}
            </section>
          )}
          {stream.status === "idle" || (stream.status === "error" && stream.text === "") ? null : (
            <section className={cx(styles.section)} aria-labelledby={suggestionId}>
              <h3 id={suggestionId} className={cx(styles.heading)}>{ALARM_HELP_PANEL_COPY.suggestion}</h3>
              <StreamingMessage text={stream.text} isStreaming={isStreaming} typingLabel={ALARM_HELP_PANEL_COPY.typing} footer={footer} />
              {stream.status === "aborted" ? <p className={cx(styles.muted)} role="status">{ALARM_HELP_PANEL_COPY.stopped}</p> : null}
              <p className={cx(styles.muted)}>{ALARM_HELP_PANEL_COPY.note}</p>
            </section>
          )}
          {error ? (
            <Alert severity={error.code === AI_ERROR_CODES.quotaExceeded ? "warning" : "error"}>{getAssistErrorMessage(error)}</Alert>
          ) : null}
          <div className={cx(styles.actions)}>
            {isStreaming ? (
              <Button variant="outlined" color="inherit" startIcon={<StopIcon />} onClick={stream.abort}>
                {COMPOSER_COPY.stop}
              </Button>
            ) : null}
            {error || stream.status === "aborted" ? (
              <Button variant="outlined" color="inherit" onClick={ask}>{ALARM_HELP_PANEL_COPY.retry}</Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
