/*
* Funcionalidad: PatientFormPanel
* Descripción: Simular Paciente tab of /simulador (W8, Bloque 1; FLUJOS_JULIO a.3–a.4, DISENO_BLOQUE1 §2.1): the July
*   "Configuración del Paciente" with the "Módulo de Pacientes Simulados" (Cargar caso: published cases with filters;
*   Aleatorio: a plausible random patient), the stepper "Paciente y Condición" → "Estado Actual y Resumen" and the
*   July buttons Limpiar, ← Atrás, Siguiente → / Enviar al Monitoreo. The draft lives in a reducer of this panel, which
*   the workspace keeps mounted, so it survives tab switches. Siguiente validates step 1; Enviar al Monitoreo validates
*   both steps (going back to the first one with an error), maps the form to the SimulatedPatientDTO and starts a FREE
*   session with it (plus the loaded base case, if any); once the session exists the workspace opens it in Monitoreo.
*   The send is disabled while pending and a failure is shown in Spanish. Depends on React, MUI (Alert, Button,
*   Stepper), the simulator patient entry point, the workspace session, the form entity, metrics, random patient and
*   mapper, the step components, the load case dialog and the patient form styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import { useCallback, useMemo, useReducer, useState } from "react";
import { useStartPractice } from "@features/simulator/patient.entry";
import type { CasePatientPreset } from "@features/simulator/patient.entry";
import { cx } from "@shared/lib/class-names";
import {
  INITIAL_PATIENT_FORM_STATE,
  parseFormNumber,
  patientFormReducer,
  validatePatientForm,
} from "../../entities/patient-form.entity";
import type { PatientFormValues } from "../../entities/patient-form.entity";
import { computePatientMetrics } from "../../entities/patient-metrics.entity";
import { RANDOM_PATIENT_NOTICE, randomPatientValues } from "../../entities/random-patient.entity";
import { presetToFormValues, toSimulatedPatient } from "../../patient-form.mapper";
import { useWorkspaceSession } from "../workspace-session-provider";
import { LoadCaseDialog } from "./load-case-dialog";
import { PatientStep } from "./patient-step";
import { VitalsStep } from "./vitals-step";
import styles from "../../../UI/patient-form/patient-form.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const PATIENT_FORM_COPY = {
  title: "Configuración del Paciente",
  moduleTitle: "Módulo de Pacientes Simulados",
  moduleNote: "Carga un caso clínico publicado, genera un paciente aleatorio o llena el formulario a mano.",
  loadCase: "Cargar caso",
  random: "Aleatorio",
  baseCase: (title: string) => `Caso base: ${title}`,
  caseLoaded: (title: string) => `Historia clínica "${title}" cargada.`,
  steps: ["Paciente y Condición", "Estado Actual y Resumen"],
  reset: "Limpiar",
  back: "← Atrás",
  next: "Siguiente →",
  submit: "Enviar al Monitoreo",
  submitting: "Enviando…",
} as const;

export function PatientFormPanel() {
  const { start } = useWorkspaceSession();
  const practice = useStartPractice({ onStarted: start });
  const [state, dispatch] = useReducer(patientFormReducer, INITIAL_PATIENT_FORM_STATE);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { values, step, errors, loadedCase, notice } = state;

  const metrics = useMemo(
    () => computePatientMetrics(values.sex === "" ? null : values.sex, parseFormNumber(values.height), parseFormNumber(values.weight)),
    [values.height, values.sex, values.weight],
  );

  const change = useCallback((patch: Partial<PatientFormValues>) => dispatch({ type: "change", patch }), []);

  const loadPreset = useCallback((preset: CasePatientPreset) => {
    dispatch({
      type: "load",
      values: presetToFormValues(preset),
      loadedCase: { id: preset.caseId, title: preset.title },
      notice: PATIENT_FORM_COPY.caseLoaded(preset.title),
    });
    setDialogOpen(false);
  }, []);

  const loadRandom = () => {
    dispatch({ type: "load", values: randomPatientValues(), loadedCase: null, notice: RANDOM_PATIENT_NOTICE });
  };

  const submit = async() => {
    const invalid = validatePatientForm(values);

    if (invalid) {
      dispatch({ type: "invalid", ...invalid });

      return;
    }

    const patient = toSimulatedPatient(values);

    if (patient !== null) {
      await practice.startWithPatient(patient, { caseId: loadedCase?.id });
    }
  };

  const isLastStep = step === PATIENT_FORM_COPY.steps.length - 1;

  return (
    <section className={cx(styles.panel)} aria-labelledby="workspace-patient-form-title">
      <h2 id="workspace-patient-form-title" className={cx(styles.title)}>{PATIENT_FORM_COPY.title}</h2>

      <div className={cx(styles.loader)}>
        <h3 className={cx(styles.loaderTitle)}>{PATIENT_FORM_COPY.moduleTitle}</h3>
        <p className={cx(styles.muted)}>{PATIENT_FORM_COPY.moduleNote}</p>
        <div className={cx(styles.loaderActions)}>
          <Button variant="contained" onClick={() => setDialogOpen(true)}>{PATIENT_FORM_COPY.loadCase}</Button>
          <Button variant="outlined" onClick={loadRandom}>{PATIENT_FORM_COPY.random}</Button>
        </div>
        {loadedCase ? <p className={cx(styles.baseCase)}>{PATIENT_FORM_COPY.baseCase(loadedCase.title)}</p> : null}
      </div>

      {notice ? (
        <Alert severity="success" onClose={() => dispatch({ type: "dismissNotice" })}>{notice}</Alert>
      ) : null}
      {practice.error ? <Alert severity="error">{practice.error.message}</Alert> : null}

      <Stepper activeStep={step} className={cx(styles.stepper)}>
        {PATIENT_FORM_COPY.steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {step === 0 ? (
        <PatientStep values={values} errors={errors} metrics={metrics} onChange={change} />
      ) : (
        <VitalsStep values={values} errors={errors} metrics={metrics} onChange={change} />
      )}

      <div className={cx(styles.actions)}>
        <Button variant="outlined" color="inherit" onClick={() => dispatch({ type: "reset" })}>{PATIENT_FORM_COPY.reset}</Button>
        {step > 0 ? <Button variant="outlined" onClick={() => dispatch({ type: "back" })}>{PATIENT_FORM_COPY.back}</Button> : null}
        {isLastStep ? (
          <Button variant="contained" disabled={practice.isPending} onClick={() => void submit()}>
            {practice.isPending ? PATIENT_FORM_COPY.submitting : PATIENT_FORM_COPY.submit}
          </Button>
        ) : (
          <Button variant="contained" onClick={() => dispatch({ type: "next" })}>{PATIENT_FORM_COPY.next}</Button>
        )}
      </div>

      <LoadCaseDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onLoaded={loadPreset} />
    </section>
  );
}
