/*
* Funcionalidad: PrerequisiteList
* Descripción: Accessible list of missing prerequisites: each one links to its level anchor or module page when the curriculum tree knows it, otherwise it is shown as plain text. Used by LockedContentScreen and the level cards. Depends on next/link and the learning CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Link from "next/link";
import { cx } from "@shared/lib/class-names";
import type { PrerequisiteLink } from "../entities/curriculum.entity";
import styles from "../../UI/learning.module.css";

export type PrerequisiteListProps = {
  prerequisites: PrerequisiteLink[]
  label?: string
};

export function PrerequisiteList({ prerequisites, label = "Prerrequisitos pendientes" }: PrerequisiteListProps) {
  return (
    <ul aria-label={label} className={cx(styles.prerequisites)}>
      {prerequisites.map((prerequisite) => (
        <li key={prerequisite.id}>
          {prerequisite.href ? (
            <Link href={prerequisite.href} className={cx(styles.link)}>
              {prerequisite.title}
            </Link>
          ) : (
            <span>{prerequisite.title}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
