/*
* Funcionalidad: CaseCard
* Descripción: Card of a clinical case in the simulator catalog: title, summary (the case description), difficulty chip, pathology chip, a "Validado por experto" badge only when the data says the case is validated, main diagnosis and patient data, and the "Iniciar práctica" button with its loading state and the start error of this case. v1.1: a small native select picks the session time multiplier (TIME_MULTIPLIERS of the contract, default ×1) sent with the start, because the backend bounds the session's simulated time by wall time × that multiplier. Depends on MUI Chip, TextField and icons, the design-system AsyncButton, the simulator entities and styles.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VerifiedIcon from "@mui/icons-material/Verified";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import { useId, useState } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { cx } from "@shared/lib/class-names";
import { DEFAULT_TIME_MULTIPLIER, TIME_MULTIPLIER_LABELS, TIME_MULTIPLIERS } from "../config/simulator.config";
import type { TimeMultiplier } from "../config/simulator.config";
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
  speed: "Velocidad del tiempo simulado",
  speedOption: (multiplier: TimeMultiplier) =>
    multiplier === 1 ? `${TIME_MULTIPLIER_LABELS[multiplier]} (tiempo real)` : TIME_MULTIPLIER_LABELS[multiplier],
  speedHint: "Es el máximo de la sesión: durante la práctica podrás bajarla, pero no subirla.",
  difficulty: (label: string) => `Dificultad: ${label}`,
  pathology: (label: string) => `Patología: ${label}`,
} as const;

export type CaseCardProps = {
  clinicalCase: CaseCardModel
  pending: boolean
  /** Another case is starting: this button waits. */
  disabled: boolean
  error: string | null
  onStart: (caseId: string, timeMultiplier: TimeMultiplier) => void
};

export function CaseCard({ clinicalCase, pending, disabled, error, onStart }: CaseCardProps) {
  const titleId = useId();
  const errorId = useId();
  const [timeMultiplier, setTimeMultiplier] = useState<TimeMultiplier>(DEFAULT_TIME_MULTIPLIER);
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
        <TextField
          select
          size="small"
          className={cx(styles.speed)}
          label={CASE_CARD_COPY.speed}
          helperText={CASE_CARD_COPY.speedHint}
          value={String(timeMultiplier)}
          disabled={pending || disabled}
          onChange={(event) => {
            const next = TIME_MULTIPLIERS.find((multiplier) => String(multiplier) === event.target.value);

            if (next !== undefined) {
              setTimeMultiplier(next);
            }
          }}
          slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
        >
          {TIME_MULTIPLIERS.map((multiplier) => (
            <option key={multiplier} value={String(multiplier)}>
              {CASE_CARD_COPY.speedOption(multiplier)}
            </option>
          ))}
        </TextField>
        <AsyncButton
          variant="contained"
          startIcon={<PlayArrowIcon />}
          loading={pending}
          disabled={disabled}
          aria-describedby={error === null ? undefined : errorId}
          onClick={() => onStart(clinicalCase.id, timeMultiplier)}
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
