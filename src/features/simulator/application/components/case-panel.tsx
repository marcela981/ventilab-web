/*
* Funcionalidad: Case panel
* Descripción: Collapsible side panel of the running session: the clinical case (title, diagnosis, clinical history
*   rendered with rich-content, educational goal, comorbidities) from GET /api/clinical-cases/{caseId}, the patient
*   data with the predicted body weight (Devine) computed from the engine case, and the objectives list with their
*   live status, labelled "en tiempo real" and explicitly not a grade. The case request failing only hides the
*   history; patient data and objectives come from the engine case. Depends on MUI icons, the api-client query hook,
*   shared rich-content, the console adapter helpers and the simulator CSS.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useId, useState } from "react";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { cx } from "@shared/lib/class-names";
import { RichContent } from "@shared/rich-content";
import type { EngineCase, TargetStatusValue } from "@shared/sim-engine";
import { CLINICAL_CASE_PATH } from "../../api/services/clinical-cases.service";
import { patientSummary } from "../session/sim-console-adapter";
import type { ObjectiveRow } from "../session/sim-console-adapter";
import styles from "../../UI/session-console.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const CASE_PANEL_COPY = {
  title: "Caso clínico",
  show: "Mostrar caso clínico",
  hide: "Ocultar caso clínico",
  history: "Historia clínica",
  historyEmpty: "El caso no tiene historia clínica.",
  historyLoading: "Cargando historia clínica…",
  historyError: "No se pudo cargar la historia clínica del caso.",
  goal: "Objetivo educativo",
  comorbidities: "Comorbilidades",
  patient: "Paciente",
  sex: "Sexo",
  height: "Talla",
  age: "Edad",
  weight: "Peso real",
  pbw: "Peso predicho (PBW)",
  objectives: "Objetivos",
  live: "en tiempo real",
  liveNote: "Lectura local mientras simulas; no es una calificación. La nota oficial la calcula el servidor al finalizar.",
  noObjectives: "Este caso no define objetivos.",
} as const;

export const OBJECTIVE_STATUS_COPY = {
  MET: "Cumplido",
  UNMET: "No cumplido",
  UNKNOWN: "Sin datos aún",
} as const satisfies Record<TargetStatusValue, string>;

export type CasePanelProps = {
  caseId: string
  engineCase: EngineCase
  objectives: readonly ObjectiveRow[]
};

function CaseHistory({ caseId }: { caseId: string }) {
  const { data, error, isLoading } = useApiQuery(CLINICAL_CASE_PATH, { params: { caseId } });
  const clinicalCase = data?.data.clinicalCase;

  if (!clinicalCase) {
    return <p className={cx(styles.caseMuted)}>{isLoading || !error ? CASE_PANEL_COPY.historyLoading : CASE_PANEL_COPY.historyError}</p>;
  }

  return (
    <>
      <p className={cx(styles.caseTitle)}>{clinicalCase.title}</p>
      <p className={cx(styles.caseMuted)}>{clinicalCase.mainDiagnosis}</p>
      <h3 className={cx(styles.caseHeading)}>{CASE_PANEL_COPY.history}</h3>
      <RichContent content={clinicalCase.description} emptyLabel={CASE_PANEL_COPY.historyEmpty} className={cx(styles.caseRich)} />
      {clinicalCase.educationalGoal ? (
        <>
          <h3 className={cx(styles.caseHeading)}>{CASE_PANEL_COPY.goal}</h3>
          <p className={cx(styles.caseText)}>{clinicalCase.educationalGoal}</p>
        </>
      ) : null}
      {clinicalCase.comorbidities.length > 0 ? (
        <>
          <h3 className={cx(styles.caseHeading)}>{CASE_PANEL_COPY.comorbidities}</h3>
          <p className={cx(styles.caseText)}>{clinicalCase.comorbidities.join(", ")}</p>
        </>
      ) : null}
      <dl className={cx(styles.caseFacts)}>
        <dt>{CASE_PANEL_COPY.age}</dt>
        <dd>{`${clinicalCase.patientAge} años`}</dd>
        <dt>{CASE_PANEL_COPY.weight}</dt>
        <dd>{`${clinicalCase.patientWeight} kg`}</dd>
      </dl>
    </>
  );
}

export function CasePanel({ caseId, engineCase, objectives }: CasePanelProps) {
  const [open, setOpen] = useState(true);
  const bodyId = useId();
  const patient = patientSummary(engineCase);

  return (
    <aside className={cx(styles.casePanel)} data-open={open} aria-label={CASE_PANEL_COPY.title}>
      <button
        type="button"
        className={cx(styles.caseToggle)}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <ChevronRightIcon aria-hidden="true" /> : <ChevronLeftIcon aria-hidden="true" />}
        <span>{open ? CASE_PANEL_COPY.hide : CASE_PANEL_COPY.show}</span>
      </button>
      <div id={bodyId} className={cx(styles.caseBody)} hidden={!open}>
        <h2 className={cx(styles.caseHeading)}>{CASE_PANEL_COPY.title}</h2>
        <CaseHistory caseId={caseId} />
        <h3 className={cx(styles.caseHeading)}>{CASE_PANEL_COPY.patient}</h3>
        <dl className={cx(styles.caseFacts)}>
          <dt>{CASE_PANEL_COPY.sex}</dt>
          <dd>{patient.sexLabel}</dd>
          <dt>{CASE_PANEL_COPY.height}</dt>
          <dd>{`${patient.heightCm} cm`}</dd>
          <dt>{CASE_PANEL_COPY.pbw}</dt>
          <dd>{`${patient.predictedBodyWeightKg.toFixed(1)} kg`}</dd>
        </dl>
        <h3 className={cx(styles.caseHeading)}>
          {CASE_PANEL_COPY.objectives}
          {" "}
          <span className={cx(styles.liveTag)}>{CASE_PANEL_COPY.live}</span>
        </h3>
        <p className={cx(styles.caseMuted)}>{CASE_PANEL_COPY.liveNote}</p>
        {objectives.length === 0 ? (
          <p className={cx(styles.caseMuted)}>{CASE_PANEL_COPY.noObjectives}</p>
        ) : (
          <ul className={cx(styles.objectives)} aria-label={`${CASE_PANEL_COPY.objectives} ${CASE_PANEL_COPY.live}`}>
            {objectives.map((objective) => (
              <li key={objective.id} className={cx(styles.objective)} data-status={objective.status}>
                <span className={cx(styles.objectiveLabel)}>{objective.label}</span>
                <span className={cx(styles.objectiveTarget)}>{objective.target}</span>
                <span className={cx(styles.objectiveValue)}>{objective.value}</span>
                <span className={cx(styles.objectiveStatus)}>{OBJECTIVE_STATUS_COPY[objective.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
