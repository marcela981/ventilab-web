/*
* Funcionalidad: ResultsBand
* Descripción: July result band at the top of the result page: the verdict ("¡Aprobado! 🎉" / "Reprobado 😔", no emojis in EXAM) with "{c} de {t} correctas" once published, or "Respuestas enviadas — pendiente de revisión por el docente" with the partial count of the closed questions while the teacher reviews, colored by the outcome, and "Volver a evaluaciones". Depends on next/link, the result band rules, the evaluations URLs and the attempt result CSS Module. v1.1 (ajustes C1): before the teacher release the band reads "Entregado — en espera de resultados" in the pending tone with no partial count; "{c} de {t} correctas" only once the answers are released.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Link from "next/link";
import { cx } from "@shared/lib/class-names";
import type { AttemptDetail } from "../../entities/evaluation.entity";
import { EVALUATIONS_URL } from "../../entities/evaluations-urls";
import { BAND_COPY, resultBand } from "../../entities/result-band";
import styles from "../../../UI/attempt-result.module.css";

export function ResultsBand({ attempt }: { attempt: AttemptDetail }) {
  const band = resultBand(attempt);
  let tone = styles.bandPending;

  if (band.kind === "published") {
    tone = band.passed ? styles.bandPassed : styles.bandFailed;
  }

  return (
    <section className={cx(styles.band, tone)} aria-label={band.verdict}>
      <div className={cx(styles.bandText)}>
        <p className={cx(styles.bandVerdict)}>{band.verdict}</p>
        {band.kind === "published" && band.detail ? <p className={cx(styles.bandDetail)}>{band.detail}</p> : null}
      </div>
      <Link href={EVALUATIONS_URL} className={cx(styles.bandBack)}>{BAND_COPY.back}</Link>
    </section>
  );
}
