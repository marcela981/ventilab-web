/*
* Funcionalidad: CurriculumAccordion
* Descripción: One of the three accordions of the Currículo tab (W4, Bloque 2; July CurriculumSections): a heading with a trigger button (aria-expanded, aria-controls, icon, title and the "Opcional" badge on Prerequisitos) and a region labelled by it. The region stays rendered with the `hidden` attribute when collapsed, so its level anchors exist for the deep links. Arrow up/down, Home and End between triggers are handled by the tab (onTriggerKeyDown). Depends on React, MUI icons and the curriculum CSS Module.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { KeyboardEvent, ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import styles from "../../../UI/curriculum.module.css";

export type CurriculumAccordionProps = {
  id: string
  title: string
  icon: ReactNode
  badge?: string | undefined
  expanded: boolean
  onToggle: () => void
  onTriggerKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void
  children: ReactNode
};

export function CurriculumAccordion({ id, title, icon, badge, expanded, onToggle, onTriggerKeyDown, children }: CurriculumAccordionProps) {
  const triggerId = `${id}-trigger`;
  const regionId = `${id}-region`;

  return (
    <section className={cx(styles.accordion)} data-expanded={expanded}>
      <h3 className={cx(styles.accordionHeading)}>
        <button
          type="button"
          id={triggerId}
          className={cx(styles.accordionTrigger)}
          aria-expanded={expanded}
          aria-controls={regionId}
          data-accordion-trigger=""
          onClick={onToggle}
          onKeyDown={onTriggerKeyDown}
        >
          <span className={cx(styles.accordionIcon)} aria-hidden="true">{icon}</span>
          <span className={cx(styles.accordionTitle)}>{title}</span>
          {badge ? <span className={cx(styles.badge)}>{badge}</span> : null}
          <ExpandMoreIcon className={cx(styles.accordionChevron)} aria-hidden="true" />
        </button>
      </h3>
      <div id={regionId} role="region" aria-labelledby={triggerId} hidden={!expanded} className={cx(styles.accordionRegion)}>
        {children}
      </div>
    </section>
  );
}
