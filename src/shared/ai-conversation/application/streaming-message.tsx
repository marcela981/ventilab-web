/*
* Funcionalidad: StreamingMessage
* Descripción: Assistant bubble of the answer being streamed. Shows the TypingIndicator until the first text arrives, then the markdown as it grows. Screen readers get a separate visually hidden aria-live="polite" region that only receives complete fragments (cut at sentence, clause or line ends) and the remainder once streaming stops, so it never announces per token. `footer`/`actions` are passed to the bubble (e.g. the "stopped" note). `announce={false}` drops the live region (a finished turn kept in the history) while keeping the same element tree, so a stateful footer such as a rating is not remounted. Depends on MessageBubble, AiMarkdown, TypingIndicator and the conversation styles.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { AiMarkdown } from "./ai-markdown";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import styles from "../UI/conversation.module.css";

// End of a fragment: sentence or clause punctuation followed by whitespace, or a line break.
const FRAGMENT_END = /[.!?…:;](?=\s)|\n/g;

// Splits the text into the fragments a screen reader should announce. While streaming, the text after the
// last fragment end is held back; once streaming stops it becomes the last fragment. Earlier fragments never
// change as the text grows, so React only appends new nodes to the live region.
export function announcementFragments(text: string, isStreaming: boolean): string[] {
  const fragments: string[] = [];
  let start = 0;

  for (const match of text.matchAll(FRAGMENT_END)) {
    const end = match.index + match[0].length;
    const fragment = text.slice(start, end).trim();

    if (fragment !== "") {
      fragments.push(fragment);
    }

    start = end;
  }

  const rest = text.slice(start).trim();

  if (!isStreaming && rest !== "") {
    fragments.push(rest);
  }

  return fragments;
}

export type StreamingMessageProps = {
  text: string
  isStreaming: boolean
  typingLabel?: string
  actions?: ReactNode
  footer?: ReactNode
  // false drops the live region (e.g. a finished turn now in the history), so its text is not read twice;
  // the bubble keeps the same element tree, so stateful footer content (a rating) is not remounted.
  announce?: boolean
  className?: string
};

export function StreamingMessage({ text, isStreaming, typingLabel, actions, footer, announce = true, className }: StreamingMessageProps) {
  const showTyping = isStreaming && text === "";

  return (
    <MessageBubble
      role="assistant"
      busy={isStreaming}
      {...(actions === undefined ? {} : { actions })}
      {...(footer === undefined ? {} : { footer })}
      {...(className === undefined ? {} : { className })}
    >
      {showTyping ? <TypingIndicator {...(typingLabel === undefined ? {} : { label: typingLabel })} /> : <AiMarkdown content={text} />}
      {announce ? (
        <div className={cx(styles.visuallyHidden)} aria-live="polite" aria-atomic="false" aria-relevant="additions">
          {announcementFragments(text, isStreaming).map((fragment, index) => <span key={index}>{`${fragment} `}</span>)}
        </div>
      ) : null}
    </MessageBubble>
  );
}
