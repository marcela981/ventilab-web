/*
* Funcionalidad: Case editor section frame
* Descripción: Frame of one case editor section: a landmark `section` with the anchor the side index links to, its
*   heading and an optional description. Depends on React, @shared/lib, the sections config and the editor CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import { CASE_SECTIONS, sectionAnchor } from "../config/case-editor-sections";
import type { CaseSectionId } from "../config/case-editor-sections";
import styles from "../../UI/case-editor.module.css";

export type EditorSectionProps = {
  id: CaseSectionId
  description?: string | undefined
  children: ReactNode
};

export function EditorSection({ id, description, children }: EditorSectionProps) {
  const anchor = sectionAnchor(id);
  const title = CASE_SECTIONS.find((section) => section.id === id)?.title ?? id;

  return (
    <section id={anchor} className={cx(styles.section)} aria-labelledby={`${anchor}-title`}>
      <h2 id={`${anchor}-title`} className={cx(styles.sectionTitle)}>{title}</h2>
      {description ? <p className={cx(styles.muted)}>{description}</p> : null}
      {children}
    </section>
  );
}
