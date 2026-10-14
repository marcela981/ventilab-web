/*
* Funcionalidad: LockedHint
* Descripción: Inline hint for staff in preview mode on locked levels or modules: "Los estudiantes verían este contenido bloqueado" plus the missing prerequisites (as links). Students never see it: they get LockedContentScreen or the locked level card. Depends on MUI icons, PrerequisiteList and the learning CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import LockOpenIcon from "@mui/icons-material/LockOpen";
import { cx } from "@shared/lib/class-names";
import type { PrerequisiteLink } from "../entities/curriculum.entity";
import { PrerequisiteList } from "./prerequisite-list";
import styles from "../../UI/learning.module.css";

export type LockedHintProps = {
  prerequisites: PrerequisiteLink[]
};

export function LockedHint({ prerequisites }: LockedHintProps) {
  return (
    <div className={cx(styles.hint)}>
      <p className={cx(styles.hintText)}>
        <LockOpenIcon fontSize="small" aria-hidden="true" />
        Los estudiantes verían este contenido bloqueado.
      </p>
      {prerequisites.length > 0 ? <PrerequisiteList prerequisites={prerequisites} /> : null}
    </div>
  );
}
