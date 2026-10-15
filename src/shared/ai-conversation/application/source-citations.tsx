/*
* Funcionalidad: SourceCitations
* Descripción: "Fuentes" list of an AI answer. Renders nothing when the answer has no sources (the backend `done` carries none today). A source with an http(s) URL becomes a link that opens in a new tab with rel="noopener noreferrer"; any other URL is dropped and only the title is shown. Depends on the conversation entity and styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { cx } from "@shared/lib/class-names";
import { isSafeExternalUrl } from "./ai-conversation.entity";
import type { AiSourceCitation } from "./ai-conversation.entity";
import styles from "../UI/conversation.module.css";

// TODO(i18n): move to an i18next namespace once src/i18n is in scope.
export const SOURCE_CITATIONS_TITLE = "Fuentes";

export type SourceCitationsProps = {
  sources?: readonly AiSourceCitation[] | null | undefined
  title?: string
};

export function SourceCitations({ sources, title = SOURCE_CITATIONS_TITLE }: SourceCitationsProps) {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <section className={cx(styles.sources)} aria-label={title}>
      <p className={cx(styles.sourcesTitle)}>{title}</p>
      <ol className={cx(styles.sourcesList)}>
        {sources.map((source, index) => (
          <li key={`${index}:${source.title}`}>
            {isSafeExternalUrl(source.url)
              ? <a className={cx(styles.sourceLink)} href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
              : source.title}
          </li>
        ))}
      </ol>
    </section>
  );
}
