/*
* Funcionalidad: PageHeader
* Descripción: Page title block for new pages: the page h1, an optional subtitle and an optional actions slot aligned to the end (wraps under the title on narrow screens). Depends on MUI Typography and UI/page-header.module.css.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import styles from "./UI/page-header.module.css";

export type PageHeaderProps = {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className={styles.root}>
      <div className={styles.text}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body1" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
