/*
* Funcionalidad: Case panel
* Descripción: Collapsible side panel of the running session: the clinical case (title, diagnosis, clinical history
*   rendered with rich-content, educational goal, comorbidities) from GET /api/clinical-cases/{caseId}, the patient
*   data with the predicted body weight (Devine) computed from the engine case, and the objectives list with their
*   live status, labelled "en tiempo real" and explicitly not a grade. The case request failing only hides the
*   history; patient data and objectives come from the engine case. Depends on MUI icons, the api-client query hook,
*   shared rich-content, the console adapter helpers and the simulator CSS.
*   v1.1 (W2, Bloque 1): the case history (rich content, KaTeX) is memoised, so the live objectives refresh does not
*   re-render it. v1.2 (W4, Bloque 1): the rich-content renderer of the history is lazy loaded (React.lazy +
*   retryImport), so the session route does not carry it (nor KaTeX) in its first load.
*   v2.0 (Bloque 5, C6): July layout. The panel is the "Caso clínico" drawer (380 px, non-modal, exclusive with the
*   other console drawers): a button of the session strip ("Mostrar caso clínico" / "Ocultar caso clínico",
*   aria-expanded) opens it, closed by default; inside the drawer, the case, the patient data, the live objectives
*   and an optional extra block (the own patient of the workspace). The history is fetched only while it is open.
* Versión: 2.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import { lazy, memo, Suspense, useId } from "react";
import type { ReactNode } from "react";
import { useApiQuery } from "@shared/api-client/use-api-query";
import { cx } from "@shared/lib/class-names";
import { retryImport } from "@shared/lib/retry-import";
import type { EngineCase, TargetStatusValue } from "@shared/sim-engine";
import { ConsoleDrawer, useConsoleDrawer } from "@shared/ventilator-console";
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
  /** Extra content at the end of the drawer (the own patient of the workspace). */
  extra?: ReactNode
};

/** Key of the case drawer among the console drawers. */
const CASE_DRAWER_KEY = "case";

// Loaded with the history only: the session route does not ship the markdown/KaTeX renderer in its first load.
const RichContent = lazy(() =>
  retryImport(() => import("@shared/rich-content/rich-content")).then((module) => ({ default: module.RichContent })),
);

/** Memoised: it depends only on the case id, never on the live objectives. */
const CaseHistory = memo(function CaseHistory({ caseId }: { caseId: string }) {
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
      <Suspense fallback={<p className={cx(styles.caseMuted)}>{CASE_PANEL_COPY.historyLoading}</p>}>
        <RichContent content={clinicalCase.description} emptyLabel={CASE_PANEL_COPY.historyEmpty} className={cx(styles.caseRich)} />
      </Suspense>
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
});

export function CasePanel({ caseId, engineCase, objectives, extra }: CasePanelProps) {
  const { open, toggle, close, triggerRef } = useConsoleDrawer(CASE_DRAWER_KEY);
  const drawerId = useId();
  const patient = patientSummary(engineCase);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cx(styles.caseToggle)}
        aria-expanded={open}
        {...(open ? { "aria-controls": drawerId } : {})}
        onClick={toggle}
      >
        <AssignmentIndIcon aria-hidden="true" />
        <span>{open ? CASE_PANEL_COPY.hide : CASE_PANEL_COPY.show}</span>
      </button>
      {open ? (
        <ConsoleDrawer id={drawerId} title={CASE_PANEL_COPY.title} closeLabel={CASE_PANEL_COPY.hide} onClose={() => close()}>
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
          {extra}
        </ConsoleDrawer>
      ) : null}
    </>
  );
}
