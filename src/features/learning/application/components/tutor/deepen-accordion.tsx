/*
* Funcionalidad: DeepenAccordion
* Descripción: Accordion at the end of each page's content (DISENO_BLOQUE2 §2.10, July AITopicExpander) titled "¿Te gustaría expandir más este tema?" (July, decision §7b-8). Accessible disclosure: a heading with a button (aria-expanded, aria-controls) and a labelled region. The body (DeepenPanel: question form, streamed answer, stop, retry, rating) is a lazy chunk (React.lazy + retryImport) loaded on the first expansion and kept mounted while the page stays, so collapsing it does not stop a running answer. The viewer keys it by pageId, so another page starts collapsed with a fresh thread. A TutorAI suggestion for the deepen target (viewer prompt store) expands it, scrolls it into view and prefills the question. Depends on React, MUI icons, @shared/design-system, @shared/lib, useTutorPromptRequest and the tutor CSS Module.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { lazy, Suspense, useEffect, useId, useRef, useState } from "react";
import { RouteErrorBoundary } from "@shared/design-system/components/route-error-boundary";
import { CardSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
import { useTutorPromptRequest } from "../../hooks/use-tutor-prompt";
import type { DeepenPrefill } from "./deepen-panel";
import styles from "../../../UI/tutor-panel.module.css";

const DeepenPanel = lazy(() => retryImport(() => import("./deepen-panel")).then((module) => ({ default: module.DeepenPanel })));

// July ai.json topicExpander.accordion. TODO(i18n): move to a learning namespace in src/i18n.
export const DEEPEN_ACCORDION_COPY = {
  title: "¿Te gustaría expandir más este tema?",
  loading: "Cargando la expansión con IA…",
} as const;

export type DeepenAccordionProps = {
  pageId: string
};

export function DeepenAccordion({ pageId }: DeepenAccordionProps) {
  const buttonId = useId();
  const regionId = useId();
  const rootRef = useRef<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [opened, setOpened] = useState(false);
  const [prefill, setPrefill] = useState<DeepenPrefill | null>(null);
  const { request, consume } = useTutorPromptRequest("deepen");

  // A suggestion for this page: open and prefill (state update during render, once per request id).
  if (request && request.id !== prefill?.id) {
    setPrefill({ id: request.id, prompt: request.prompt });
    setExpanded(true);
    setOpened(true);
  }

  useEffect(() => {
    if (!request) {
      return;
    }

    consume(request.id);

    const root = rootRef.current;

    if (root && typeof root.scrollIntoView === "function") {
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [request, consume]);

  const toggle = () => {
    setExpanded((value) => !value);
    setOpened(true);
  };

  return (
    <section ref={rootRef} className={cx(styles.accordion)}>
      <h2 className={cx(styles.accordionHeading)}>
        <button
          id={buttonId}
          type="button"
          className={cx(styles.accordionButton)}
          aria-expanded={expanded}
          aria-controls={regionId}
          onClick={toggle}
        >
          <AutoAwesomeIcon fontSize="small" aria-hidden="true" />
          <span className={cx(styles.accordionTitle)}>{DEEPEN_ACCORDION_COPY.title}</span>
          <ExpandMoreIcon className={cx(styles.accordionChevron, expanded && styles.accordionChevronOpen)} aria-hidden="true" />
        </button>
      </h2>
      <div id={regionId} role="region" aria-labelledby={buttonId} className={cx(styles.accordionBody)} hidden={!expanded}>
        {opened ? (
          <RouteErrorBoundary resetKey={pageId}>
            <Suspense fallback={<CardSkeleton label={DEEPEN_ACCORDION_COPY.loading} />}>
              <DeepenPanel pageId={pageId} prefill={prefill} />
            </Suspense>
          </RouteErrorBoundary>
        ) : null}
      </div>
    </section>
  );
}
