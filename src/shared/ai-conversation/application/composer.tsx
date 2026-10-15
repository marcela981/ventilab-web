/*
* Funcionalidad: Composer
* Descripción: Message input of an AI conversation (controlled). Multiline textarea where Enter sends the trimmed message and Shift+Enter (or an IME composition) inserts a new line; `maxLength` caps the text and a counter appears from 90% of the limit; `disabled` locks the field; while `isStreaming` the Detener button calls `onStop` and sending is blocked. The `ref` points at the textarea so callers can focus it. Depends on MUI (TextField, Button, icons) and the composer styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import SendIcon from "@mui/icons-material/Send";
import StopIcon from "@mui/icons-material/Stop";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useId } from "react";
import type { FormEvent, KeyboardEvent, Ref } from "react";
import { cx } from "@shared/lib/class-names";
import { isNearLimit } from "./ai-conversation.entity";
import styles from "../UI/composer.module.css";

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const COMPOSER_COPY = {
  send: "Enviar",
  stop: "Detener",
} as const;

export type ComposerProps = {
  value: string
  onValueChange: (value: string) => void
  // Receives the trimmed, non-empty message.
  onSubmit: (message: string) => void
  label: string
  maxLength: number
  placeholder?: string
  disabled?: boolean
  // Blocks sending without disabling the field (e.g. while the previous turn is saved).
  submitDisabled?: boolean
  isStreaming?: boolean
  onStop?: () => void
  maxRows?: number
  className?: string
  ref?: Ref<HTMLTextAreaElement>
};

export function Composer({
  value,
  onValueChange,
  onSubmit,
  label,
  maxLength,
  placeholder,
  disabled = false,
  submitDisabled = false,
  isStreaming = false,
  onStop,
  maxRows = 6,
  className,
  ref,
}: ComposerProps) {
  const counterId = useId();
  const canSubmit = !disabled && !submitDisabled && !isStreaming && value.trim() !== "";
  const showCounter = isNearLimit(value.length, maxLength);

  const submit = () => {
    if (canSubmit) {
      onSubmit(value.trim());
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    submit();
  };

  return (
    <form className={cx(styles.form, className)} onSubmit={handleSubmit}>
      <TextField
        label={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={handleKeyDown}
        size="small"
        multiline
        maxRows={maxRows}
        disabled={disabled}
        {...(placeholder === undefined ? {} : { placeholder })}
        {...(ref === undefined ? {} : { inputRef: ref })}
        slotProps={{ htmlInput: { maxLength, ...(showCounter ? { "aria-describedby": counterId } : {}) } }}
      />
      <div className={cx(styles.footer)}>
        {showCounter ? <p id={counterId} className={cx(styles.counter)}>{`${value.length} / ${maxLength}`}</p> : null}
        <div className={cx(styles.actions)}>
          {isStreaming && onStop ? (
            <Button variant="outlined" color="inherit" startIcon={<StopIcon />} onClick={onStop}>
              {COMPOSER_COPY.stop}
            </Button>
          ) : null}
          <Button type="submit" variant="contained" endIcon={<SendIcon />} disabled={!canSubmit}>
            {COMPOSER_COPY.send}
          </Button>
        </div>
      </div>
    </form>
  );
}
