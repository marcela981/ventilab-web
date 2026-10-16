/*
* Funcionalidad: Console value tile
* Descripción: One labelled value of the console monitors (a metric or a patient vital) as a description-list group: label (with the long name as title), formatted value with its unit, and, when the value is out of its normal range, a warning icon plus the text "Alto"/"Bajo" and the out-of-range token colors, so the state is never conveyed by color alone. A missing value shows "—". Optional children (e.g. a sparkline) go under the value. Depends on React, MUI icons and the console monitor styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import type { NormalRange, ValueDefinition } from "./config/console.config";
import { evaluateRange, formatConsoleValue, RANGE_STATUS_COPY } from "./console-format";
import styles from "../UI/console-monitor.module.css";

export type ValueTileProps = {
  definition: ValueDefinition
  value: number | null | undefined
  range: NormalRange | null
  children?: ReactNode
};

export function ValueTile({ definition, value, range, children }: ValueTileProps) {
  const status = evaluateRange(value, range);
  const outOfRange = status === "low" || status === "high";

  return (
    <div className={cx(styles.tile, outOfRange ? styles.outOfRange : undefined)} data-status={status}>
      <dt className={cx(styles.label)} title={definition.description}>{definition.label}</dt>
      <dd className={cx(styles.reading)}>
        <span className={cx(styles.value)}>{formatConsoleValue(value, definition)}</span>
        {definition.unit ? <span className={cx(styles.unit)}>{definition.unit}</span> : null}
      </dd>
      {outOfRange ? (
        <dd className={cx(styles.flag)}>
          {status === "high" ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />}
          {RANGE_STATUS_COPY[status]}
        </dd>
      ) : null}
      {children ? <dd className={cx(styles.extra)}>{children}</dd> : null}
    </div>
  );
}
