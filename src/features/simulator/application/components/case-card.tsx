/*
* Funcionalidad: CaseCard
* Descripción: Card of a clinical case in the simulator catalog: title, summary (the case description), difficulty chip, pathology chip, a "Validado por experto" badge only when the data says the case is validated, main diagnosis and patient data, and the "Iniciar práctica" button with its loading state and the start error of this case. Depends on MUI Chip and icons, the design-system AsyncButton, the simulator entities and styles.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VerifiedIcon from "@mui/icons-material/Verified";
import Chip from "@mui/material/Chip";
import { useId } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { cx } from "@shared/lib/class-names";
import { difficultyLabel, pathologyLabel } from "../entities/simulator.entity";
import type { CaseCard as CaseCardModel } from "../entities/simulator.entity";
import styles from "../../UI/simulator.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const CASE_CARD_COPY = {
  validated: "Validado por experto",
  diagnosis: "Diagnóstico",
  patient: "Paciente",
  patientData: (age: number, weight: number) => `${age} años · ${weight} kg`,
  start: "Iniciar práctica",
  difficulty: (label: string) => `Dificultad: ${label}`,
  pathology: (label: string) => `Patología: ${label}`,
} as const;

export type CaseCardProps = {
  clinicalCase: CaseCardModel
  pending: boolean
  /** Another case is starting: this button waits. */
  disabled: boolean
  error: string | null
  onStart: (caseId: string) => void
};

export function CaseCard({ clinicalCase, pending, disabled, error, onStart }: CaseCardProps) {
  const titleId = useId();
  const errorId = useId();
  const difficulty = difficultyLabel(clinicalCase.difficulty);
  const pathology = pathologyLabel(clinicalCase.pathology);

  return (
    <article className={cx(styles.card)} aria-labelledby={titleId}>
      <div className={cx(styles.cardHeader)}>
        <Chip label={difficulty} size="small" color="primary" variant="outlined" title={CASE_CARD_COPY.difficulty(difficulty)} />
        <Chip label={pathology} size="small" variant="outlined" title={CASE_CARD_COPY.pathology(pathology)} />
        {clinicalCase.validatedByExpert === true ? (
          <span className={cx(styles.validated)}>
            <VerifiedIcon className={cx(styles.validatedIcon)} aria-hidden />
            {CASE_CARD_COPY.validated}
          </span>
        ) : null}
      </div>
      <h2 id={titleId} className={cx(styles.cardTitle)}>
        {clinicalCase.title}
      </h2>
      <p className={cx(styles.summary)}>{clinicalCase.description}</p>
      <dl className={cx(styles.details)}>
        <dt>{CASE_CARD_COPY.diagnosis}</dt>
        <dd>{clinicalCase.mainDiagnosis}</dd>
        <dt>{CASE_CARD_COPY.patient}</dt>
        <dd>{CASE_CARD_COPY.patientData(clinicalCase.patientAge, clinicalCase.patientWeight)}</dd>
      </dl>
      <div className={cx(styles.cardFooter)}>
        <AsyncButton
          variant="contained"
          startIcon={<PlayArrowIcon />}
          loading={pending}
          disabled={disabled}
          aria-describedby={error === null ? undefined : errorId}
          onClick={() => onStart(clinicalCase.id)}
        >
          {CASE_CARD_COPY.start}
        </AsyncButton>
        {error === null ? null : (
          <p id={errorId} className={cx(styles.cardError)} role="alert">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
