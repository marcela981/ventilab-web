/*
* Funcionalidad: MessageList
* Descripción: Labelled list of the turns of an AI conversation: wraps each child (a turn with its bubbles) in a list item, skipping empty children and keeping their keys. `live` adds aria-live="polite" for threads that announce new turns as a whole; leave it off when a StreamingMessage already announces the answer. Depends on react and the conversation styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { Children, isValidElement } from "react";
import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import styles from "../UI/conversation.module.css";

export type MessageListProps = {
  label: string
  children: ReactNode
  live?: boolean
  className?: string
};

export function MessageList({ label, children, live = false, className }: MessageListProps) {
  return (
    <ul className={cx(styles.list, className)} aria-label={label} {...(live ? { "aria-live": "polite" as const } : {})}>
      {Children.toArray(children).map((child, index) => (
        <li key={isValidElement(child) && child.key !== null ? child.key : index} className={cx(styles.item)}>{child}</li>
      ))}
    </ul>
  );
}
