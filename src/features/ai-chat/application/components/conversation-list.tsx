/*
* Funcionalidad: ConversationList
* Descripción: The caller's AI conversations (GET /api/tutor/conversations, server pages of 20): a scope filter (Todas | Libre | Lección | Módulo | Página, sent as `scope`, back to page 1), a title filter clearly labelled as filtering only the loaded conversations (BACKEND GAP: no search), the list of ConversationListItem (link, scope chip, date, active highlight, inline rename, origin link) and a pager when there is more than one page. Deleting asks for confirmation (ConfirmDialog) and reports onDeleted(id) so the host can leave a deleted open conversation; rename and delete failures show inline. "Nueva conversación" is offered at the top. Loading, error with retry and empty states (none yet / no match). Depends on React, MUI, @shared/design-system, the AI chat entity, useConversationList, useConversationActions, ConversationListItem and the assistant CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AddIcon from "@mui/icons-material/Add";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Pagination from "@mui/material/Pagination";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { ConfirmDialog } from "@shared/design-system/components/confirm-dialog";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { classifyChatError } from "../entities/ai-chat.entity";
import type { ConversationScope, ConversationSummary } from "../entities/ai-chat.entity";
import { useConversationActions } from "../hooks/use-conversation-actions";
import { useConversationList } from "../hooks/use-conversation-list";
import { ConversationListItem, SCOPE_LABELS } from "./conversation-list-item";
import styles from "../../UI/assistant.module.css";

type ScopeFilter = "ALL" | ConversationScope;

const SCOPE_FILTERS: readonly ScopeFilter[] = ["ALL", "FREE", "LESSON", "MODULE", "PAGE"];

// TODO(i18n): move to an ai-chat namespace in src/i18n.
export const CONVERSATION_LIST_COPY = {
  title: "Conversaciones",
  newConversation: "Nueva conversación",
  scopeLabel: "Filtrar por tipo",
  all: "Todas",
  titleFilter: "Filtrar conversaciones cargadas",
  titleFilterHint: "Busca por título solo entre las conversaciones de esta página.",
  listLabel: "Tus conversaciones",
  loading: "Cargando conversaciones…",
  loadError: "No se pudieron cargar las conversaciones",
  empty: "Aún no tienes conversaciones",
  emptyHint: "Haz tu primera pregunta al asistente.",
  noMatch: "Ninguna conversación coincide",
  noMatchHint: "Cambia el filtro o el tipo de conversación.",
  pager: "Páginas de conversaciones",
  deleteTitle: "¿Eliminar la conversación?",
  deleteDescription: (title: string) => `Se eliminará «${title}» con todos sus mensajes. Esta acción no se puede deshacer.`,
  deleteConfirm: "Eliminar",
} as const;

export type ConversationListProps = {
  activeId: string | null
  onNewConversation: () => void
  onDeleted?: ((conversationId: string) => void) | undefined
  className?: string
};

export function ConversationList({ activeId, onNewConversation, onDeleted, className }: ConversationListProps) {
  const titleId = useId();
  const [scope, setScope] = useState<ScopeFilter>("ALL");
  const [page, setPage] = useState(1);
  const [titleFilter, setTitleFilter] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ConversationSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const list = useConversationList({ scope: scope === "ALL" ? undefined : scope, page, titleFilter });
  const actions = useConversationActions();
  const pages = list.pagination?.pages ?? 1;

  const changeScope = (next: ScopeFilter | null) => {
    if (next !== null) {
      setScope(next);
      setPage(1);
    }
  };

  const confirmDelete = async() => {
    if (!pendingDelete) {
      return;
    }

    const { id } = pendingDelete;
    const outcome = await actions.remove(id);

    if (outcome.status === "busy") {
      return;
    }

    setPendingDelete(null);

    if (outcome.status === "success") {
      setActionError(null);
      onDeleted?.(id);
    } else {
      setActionError(outcome.message);
    }
  };

  let content: ReactNode;

  if (list.isLoading) {
    content = <ListSkeleton rows={4} label={CONVERSATION_LIST_COPY.loading} />;
  } else if (list.error) {
    content = (
      <ErrorState
        title={CONVERSATION_LIST_COPY.loadError}
        description={classifyChatError(list.error).message}
        onRetry={() => void list.reload()}
      />
    );
  } else if (list.conversations.length === 0) {
    const filtered = list.isFiltered || scope !== "ALL";

    content = (
      <EmptyState
        icon={<ForumOutlinedIcon />}
        title={filtered ? CONVERSATION_LIST_COPY.noMatch : CONVERSATION_LIST_COPY.empty}
        description={filtered ? CONVERSATION_LIST_COPY.noMatchHint : CONVERSATION_LIST_COPY.emptyHint}
      />
    );
  } else {
    content = (
      <ul className={cx(styles.items)} aria-label={CONVERSATION_LIST_COPY.listLabel}>
        {list.conversations.map((conversation) => (
          <li key={conversation.id}>
            <ConversationListItem
              conversation={conversation}
              isActive={conversation.id === activeId}
              busy={actions.pending}
              onRename={actions.rename}
              onDelete={setPendingDelete}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className={cx(styles.list, className)} aria-labelledby={titleId}>
      <div className={cx(styles.listHeader)}>
        <h2 id={titleId} className={cx(styles.listTitle)}>{CONVERSATION_LIST_COPY.title}</h2>
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={onNewConversation}>
          {CONVERSATION_LIST_COPY.newConversation}
        </Button>
      </div>
      <div className={cx(styles.filters)}>
        <ToggleButtonGroup
          value={scope}
          exclusive
          size="small"
          onChange={(_event, next: ScopeFilter | null) => changeScope(next)}
          aria-label={CONVERSATION_LIST_COPY.scopeLabel}
          className={cx(styles.scopeFilter)}
        >
          {SCOPE_FILTERS.map((option) => (
            <ToggleButton key={option} value={option}>
              {option === "ALL" ? CONVERSATION_LIST_COPY.all : SCOPE_LABELS[option]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <TextField
          label={CONVERSATION_LIST_COPY.titleFilter}
          helperText={CONVERSATION_LIST_COPY.titleFilterHint}
          value={titleFilter}
          onChange={(event) => setTitleFilter(event.target.value)}
          size="small"
          type="search"
          fullWidth
        />
      </div>
      {actionError ? <Alert severity="error" onClose={() => setActionError(null)}>{actionError}</Alert> : null}
      {content}
      {pages > 1 ? (
        <Pagination
          count={pages}
          page={Math.min(page, pages)}
          onChange={(_event, next) => setPage(next)}
          size="small"
          className={cx(styles.pager)}
          aria-label={CONVERSATION_LIST_COPY.pager}
        />
      ) : null}
      <ConfirmDialog
        open={pendingDelete !== null}
        title={CONVERSATION_LIST_COPY.deleteTitle}
        {...(pendingDelete ? { description: CONVERSATION_LIST_COPY.deleteDescription(pendingDelete.title) } : {})}
        confirmLabel={CONVERSATION_LIST_COPY.deleteConfirm}
        destructive
        isPending={actions.pending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
