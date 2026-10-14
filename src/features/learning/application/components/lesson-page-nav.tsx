/*
* Funcionalidad: Lesson page navigation
* Descripción: Previous/Next bar of the lesson viewer. "Anterior" is a plain link to the previous URL position (hidden on the first Page of the module). "Siguiente" (or "Finalizar módulo" after the last Page) is a button: the viewer registers the page view (fire-and-forget) and then navigates, so the target is passed as a URL and the click goes through onNext. Depends on MUI (Button, icons), next/link and the viewer CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FlagIcon from "@mui/icons-material/Flag";
import Button from "@mui/material/Button";
import Link from "next/link";
import { cx } from "@shared/lib/class-names";
import styles from "../../UI/lesson-viewer.module.css";

// TODO(i18n): move to a learning namespace in src/i18n.
const COPY = {
  label: "Navegación entre páginas",
  previous: "Anterior",
  next: "Siguiente",
  finish: "Finalizar módulo",
} as const;

export type LessonPageNavProps = {
  previousHref: string | null
  nextHref: string | null
  isLastPage: boolean
  onNext: (href: string) => void
};

export function LessonPageNav({ previousHref, nextHref, isLastPage, onNext }: LessonPageNavProps) {
  return (
    <nav aria-label={COPY.label} className={cx(styles.nav)}>
      {previousHref ? (
        <Button component={Link} href={previousHref} variant="outlined" startIcon={<ArrowBackIcon />}>
          {COPY.previous}
        </Button>
      ) : null}
      <span className={cx(styles.navSpacer)} />
      {nextHref ? (
        <Button
          variant="contained"
          endIcon={isLastPage ? <FlagIcon /> : <ArrowForwardIcon />}
          onClick={() => onNext(nextHref)}
        >
          {isLastPage ? COPY.finish : COPY.next}
        </Button>
      ) : null}
    </nav>
  );
}
