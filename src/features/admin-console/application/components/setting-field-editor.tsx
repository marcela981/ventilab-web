/*
* Funcionalidad: SettingFieldEditor
* Descripción: Renders the field tree built by buildSettingField, recursively, on the draft value of one setting: number → text input with decimal keyboard and its limits as help (the typed text is kept while it does not parse, and validation reports it); boolean → switch; text; select (allowed values); multi-select → checkboxes of the allowed values; list → one input per entry with add/remove; group → fieldset with its children; provider chain → ProviderChainEditor; JSON → multiline input validated as JSON. Each input shows the error of its path (client limits or a server 422). Depends on MUI, the design-system form field, @shared/lib, the admin console entities, the provider chain editor and CSS Module. v1.1 (O4a review): emptying an optional number (record-like settings such as `ai.quotas`) removes its key from the draft instead of leaving an invalid number; parseNumberInput accepts one decimal separator ("." or ",") and rejects several separators, mixed "."/"," and a comma used as thousands grouping ("1,000") instead of coercing them. v1.2 (review): dot thousands grouping ("1.000", "12.500", as es-CO users write a thousand) is rejected the same way, so both ",ddd" and ".ddd" grouped forms with a non-zero integer part show the number error; "1.5", "1,5", "0.125" and "0,125" stay valid. v1.3 (final review): a single dot is always decimal again, so "1.125" can be typed; only comma grouping and several separators are rejected. v1.4 (closure B2): number and list inputs show the setting unit as an end adornment; map fields (registry keySchema) list one editor per key with "Quitar", and add a key from a select of the allowed keys still missing (or free text when any key is allowed; a repeated key is refused). v1.5 (B4, D7): number inputs and number list items read through the shared parseDecimalOrNaN ("," or "." decimal, no thousands separator, so "1,000" is 1; integer settings accept no separator; a number input shows the parser message of a typed text it rejects) and show DECIMAL_HELPER_TEXT or INTEGER_HELPER_TEXT next to their limits; the local number parser is gone.
* Versión: 1.5
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
import InputAdornment from "@mui/material/InputAdornment";
import Switch from "@mui/material/Switch";
import { useId, useState } from "react";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { DECIMAL_ERROR_MESSAGES, DECIMAL_HELPER_TEXT, INTEGER_HELPER_TEXT, parseDecimal, parseDecimalOrNaN } from "@shared/lib/parse-decimal";
import { formatSettingValue, getAt, InvalidJsonDraft, removeAt, setAt } from "../entities/platform-setting.entity";
import type { Primitive } from "../entities/platform-setting.entity";
import { readProviderChain, writeProviderChain } from "../entities/provider-chain.entity";
import type { ConfiguredProvider } from "../entities/provider-chain.entity";
import { describeLimits, fieldLabel, mapEntryField, mapKeys, newMapEntryValue } from "../entities/setting-form.entity";
import type {
  FieldErrors,
  JsonField,
  ListField,
  MapField,
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
  noKeys: "Sin entradas.",
  newKey: (keyLabel: string) => `Nuevo: ${keyLabel}`,
  chooseKey: "Elige una clave",
  repeatedKey: "Esa clave ya existe.",
  addKey: (keyLabel: string) => `Agregar ${keyLabel.toLowerCase()}`,
  removeKey: (keyLabel: string, key: string) => `Quitar ${keyLabel.toLowerCase()} ${key}`,
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

function numberHelp(field: SettingField, integer: boolean): string {
  return [describeLimits(field), integer ? INTEGER_HELPER_TEXT : DECIMAL_HELPER_TEXT].filter((part) => part !== "").join(" ");
}

function numberText(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function numberInputProps(unit: string | undefined) {
  return unit
    ? { ...DECIMAL_INPUT, input: { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> } }
    : DECIMAL_INPUT;
}

function NumberEditor({ field, root, errors, disabled, onChange }: EditorProps<NumberField>) {
  const [text, setText] = useState(() => numberText(getAt(root, field.path)));
  const parsed = parseDecimal(text, { integer: field.limits.integer });
  // The parser names what is wrong with the typed text ("sin separador de miles", "entero"); the validator only sees NaN.
  const parseError = parsed.ok ? undefined : DECIMAL_ERROR_MESSAGES[parsed.error];

  return (
    <FormField
      size="small"
      label={field.label}
      value={text}
      disabled={disabled}
      error={parseError ?? errors[field.id]}
      helperText={numberHelp(field, field.limits.integer)}
      slotProps={numberInputProps(field.unit)}
      onChange={(event) => {
        setText(event.target.value);
        // An emptied optional number is omitted (e.g. a quota without limit), not sent as an invalid value.
        onChange(field.optional && event.target.value.trim() === ""
          ? removeAt(root, field.path)
          : setAt(root, field.path, parseDecimalOrNaN(event.target.value, { integer: field.limits.integer })));
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
    onChange(setAt(root, field.path, next.map((text) => (field.itemKind === "number" ? parseDecimalOrNaN(text, { integer: field.itemLimits.integer }) : text))));
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
              {...(field.itemKind === "number" ? { slotProps: numberInputProps(field.unit) } : {})}
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
      <p className={cx(styles.hint)}>{field.itemKind === "number" ? numberHelp(field, field.itemLimits.integer) : describeLimits(field)}</p>
      {error ? <p id={errorId} className={cx(styles.fieldError)} role="alert">{error}</p> : null}
    </fieldset>
  );
}

function MapEditor(props: EditorProps<MapField>) {
  const { field, root, errors, disabled, onChange } = props;
  const keys = mapKeys(field, root);
  const [newKey, setNewKey] = useState("");
  const keyOptions = field.allowedKeys ? field.allowedKeys.filter((key) => !keys.includes(key)) : null;
  const candidate = newKey.trim();
  const canAdd = candidate !== "" && !keys.includes(candidate) && (keyOptions === null || keyOptions.includes(candidate));
  const error = errors[field.id];

  const add = () => {
    if (canAdd) {
      onChange(setAt(root, [...field.path, candidate], newMapEntryValue(field)));
      setNewKey("");
    }
  };

  return (
    <fieldset className={cx(styles.fieldset)}>
      <legend className={cx(styles.legend)}>{field.label}</legend>
      {keys.length === 0 ? <p className={cx(styles.hint)}>{FIELD_EDITOR_COPY.noKeys}</p> : null}
      <div className={cx(styles.group)}>
        {keys.map((key) => (
          <div key={key} className={cx(styles.mapEntry)}>
            <SettingFieldEditor {...props} field={mapEntryField(field, key, root)} />
            <Button
              size="small"
              color="error"
              startIcon={<DeleteOutlineIcon fontSize="small" />}
              disabled={disabled}
              onClick={() => onChange(removeAt(root, [...field.path, key]))}
            >
              {FIELD_EDITOR_COPY.removeKey(field.keyLabel, fieldLabel(key))}
            </Button>
          </div>
        ))}
      </div>
      <div className={cx(styles.mapAdd)}>
        {keyOptions ? (
          <FormField
            select
            size="small"
            label={FIELD_EDITOR_COPY.newKey(field.keyLabel)}
            value={keyOptions.includes(newKey) ? newKey : ""}
            disabled={disabled || keyOptions.length === 0}
            slotProps={NATIVE_SELECT}
            onChange={(event) => setNewKey(event.target.value)}
          >
            <option value="">{FIELD_EDITOR_COPY.chooseKey}</option>
            {keyOptions.map((key) => <option key={key} value={key}>{fieldLabel(key)}</option>)}
          </FormField>
        ) : (
          <FormField
            size="small"
            label={FIELD_EDITOR_COPY.newKey(field.keyLabel)}
            value={newKey}
            disabled={disabled}
            error={candidate !== "" && keys.includes(candidate) ? FIELD_EDITOR_COPY.repeatedKey : undefined}
            onChange={(event) => setNewKey(event.target.value)}
          />
        )}
        <Button size="small" startIcon={<AddIcon />} disabled={disabled || !canAdd} onClick={add}>
          {FIELD_EDITOR_COPY.addKey(field.keyLabel)}
        </Button>
      </div>
      <p className={cx(styles.hint)}>{describeLimits(field)}</p>
      {error ? <p className={cx(styles.fieldError)} role="alert">{error}</p> : null}
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
    case "map":
      return <MapEditor {...props} field={field} />;
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
