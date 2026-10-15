/*
* Funcionalidad: ConversationListItem
* Descripción: One conversation of the assistant listing: a real link to /assistant/[id] (aria-current="page" and highlight when it is the open one) with the title, the scope chip and the last update; for LESSON, MODULE and PAGE conversations the learning origin link ("Ir a la lección" / "Ir al módulo", resolved by useConversationOrigin); "Renombrar" turns the title into an inline text field (Enter or "Guardar" saves through the rename action, Esc or "Cancelar" restores, at most 120 characters, the validation or server error shows under the field and focus returns to the rename button); "Eliminar" asks the list to confirm. Depends on React, next/link, MUI, @shared/lib, the AI chat config, entity, useConversationOrigin and the assistant CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { cx } from "@shared/lib/class-names";
import { formatDateTime } from "@shared/lib/format";
import { CONVERSATION_TITLE_MAX_LENGTH } from "../config/ai-chat.config";
import { buildConversationUrl } from "../entities/ai-chat.entity";
import type { ConversationScope, ConversationSummary } from "../entities/ai-chat.entity";
import type { ConversationActionOutcome } from "../hooks/use-conversation-actions";
import { useConversationOrigin } from "../hooks/use-conversation-origin";
import styles from "../../UI/assistant.module.css";

// TODO(i18n): move to an ai-chat namespace in src/i18n.
export const SCOPE_LABELS: Record<ConversationScope, string> = {
  FREE: "Libre",
  LESSON: "Lección",
  MODULE: "Módulo",
  PAGE: "Página",
};

export const LIST_ITEM_COPY = {
  rename: (title: string) => `Renombrar «${title}»`,
  remove: (title: string) => `Eliminar «${title}»`,
  titleField: "Nuevo título",
  save: "Guardar",
  cancel: "Cancelar",
  updated: (date: string) => `Actualizada ${date}`,
} as const;

export type ConversationListItemProps = {
  conversation: ConversationSummary
  isActive: boolean
  busy: boolean
  onRename: (conversationId: string, title: string) => Promise<ConversationActionOutcome>
  onDelete: (conversation: ConversationSummary) => void
};

export function ConversationListItem({ conversation, isActive, busy, onRename, onDelete }: ConversationListItemProps) {
  const origin = useConversationOrigin(conversation);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title);
  const [error, setError] = useState<string | null>(null);
  const renameButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef(false);

  useEffect(() => {
    if (!editing && restoreFocusRef.current) {
      restoreFocusRef.current = false;
      renameButtonRef.current?.focus();
    }
  }, [editing]);

  const startEditing = () => {
    setTitle(conversation.title);
    setError(null);
    setEditing(true);
  };

  const finish = () => {
    restoreFocusRef.current = true;
    setError(null);
    setEditing(false);
  };

  const save = async() => {
    const outcome = await onRename(conversation.id, title);

    if (outcome.status === "success") {
      finish();
    } else if (outcome.status !== "busy") {
      setError(outcome.message);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void save();
    } else if (event.key === "Escape") {
      event.preventDefault();
      finish();
    }
  };

  return (
    <div className={cx(styles.item, isActive && styles.itemActive)}>
      {editing ? (
        <div className={cx(styles.renameForm)}>
          <TextField
            label={LIST_ITEM_COPY.titleField}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={handleKeyDown}
            size="small"
            fullWidth
            autoFocus
            error={error !== null}
            helperText={error ?? `${title.length} / ${CONVERSATION_TITLE_MAX_LENGTH}`}
            slotProps={{ htmlInput: { maxLength: CONVERSATION_TITLE_MAX_LENGTH } }}
          />
          <div className={cx(styles.renameActions)}>
            <Button size="small" variant="contained" onClick={() => void save()} disabled={busy}>
              {LIST_ITEM_COPY.save}
            </Button>
            <Button size="small" onClick={finish}>
              {LIST_ITEM_COPY.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className={cx(styles.itemMain)}>
          <Link
            href={buildConversationUrl(conversation.id)}
            className={cx(styles.itemLink)}
            {...(isActive ? { "aria-current": "page" as const } : {})}
          >
            <span className={cx(styles.itemTitle)}>{conversation.title}</span>
            <span className={cx(styles.itemMeta)}>
              <Chip size="small" label={SCOPE_LABELS[conversation.scope]} className={cx(styles.scopeChip)} />
              <span>{LIST_ITEM_COPY.updated(formatDateTime(conversation.updatedAt))}</span>
            </span>
          </Link>
          <div className={cx(styles.itemActions)}>
            <IconButton size="small" ref={renameButtonRef} aria-label={LIST_ITEM_COPY.rename(conversation.title)} onClick={startEditing} disabled={busy}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" aria-label={LIST_ITEM_COPY.remove(conversation.title)} onClick={() => onDelete(conversation)} disabled={busy}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </div>
        </div>
      )}
      {origin.href && origin.label ? (
        <Link href={origin.href} className={cx(styles.originLink)} aria-label={`${origin.label}: ${conversation.title}`}>
          {origin.label}
        </Link>
      ) : null}
    </div>
  );
}
