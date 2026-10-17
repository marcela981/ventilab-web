/*
* Funcionalidad: SummaryCard
* Descripción: Card of one block of the student home (/me): a section landmark labelled by its heading, an optional "see all" link to the full page of the block and the block content (list, bars or empty state). `wide` makes the card span the whole grid row. Depends on next/link, React and the student space CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Link from "next/link";
import { useId } from "react";
import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import styles from "../../UI/student-space.module.css";

export type SummaryCardLink = {
  href: string
  label: string
};

export type SummaryCardProps = {
  title: string
  link?: SummaryCardLink | undefined
  wide?: boolean
  children: ReactNode
};

export function SummaryCard({ title, link, wide = false, children }: SummaryCardProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={cx(styles.card, wide && styles.wide)}>
      <div className={cx(styles.cardHeader)}>
        <h2 id={headingId} className={cx(styles.cardTitle)}>{title}</h2>
        {link ? <Link href={link.href} className={cx(styles.link)}>{link.label}</Link> : null}
      </div>
      {children}
    </section>
  );
}
