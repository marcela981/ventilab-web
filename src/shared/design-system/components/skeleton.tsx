/*
* Funcionalidad: Skeleton presets
* Descripción: Placeholder shapes for content that is loading, as an alternative to the LoadingState spinner when the final layout is known: ListSkeleton (N rows of avatar + two text lines) and CardSkeleton (title, three text lines and an action). The shapes are hidden from assistive technology; a labelled role="status" region with aria-busy announces the loading instead. Depends on MUI Skeleton and UI/skeleton.module.css.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Skeleton from "@mui/material/Skeleton";
import { cx } from "@shared/lib/class-names";
import styles from "./UI/skeleton.module.css";

// TODO(i18n): move to a design-system namespace in src/i18n.
const DEFAULT_LABEL = "Cargando…";

export type ListSkeletonProps = {
  rows?: number
  label?: string
};

export type CardSkeletonProps = {
  label?: string
};

export function ListSkeleton({ rows = 3, label = DEFAULT_LABEL }: ListSkeletonProps) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={cx(styles.list)}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={cx(styles.row)} aria-hidden="true" data-skeleton-row="">
          <Skeleton variant="circular" width={40} height={40} />
          <div className={cx(styles.lines)}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ label = DEFAULT_LABEL }: CardSkeletonProps) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={cx(styles.card)}>
      <div aria-hidden="true" className={cx(styles.lines)}>
        <Skeleton variant="text" width="50%" height={32} />
        <Skeleton variant="text" />
        <Skeleton variant="text" />
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="rounded" width={120} height={36} />
      </div>
    </div>
  );
}
