/*
* Funcionalidad: LockedContentScreen
* Descripción: Screen shown to students instead of locked content (module page, and the page viewer in L3): lock icon, "Contenido bloqueado" heading, the title of the locked content, the missing prerequisites with links (PrerequisiteList) or a generic message when the backend lists none, and a back link. Never a blank screen. Staff (preview mode) never see it. Depends on MUI, next/link, PrerequisiteList and the learning CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import LockIcon from "@mui/icons-material/Lock";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { cx } from "@shared/lib/class-names";
import type { PrerequisiteLink } from "../entities/curriculum.entity";
import { PrerequisiteList } from "./prerequisite-list";
import styles from "../../UI/learning.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
const COPY = {
  heading: "Contenido bloqueado",
  intro: (title: string) => `Para acceder a «${title}» primero debes completar:`,
  noPrerequisites: "Completa los prerrequisitos de este contenido para desbloquearlo.",
} as const;

export type LockedContentScreenProps = {
  title: string
  prerequisites: PrerequisiteLink[]
  backHref: string
  backLabel: string
};

export function LockedContentScreen({ title, prerequisites, backHref, backLabel }: LockedContentScreenProps) {
  return (
    <section className={cx(styles.card, styles.locked)} aria-labelledby="locked-content-heading">
      <LockIcon className={cx(styles.lockedIcon)} aria-hidden="true" />
      <Typography id="locked-content-heading" variant="h5" component="h2">
        {COPY.heading}
      </Typography>
      {prerequisites.length > 0 ? (
        <>
          <Typography variant="body1">{COPY.intro(title)}</Typography>
          <PrerequisiteList prerequisites={prerequisites} />
        </>
      ) : (
        <>
          <Typography variant="body1" className={cx(styles.muted)}>{title}</Typography>
          <Typography variant="body1">{COPY.noPrerequisites}</Typography>
        </>
      )}
      <Link href={backHref} className={cx(styles.link)}>
        {backLabel}
      </Link>
    </section>
  );
}
