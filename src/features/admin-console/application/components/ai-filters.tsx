/*
* Funcionalidad: AiFilters
* Descripción: Filter bar of /admin/ai: "Desde"/"Hasta" calendar days in America/Bogota, use case, provider, model, prompt version and rated output type (the last two only filter the ratings, as the API defines). The fields are a draft that reaches the URL on "Aplicar"; "Limpiar" resets them (the server then uses its last 30 days). Depends on MUI, React, the admin console AI analytics entity and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { cx } from "@shared/lib/class-names";
import { AI_RATING_TARGET_TYPES, AI_TARGET_TYPE_LABELS, AI_USE_CASE_LABELS, AI_USE_CASES, NO_AI_FILTERS } from "../entities/ai-analytics.entity";
import type { AiFilters as AiFiltersValue } from "../entities/ai-analytics.entity";
import styles from "../../UI/admin-operations.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const AI_FILTERS_COPY = {
  form: "Filtros de analítica de IA",
  from: "Desde",
  to: "Hasta",
  useCase: "Caso de uso",
  provider: "Proveedor",
  model: "Modelo",
  promptVersion: "Versión del prompt",
  targetType: "Tipo de salida calificada",
  all: "Todos",
  ratingsOnly: "Solo calificaciones",
  apply: "Aplicar",
  clear: "Limpiar",
} as const;

const DATE_LABEL_PROPS = { inputLabel: { shrink: true } } as const;

export type AiFiltersProps = {
  value: AiFiltersValue
  onChange: (next: AiFiltersValue) => void
};

export function AiFilters({ value, onChange }: AiFiltersProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const set = (field: keyof AiFiltersValue) => (event: { target: { value: string } }) => {
    setDraft((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onChange(draft);
  };

  return (
    <form className={cx(styles.filters)} aria-label={AI_FILTERS_COPY.form} onSubmit={submit}>
      <TextField size="small" type="date" label={AI_FILTERS_COPY.from} value={draft.fromDay} onChange={set("fromDay")} slotProps={DATE_LABEL_PROPS} />
      <TextField size="small" type="date" label={AI_FILTERS_COPY.to} value={draft.toDay} onChange={set("toDay")} slotProps={DATE_LABEL_PROPS} />
      <TextField size="small" select label={AI_FILTERS_COPY.useCase} value={draft.useCase} onChange={set("useCase")}>
        <MenuItem value="">{AI_FILTERS_COPY.all}</MenuItem>
        {AI_USE_CASES.map((useCase) => <MenuItem key={useCase} value={useCase}>{AI_USE_CASE_LABELS[useCase]}</MenuItem>)}
      </TextField>
      <TextField size="small" label={AI_FILTERS_COPY.provider} value={draft.provider} onChange={set("provider")} />
      <TextField size="small" label={AI_FILTERS_COPY.model} value={draft.model} onChange={set("model")} />
      <TextField
        size="small"
        label={AI_FILTERS_COPY.promptVersion}
        helperText={AI_FILTERS_COPY.ratingsOnly}
        value={draft.promptVersion}
        onChange={set("promptVersion")}
      />
      <TextField
        size="small"
        select
        label={AI_FILTERS_COPY.targetType}
        helperText={AI_FILTERS_COPY.ratingsOnly}
        value={draft.targetType}
        onChange={set("targetType")}
      >
        <MenuItem value="">{AI_FILTERS_COPY.all}</MenuItem>
        {AI_RATING_TARGET_TYPES.map((type) => <MenuItem key={type} value={type}>{AI_TARGET_TYPE_LABELS[type]}</MenuItem>)}
      </TextField>
      <div className={cx(styles.filterActions)}>
        <Button type="submit" variant="contained">{AI_FILTERS_COPY.apply}</Button>
        <Button type="button" onClick={() => onChange(NO_AI_FILTERS)}>{AI_FILTERS_COPY.clear}</Button>
      </div>
    </form>
  );
}
