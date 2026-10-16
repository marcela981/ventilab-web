/*
* Funcionalidad: Case editor scheduled events section
* Descripción: "Eventos programados" of the case editor: an editable timeline of ClinicalCaseEventDTO rows (time in
*   seconds, event type and only the patient parameters that type carries: resistance factor for bronchospasm and
*   secretions, compliance factor and added shunt for derecruitment, effort amplitude and rate for an effort change,
*   none for disconnection and reconnection), each value with its plausible range from the vendored backend ranges.
*   Rows can be added (at the time of the last one) and removed; "Ordenar por tiempo" sorts them (the save always
*   sends them sorted, as the contract requires non-decreasing times) and a note appears while they are out of order.
*   Depends on MUI, the design-system FormField, the case editor config, draft entity, fields, section frame and CSS
*   Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SortIcon from "@mui/icons-material/Sort";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import { memo } from "react";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import {
  CASE_EVENT_TYPES,
  EVENT_PARAMETER_FIELDS,
  EVENT_PARAMETERS_BY_TYPE,
  EVENT_TIME_FIELD,
  EVENT_TIME_SCALE,
  EVENT_TYPE_LABELS,
} from "../config/case-editor.config";
import type { CaseEventParameter, CaseEventType } from "../config/case-editor.config";
import { addEvent, eventsInTimeOrder, removeEvent, sortDraftEvents, updateEvent, updateEventParameter } from "../entities/case-draft.entity";
import { NumericField } from "./case-fields";
import { EditorSection } from "./editor-section";
import { sameSectionProps } from "./section-props";
import type { SectionWithKeysProps } from "./section-props";
import styles from "../../UI/case-editor.module.css";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const EVENTS_COPY = {
  description: "Cambios del paciente que ocurren solos durante la sesión, en el tiempo simulado indicado.",
  empty: "El caso no tiene eventos programados.",
  type: "Tipo de evento",
  add: "Agregar evento",
  sort: "Ordenar por tiempo",
  outOfOrder: "Los eventos no están en orden de tiempo; se guardarán ordenados.",
  remove: (index: number) => `Quitar evento ${index}`,
  event: (index: number) => `Evento ${index}`,
  noParameters: "Este evento no cambia parámetros.",
} as const;

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;
const TIME_DISPLAY = { scale: EVENT_TIME_SCALE, unit: "s" } as const;

function EventsSectionView({ draft, errors, update, disabled, newKey }: SectionWithKeysProps) {
  const ordered = eventsInTimeOrder(draft.events);

  return (
    <EditorSection id="events" description={EVENTS_COPY.description}>
      {draft.events.length === 0 ? <p className={cx(styles.muted)}>{EVENTS_COPY.empty}</p> : null}
      {!ordered ? <Alert severity="info">{EVENTS_COPY.outOfOrder}</Alert> : null}
      <ol className={cx(styles.rows)}>
        {draft.events.map((event, index) => {
          const base = `events.${event.key}`;
          const parameters: readonly CaseEventParameter[] = EVENT_PARAMETERS_BY_TYPE[event.type];

          return (
            <li key={event.key} className={cx(styles.eventRow)} aria-label={EVENTS_COPY.event(index + 1)}>
              <div className={cx(styles.row)}>
                <NumericField
                  definition={EVENT_TIME_FIELD}
                  display={TIME_DISPLAY}
                  value={event.timeSeconds}
                  disabled={disabled}
                  error={errors[`${base}.simTimeMs`]}
                  onChange={(timeSeconds) => update((current) => updateEvent(current, event.key, { timeSeconds }))}
                />
                <FormField
                  select
                  label={EVENTS_COPY.type}
                  value={event.type}
                  disabled={disabled}
                  error={errors[`${base}.type`]}
                  onChange={(change) => {
            const { value } = change.target;

            update((current) => updateEvent(current, event.key, { type: value as CaseEventType }));
          }}
                  slotProps={NATIVE_SELECT}
                >
                  {CASE_EVENT_TYPES.map((type) => <option key={type} value={type}>{EVENT_TYPE_LABELS[type]}</option>)}
                </FormField>
                <IconButton
                  aria-label={EVENTS_COPY.remove(index + 1)}
                  disabled={disabled}
                  onClick={() => update((current) => removeEvent(current, event.key))}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </div>
              {parameters.length === 0 ? <p className={cx(styles.muted)}>{EVENTS_COPY.noParameters}</p> : (
                <div className={cx(styles.formGrid)}>
                  {parameters.map((parameter) => (
                    <NumericField
                      key={parameter}
                      definition={EVENT_PARAMETER_FIELDS[parameter]}
                      value={event.params[parameter]}
                      disabled={disabled}
                      error={errors[`${base}.${parameter}`]}
                      onChange={(value) => update((current) => updateEventParameter(current, event.key, parameter, value))}
                    />
                  ))}
                </div>
              )}
              {errors[base] ? <p className={cx(styles.fieldError)} role="alert">{errors[base]}</p> : null}
            </li>
          );
        })}
      </ol>
      <div className={cx(styles.actions)}>
        <Button startIcon={<AddIcon />} disabled={disabled} onClick={() => {
          const key = newKey();

          update((current) => addEvent(current, key));
        }}>{EVENTS_COPY.add}</Button>
        <Button startIcon={<SortIcon />} disabled={disabled || ordered} onClick={() => update((current) => sortDraftEvents(current))}>{EVENTS_COPY.sort}</Button>
      </div>
    </EditorSection>
  );
}

export const EventsSection = memo(EventsSectionView, sameSectionProps<SectionWithKeysProps>(["events"], "events"));
