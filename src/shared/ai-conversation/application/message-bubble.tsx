/*
* Funcionalidad: MessageBubble
* Descripción: One message of an AI conversation. A user message shows its text as typed (pre-wrap, no markdown); an assistant message renders its content with AiMarkdown. `children` replaces the default body (e.g. a typing indicator), `actions` holds buttons such as copy, and `footer` holds notes, rating or citations. `busy` sets aria-busy while the answer streams. Depends on AiMarkdown and the conversation styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { AiMarkdown } from "./ai-markdown";
import type { MessageRole } from "./ai-conversation.entity";
import styles from "../UI/conversation.module.css";

export type MessageBubbleProps = {
  role: MessageRole
  content?: string
  children?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  busy?: boolean
  className?: string
};

export function MessageBubble({ role, content = "", children, actions, footer, busy = false, className }: MessageBubbleProps) {
  const body = children ?? (role === "user"
    ? <p className={cx(styles.userText)}>{content}</p>
    : <AiMarkdown content={content} />);

  return (
    <div className={cx(styles.bubble, role === "user" ? styles.user : styles.assistant, className)} aria-busy={busy}>
      {body}
      {actions ? <div className={cx(styles.actions)}>{actions}</div> : null}
      {footer ? <div className={cx(styles.footer)}>{footer}</div> : null}
    </div>
  );
}
