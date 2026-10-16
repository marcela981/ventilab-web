/*
* Funcionalidad: AlarmLimitsPanel
* Descripción: Panel of the ventilator console alarms bar to view and adjust the alarm thresholds the consumer passes in (each with its own min/max/step/unit). Edits are a local draft clamped to each limit's bounds; "Aplicar límites" emits only the changed thresholds through onChange, "Descartar" drops the draft. Without onChange (or in read-only) the values are shown only. Depends on React, the controls reducer clamp and the alarms bar styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useState } from "react";
import { cx } from "@shared/lib/class-names";
import { clampToLimit } from "./console-controls.reducer";
import type { ConsoleAlarmLimit, ConsoleAlarmLimitChange } from "./ventilator-console.entity";
import styles from "../UI/alarms-bar.module.css";

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const ALARM_LIMITS_COPY = {
  title: "Límites de alarma",
  apply: "Aplicar límites",
  discard: "Descartar",
  readOnly: "Solo consulta: la fuente no permite cambiar los límites.",
  range: (limit: ConsoleAlarmLimit) => `${limit.min}–${limit.max} ${limit.unit}`.trim(),
} as const;

export type AlarmLimitsPanelProps = {
  limits: readonly ConsoleAlarmLimit[]
  onChange?: ((changes: readonly ConsoleAlarmLimitChange[]) => void) | undefined
  readOnly: boolean
};

export function AlarmLimitsPanel({ limits, onChange, readOnly }: AlarmLimitsPanelProps) {
  const [draft, setDraft] = useState<Readonly<Record<string, number>>>({});
  const editable = !readOnly && onChange !== undefined;
  const changes = limits
    .filter((limit) => draft[limit.id] !== undefined && draft[limit.id] !== limit.value)
    .map((limit) => ({ id: limit.id, value: draft[limit.id] ?? limit.value }));

  const update = (limit: ConsoleAlarmLimit, raw: string) => {
    const parsed = Number(raw);

    if (raw.trim() !== "" && Number.isFinite(parsed)) {
      setDraft((current) => ({ ...current, [limit.id]: clampToLimit(parsed, limit) }));
    }
  };

  const apply = () => {
    onChange?.(changes);
    setDraft({});
  };

  return (
    <section className={cx(styles.panel)} aria-label={ALARM_LIMITS_COPY.title}>
      <h3 className={cx(styles.panelTitle)}>{ALARM_LIMITS_COPY.title}</h3>
      {editable ? null : <p className={cx(styles.hint)}>{ALARM_LIMITS_COPY.readOnly}</p>}
      <ul className={cx(styles.limitList)}>
        {limits.map((limit) => {
          const value = draft[limit.id] ?? limit.value;
          const inputId = `alarm-limit-${limit.id}`;

          return (
            <li key={limit.id} className={cx(styles.limitRow)} data-pending={draft[limit.id] !== undefined && value !== limit.value}>
              <label htmlFor={inputId} className={cx(styles.limitLabel)}>
                {limit.label}
              </label>
              {editable ? (
                <input
                  id={inputId}
                  className={cx(styles.limitInput)}
                  type="number"
                  min={limit.min}
                  max={limit.max}
                  step={limit.step}
                  value={value}
                  onChange={(event) => update(limit, event.target.value)}
                />
              ) : (
                <output id={inputId} className={cx(styles.limitValue)}>
                  {value}
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
