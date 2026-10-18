/*
* Funcionalidad: AlarmLimitsPanel
* Descripción: Panel of the ventilator console alarms bar to view and adjust the alarm thresholds the consumer passes in (each with its own min/max/step/unit). Edits are a local draft of the raw typed text (an empty field is allowed while editing), clamped to each limit's bounds and step only on blur and on "Aplicar límites", which emits only the changed valid thresholds through onChange (an empty or invalid draft keeps the threshold); "Descartar" drops the draft. Without onChange (or in read-only) the values are shown only. v1.2: a field left empty is cleared from the draft on blur, so it shows the current value again. Depends on React, the controls reducer clamp and the alarms bar styles. v1.3 (B4, D7): the limit inputs are text inputs with inputMode="decimal" (no type="number", whose browser parsing ignores the es-CO comma) read with the shared parseDecimal; a rejected text (thousands grouping, not a number) is marked aria-invalid and never applied; values and the range are shown with formatDecimal and every input is described by DECIMAL_HELPER_TEXT.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useId, useState } from "react";
import { cx } from "@shared/lib/class-names";
import { DECIMAL_HELPER_TEXT, formatDecimal, parseDecimal } from "@shared/lib/parse-decimal";
import { clampToLimit } from "./console-controls.reducer";
import type { ConsoleAlarmLimit, ConsoleAlarmLimitChange } from "./ventilator-console.entity";
import styles from "../UI/alarms-bar.module.css";

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const ALARM_LIMITS_COPY = {
  title: "Límites de alarma",
  apply: "Aplicar límites",
  discard: "Descartar",
  readOnly: "Solo consulta: la fuente no permite cambiar los límites.",
  range: (limit: ConsoleAlarmLimit) => `${formatDecimal(limit.min)}–${formatDecimal(limit.max)} ${limit.unit}`.trim(),
} as const;

export type AlarmLimitsPanelProps = {
  limits: readonly ConsoleAlarmLimit[]
  onChange?: ((changes: readonly ConsoleAlarmLimitChange[]) => void) | undefined
  readOnly: boolean
};

/** The clamped value of a raw draft, or `null` while it is empty or not a number (the threshold is kept). */
function parseDraft(raw: string, limit: ConsoleAlarmLimit): number | null {
  const parsed = parseDecimal(raw);

  return parsed.ok && parsed.value !== null ? clampToLimit(parsed.value, limit) : null;
}

/** Whether a typed draft is a text the parser rejects (an empty draft is not invalid, it keeps the threshold). */
function isInvalidDraft(raw: string | undefined): boolean {
  return raw !== undefined && !parseDecimal(raw).ok;
}

export function AlarmLimitsPanel({ limits, onChange, readOnly }: AlarmLimitsPanelProps) {
  // Raw strings while editing, so the user can clear the field and type digit by digit; clamped on blur and on apply.
  const [draft, setDraft] = useState<Readonly<Record<string, string>>>({});
  const hintId = useId();
  const editable = !readOnly && onChange !== undefined;
  const changes = limits.flatMap((limit) => {
    const raw = draft[limit.id];
    const value = raw === undefined ? null : parseDraft(raw, limit);

    return value === null || value === limit.value ? [] : [{ id: limit.id, value }];
  });

  const update = (limit: ConsoleAlarmLimit, raw: string) => setDraft((current) => ({ ...current, [limit.id]: raw }));

  const settle = (limit: ConsoleAlarmLimit) => {
    const raw = draft[limit.id];

    // An emptied field shows the current value again instead of staying blank.
    if (raw !== undefined && raw.trim() === "") {
      setDraft((current) => Object.fromEntries(Object.entries(current).filter(([id]) => id !== limit.id)));

      return;
    }

    const value = raw === undefined ? null : parseDraft(raw, limit);

    if (value !== null) {
      setDraft((current) => ({ ...current, [limit.id]: formatDecimal(value) }));
    }
  };

  const apply = () => {
    onChange?.(changes);
    setDraft({});
  };

  return (
    <section className={cx(styles.panel)} aria-label={ALARM_LIMITS_COPY.title}>
      <h3 className={cx(styles.panelTitle)}>{ALARM_LIMITS_COPY.title}</h3>
      {editable ? <p id={hintId} className={cx(styles.hint)}>{DECIMAL_HELPER_TEXT}</p> : <p className={cx(styles.hint)}>{ALARM_LIMITS_COPY.readOnly}</p>}
      <ul className={cx(styles.limitList)}>
        {limits.map((limit) => {
          const raw = draft[limit.id];
          const parsed = raw === undefined ? null : parseDraft(raw, limit);
          const inputId = `alarm-limit-${limit.id}`;

          return (
            <li key={limit.id} className={cx(styles.limitRow)} data-pending={parsed !== null && parsed !== limit.value}>
              <label htmlFor={inputId} className={cx(styles.limitLabel)}>
                {limit.label}
              </label>
              {editable ? (
                <input
                  id={inputId}
                  className={cx(styles.limitInput)}
                  type="text"
                  inputMode="decimal"
                  aria-describedby={hintId}
                  aria-invalid={isInvalidDraft(raw) || undefined}
                  value={raw ?? formatDecimal(limit.value)}
                  onChange={(event) => update(limit, event.target.value)}
                  onBlur={() => settle(limit)}
                />
              ) : (
                <output id={inputId} className={cx(styles.limitValue)}>
                  {formatDecimal(limit.value)}
                </output>
              )}
              <span className={cx(styles.limitRange)}>{ALARM_LIMITS_COPY.range(limit)}</span>
            </li>
          );
        })}
      </ul>
      {editable ? (
        <div className={cx(styles.panelActions)}>
          <button type="button" className={cx(styles.action, styles.primary)} disabled={changes.length === 0} onClick={apply}>
            {ALARM_LIMITS_COPY.apply}
          </button>
          <button type="button" className={cx(styles.action)} disabled={changes.length === 0} onClick={() => setDraft({})}>
            {ALARM_LIMITS_COPY.discard}
          </button>
        </div>
      ) : null}
    </section>
  );
}
