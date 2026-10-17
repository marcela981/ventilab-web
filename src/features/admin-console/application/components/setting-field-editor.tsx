/*
* Funcionalidad: SettingFieldEditor
* Descripción: Renders the field tree built by buildSettingField, recursively, on the draft value of one setting: number → text input with decimal keyboard and its limits as help (the typed text is kept while it does not parse, and validation reports it); boolean → switch; text; select (allowed values); multi-select → checkboxes of the allowed values; list → one input per entry with add/remove; group → fieldset with its children; provider chain → ProviderChainEditor; JSON → multiline input validated as JSON. Each input shows the error of its path (client limits or a server 422). Depends on MUI, the design-system form field, @shared/lib, the admin console entities, the provider chain editor and CSS Module. v1.1 (O4a review): emptying an optional number (record-like settings such as `ai.quotas`) removes its key from the draft instead of leaving an invalid number; parseNumberInput accepts one decimal separator ("." or ",") and rejects several separators, mixed "."/"," and a comma used as thousands grouping ("1,000") instead of coercing them. v1.2 (review): dot thousands grouping ("1.000", "12.500", as es-CO users write a thousand) is rejected the same way, so both ",ddd" and ".ddd" grouped forms with a non-zero integer part show the number error; "1.5", "1,5", "0.125" and "0,125" stay valid. v1.3 (final review): a single dot is always decimal again, so "1.125" can be typed; only comma grouping and several separators are rejected.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";
import { useId, useState } from "react";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { formatSettingValue, getAt, InvalidJsonDraft, removeAt, setAt } from "../entities/platform-setting.entity";
import type { Primitive } from "../entities/platform-setting.entity";
import { readProviderChain, writeProviderChain } from "../entities/provider-chain.entity";
import type { ConfiguredProvider } from "../entities/provider-chain.entity";
import { describeLimits } from "../entities/setting-form.entity";
import type {
  FieldErrors,
  JsonField,
  ListField,
  MultiSelectField,
  NumberField,
  SettingField,
} from "../entities/setting-form.entity";
import { ProviderChainEditor } from "./provider-chain-editor";
import styles from "../../UI/admin-settings.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const FIELD_EDITOR_COPY = {
  addItem: "Agregar elemento",
  item: (label: string, index: number) => `${label} ${index + 1}`,
  removeItem: (label: string, index: number) => `Quitar ${label} ${index + 1}`,
  jsonHint: "Formato JSON. Este valor no tiene un formulario propio.",
} as const;

const DECIMAL_INPUT = { htmlInput: { inputMode: "decimal" } } as const;
const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

export type ProvidersContext = {
  configured: readonly ConfiguredProvider[] | null
  failed: boolean
};

type EditorProps<F extends SettingField> = {
  field: F
  root: unknown
  errors: FieldErrors
  providers: ProvidersContext
  disabled: boolean
  onChange: (root: unknown) => void
};

// A comma followed by groups of three digits after a non-zero integer part ("1,000", "12,500") reads as thousands grouping:
// ambiguous, so it is rejected. A single dot is always the decimal separator, so real three-decimal values ("1.125") stay
// valid; several dots ("1.000.000") are rejected as grouping. "0,125" and "1,5" stay comma decimals.
const THOUSANDS_GROUPING = /^-?[1-9]\d{0,2}(,\d{3})+$/;

export function parseNumberInput(text: string): number {
  const trimmed = text.trim();
  const separators = trimmed.match(/[.,]/g) ?? [];

  if (trimmed === "" || separators.length > 1 || THOUSANDS_GROUPING.test(trimmed)) {
    return Number.NaN;
  }

  return Number(trimmed.replace(",", "."));
}

function numberText(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function NumberEditor({ field, root, errors, disabled, onChange }: EditorProps<NumberField>) {
  const [text, setText] = useState(() => numberText(getAt(root, field.path)));

  return (
    <FormField
      size="small"
      label={field.label}
      value={text}
      disabled={disabled}
      error={errors[field.id]}
      helperText={describeLimits(field)}
      slotProps={DECIMAL_INPUT}
      onChange={(event) => {
        setText(event.target.value);
        // An emptied optional number is omitted (e.g. a quota without limit), not sent as an invalid value.
        onChange(field.optional && event.target.value.trim() === ""
          ? removeAt(root, field.path)
          : setAt(root, field.path, parseNumberInput(event.target.value)));
      }}
    />
  );
}

function MultiSelectEditor({ field, root, errors, disabled, onChange }: EditorProps<MultiSelectField>) {
  const errorId = useId();
  const current = getAt(root, field.path);
  const selected = Array.isArray(current) ? current : [];
  const error = errors[field.id];

  const toggle = (option: Primitive, checked: boolean) => {
    const next = field.options.filter((item) => (item === option ? checked : selected.includes(item)));

    onChange(setAt(root, field.path, next));
  };

  return (
    <fieldset className={cx(styles.fieldset)} aria-describedby={error ? errorId : undefined}>
      <legend className={cx(styles.legend)}>{field.label}</legend>
      <div className={cx(styles.options)}>
        {field.options.map((option) => (
          <FormControlLabel
            key={String(option)}
            label={formatSettingValue(option)}
            control={<Checkbox checked={selected.includes(option)} disabled={disabled} onChange={(event) => toggle(option, event.target.checked)} />}
          />
        ))}
      </div>
      <p className={cx(styles.hint)}>{describeLimits(field)}</p>
      {error ? <p id={errorId} className={cx(styles.fieldError)} role="alert">{error}</p> : null}
    </fieldset>
  );
}

function ListEditor({ field, root, errors, disabled, onChange }: EditorProps<ListField>) {
  const errorId = useId();
  const [texts, setTexts] = useState<string[]>(() => {
    const current = getAt(root, field.path);

    return Array.isArray(current) ? current.map((item) => (typeof item === "number" ? numberText(item) : String(item))) : [];
  });
  const error = errors[field.id];

  const update = (next: string[]) => {
    setTexts(next);
    onChange(setAt(root, field.path, next.map((text) => (field.itemKind === "number" ? parseNumberInput(text) : text))));
  };

  return (
    <fieldset className={cx(styles.fieldset)} aria-describedby={error ? errorId : undefined}>
      <legend className={cx(styles.legend)}>{field.label}</legend>
      <ul className={cx(styles.list)}>
        {texts.map((text, index) => (
          <li key={index} className={cx(styles.listItem)}>
            <FormField
              size="small"
              label={FIELD_EDITOR_COPY.item(field.label, index)}
              value={text}
              disabled={disabled}
              {...(field.itemKind === "number" ? { slotProps: DECIMAL_INPUT } : {})}
              onChange={(event) => update(texts.map((item, position) => (position === index ? event.target.value : item)))}
            />
            <IconButton
              size="small"
              color="error"
              aria-label={FIELD_EDITOR_COPY.removeItem(field.label, index)}
              disabled={disabled}
              onClick={() => update(texts.filter((_, position) => position !== index))}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </li>
        ))}
      </ul>
      <Button size="small" startIcon={<AddIcon />} disabled={disabled} onClick={() => update([...texts, ""])}>
        {FIELD_EDITOR_COPY.addItem}
      </Button>
      <p className={cx(styles.hint)}>{describeLimits(field)}</p>
      {error ? <p id={errorId} className={cx(styles.fieldError)} role="alert">{error}</p> : null}
    </fieldset>
  );
}

function JsonEditor({ field, root, errors, disabled, onChange }: EditorProps<JsonField>) {
  const [text, setText] = useState(() => JSON.stringify(getAt(root, field.path) ?? null, null, 2));

  return (
    <FormField
      size="small"
      multiline
      minRows={3}
      label={field.label}
      value={text}
      disabled={disabled}
      error={errors[field.id]}
      helperText={FIELD_EDITOR_COPY.jsonHint}
      onChange={(event) => {
        const next = event.target.value;
        let parsed: unknown;

        try {
          parsed = JSON.parse(next) as unknown;
        } catch {
          parsed = new InvalidJsonDraft(next);
        }

        setText(next);
        onChange(setAt(root, field.path, parsed));
      }}
    />
  );
}

export function SettingFieldEditor(props: EditorProps<SettingField>) {
  const { field, root, errors, providers, disabled, onChange } = props;
  const value = getAt(root, field.path);

  switch (field.kind) {
    case "number":
      return <NumberEditor {...props} field={field} />;
    case "boolean":
      return (
        <FormControlLabel
          label={field.label}
          control={(
            <Switch
              checked={value === true}
              disabled={disabled}
              onChange={(event) => onChange(setAt(root, field.path, event.target.checked))}
            />
          )}
        />
      );
    case "text":
      return (
        <FormField
          size="small"
          label={field.label}
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          error={errors[field.id]}
          helperText={describeLimits(field)}
          onChange={(event) => onChange(setAt(root, field.path, event.target.value))}
        />
      );
    case "select":
      return (
        <FormField
          select
          size="small"
          label={field.label}
          value={value === undefined ? "" : String(value)}
          disabled={disabled}
          error={errors[field.id]}
          slotProps={NATIVE_SELECT}
          onChange={(event) => {
            const option = field.options.find((item) => String(item) === event.target.value);

            onChange(setAt(root, field.path, option));
          }}
        >
          {field.options.map((option) => <option key={String(option)} value={String(option)}>{formatSettingValue(option)}</option>)}
        </FormField>
      );
    case "multiSelect":
      return <MultiSelectEditor {...props} field={field} />;
    case "list":
      return <ListEditor {...props} field={field} />;
    case "json":
      return <JsonEditor {...props} field={field} />;
    case "providerChain":
      return (
        <ProviderChainEditor
          field={field}
          state={readProviderChain(field, root)}
          errors={errors}
          configured={providers.configured}
          providersFailed={providers.failed}
          disabled={disabled}
          onChange={(state) => onChange(writeProviderChain(field, root, state))}
        />
      );
    case "group": {
      const children = field.children.map((child) => (
        <SettingFieldEditor key={child.id} {...props} field={child} />
      ));

      return field.path.length === 0 ? (
        <div className={cx(styles.group)}>{children}</div>
      ) : (
        <fieldset className={cx(styles.fieldset)}>
          <legend className={cx(styles.legend)}>{field.label}</legend>
          <div className={cx(styles.group)}>{children}</div>
        </fieldset>
      );
    }
  }
}
