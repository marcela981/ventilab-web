/*
* Funcionalidad: GeneralHero
* Descripción: Welcome banner of the General tab of /teacher (julio DashboardHero, FLUJOS_JULIO §c.3): "<saludo>, <nombre>" by time of day in America/Bogota, the long Bogotá date under it and the role chip of the signed-in user. Presentational: the caller gives the name, role label and instant. Depends on MUI Chip, @shared/lib/class-names, the teacher general entities and the teacher general CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Chip from "@mui/material/Chip";
import { cx } from "@shared/lib/class-names";
import { formatBogotaLongDate, greetingFor } from "../../entities/teacher-general.entity";
import styles from "../../../UI/teacher-general.module.css";

export type GeneralHeroProps = {
  name: string
  roleLabel: string | null
  now: Date
};

export function GeneralHero({ name, roleLabel, now }: GeneralHeroProps) {
  return (
    <header className={cx(styles.hero)}>
      <div className={cx(styles.heroText)}>
        <h1 className={cx(styles.heroTitle)}>{`${greetingFor(now)}, ${name}`}</h1>
        <p className={cx(styles.heroDate)}>{formatBogotaLongDate(now)}</p>
      </div>
      {roleLabel ? <Chip label={roleLabel} color="primary" variant="outlined" /> : null}
    </header>
  );
}
