/*
* Funcionalidad: LearningBreadcrumb
* Descripción: Breadcrumb Aprender > Sección > Nivel > Módulo > Lección > Página built from the URL builders: every known part links to its route (the level links to its anchor inside the section page) and the last part is the current page (aria-current, no link). Only the parts that are known are rendered. Depends on MUI Breadcrumbs, next/link, learning-urls and the learning CSS Module. v1.1 (W3, Bloque 2): the section and level parts link into the Currículo tab of /learn (?section=), the level with its anchor.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "next/link";
import { cx } from "@shared/lib/class-names";
import type { NamedRef } from "../entities/curriculum.entity";
import {
  buildLessonPageUrl,
  buildLevelUrl,
  buildModuleUrl,
  buildSectionUrl,
  LEARN_HOME_URL,
} from "../entities/learning-urls";
import styles from "../../UI/learning.module.css";

export type LearningBreadcrumbProps = {
  section?: NamedRef | null
  level?: (NamedRef & { sectionId: string | null }) | null
  module?: NamedRef | null
  lesson?: NamedRef | null
  pageNumber?: number | null
};

type Crumb = {
  key: string
  label: string
  href: string
};

function toCrumbs({ section, level, module, lesson, pageNumber }: LearningBreadcrumbProps): Crumb[] {
  const crumbs: Crumb[] = [{ key: "home", label: "Aprender", href: LEARN_HOME_URL }];

  if (section) {
    crumbs.push({ key: "section", label: section.title, href: buildSectionUrl(section.id) });
  }

  if (level) {
    crumbs.push({ key: "level", label: level.title, href: buildLevelUrl(level.id) });
  }

  if (module) {
    crumbs.push({ key: "module", label: module.title, href: buildModuleUrl(module.id) });

    if (lesson) {
      crumbs.push({ key: "lesson", label: lesson.title, href: buildLessonPageUrl(module.id, lesson.id) });

      if (pageNumber) {
        crumbs.push({ key: "page", label: `Página ${pageNumber}`, href: buildLessonPageUrl(module.id, lesson.id, pageNumber) });
      }
    }
  }

  return crumbs;
}

export function LearningBreadcrumb(props: LearningBreadcrumbProps) {
  const crumbs = toCrumbs(props);
  const last = crumbs.length - 1;

  return (
    <Breadcrumbs
      aria-label="Ruta de aprendizaje"
      separator={<NavigateNextIcon fontSize="small" aria-hidden="true" />}
      className={cx(styles.breadcrumb)}
    >
      {crumbs.map((crumb, index) => (index === last ? (
        <span key={crumb.key} aria-current="page" className={cx(styles.breadcrumbCurrent)}>
          {crumb.label}
        </span>
      ) : (
        <Link key={crumb.key} href={crumb.href} className={cx(styles.link)}>
          {crumb.label}
        </Link>
      )))}
    </Breadcrumbs>
  );
}
