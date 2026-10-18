/*
* Funcionalidad: Case test run
* Descripción: Server test run of a stored clinical case (T12), shown in a dialog from the editor tools and from the
*   case list row: a form with the simulated seconds (1–1800, default 300) and an optional seed, validated before the
*   request (messages on their fields); while POST /test-run is in flight a loading state; a failure as an error alert
*   (the form stays to try again); the result as a summary (engine version, simulated seconds, the seed used, to
*   repeat it) plus one shared accessible LineChart per key metric of the returned metrics timeline (SpO2, PaCO2, pH,
*   plateau and driving pressure, Vt/kg PBW, MAP) over the simulated time. It runs the STORED case without any
*   intervention (unsaved draft changes are not included; the contract has no draft test run) and computes no score.
*   Depends on MUI, the design-system components, @shared/charts, @shared/lib, the case tools entity, the test-run
*   hook and the case tools CSS Module.
*   v1.1 (review of ffe9297): the dialog is described by the panel description (aria-describedby) and keeps the last
*   case title during its exit transition.
*   v1.2 (B4, D7): the seconds and seed inputs show INTEGER_HELPER_TEXT (after the seed help).
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useId, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { LineChart } from "@shared/charts";
import { FormField } from "@shared/design-system/components/form-field";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { cx } from "@shared/lib/class-names";
import { INTEGER_HELPER_TEXT } from "@shared/lib/parse-decimal";
import type { ClinicalCaseTestRunDTO } from "../../api/dtos/case-editor.dto";
import type { runClinicalCaseTest } from "../../api/services/case-editor.service";
import { formatSimClock, parseTestRunForm, TEST_RUN_LIMITS, testRunSeries } from "../entities/case-tools.entity";
import type { TestRunForm, TestRunFormErrors } from "../entities/case-tools.entity";
import { useCaseTestRun } from "../hooks/use-case-test-run";
import styles from "../../UI/case-tools.module.css";

// TODO(i18n): move to a case-editor namespace in src/i18n.
export const CASE_TEST_RUN_COPY = {
  title: (caseTitle: string) => `Probar «${caseTitle}»`,
  description: "Ejecuta el motor en el servidor sobre el caso guardado, sin intervenir el ventilador. No es una calificación.",
  dirtyNote: "La prueba usa la versión guardada: los cambios sin guardar no se incluyen.",
  seconds: `Segundos simulados (${TEST_RUN_LIMITS.minSeconds} a ${TEST_RUN_LIMITS.maxSeconds})`,
  seed: "Semilla (opcional)",
  seedHelp: "Vacía: el servidor elige una. Usa la misma semilla para repetir la prueba.",
  run: "Ejecutar prueba",
  running: "Ejecutando la prueba en el servidor…",
  failed: "No se pudo ejecutar la prueba",
  summary: (version: string, seconds: number, seed: number) => `Motor ${version} · ${seconds} s simulados · semilla ${seed}`,
  empty: "La prueba no devolvió métricas para graficar.",
  timeAxis: "Tiempo simulado",
  chartDescription: "Evolución sin intervención del caso guardado.",
  close: "Cerrar",
} as const;

function TestRunCharts({ result }: { result: ClinicalCaseTestRunDTO }) {
  const series = useMemo(() => testRunSeries(result.metricsTimeline), [result.metricsTimeline]);
  const labels = useMemo(() => series.timesMs.map(formatSimClock), [series.timesMs]);
  // Stable datasets per result: the chart rebuilds only when its data props change identity.
  const charts = useMemo(
    () => series.series
      .filter((item) => item.values.some((value) => value !== null))
      .map((item) => ({ ...item, datasets: [{ label: item.label, values: item.values, tone: "primary" as const }] })),
    [series.series],
  );

  if (labels.length === 0 || charts.length === 0) {
    return <p className={cx(styles.note)}>{CASE_TEST_RUN_COPY.empty}</p>;
  }

  return (
    <div className={cx(styles.charts)}>
      {charts.map((item) => (
        <LineChart
          key={item.id}
          title={item.unit ? `${item.label} (${item.unit})` : item.label}
          description={CASE_TEST_RUN_COPY.chartDescription}
          labels={labels}
          datasets={item.datasets}
          categoryAxisLabel={CASE_TEST_RUN_COPY.timeAxis}
          {...(item.unit ? { valueAxisLabel: item.unit } : {})}
        />
      ))}
    </div>
  );
}

export type CaseTestRunPanelProps = {
  caseId: string
  /** The editor has unsaved changes: the run ignores them. */
  dirty?: boolean | undefined
  service?: typeof runClinicalCaseTest | undefined
  /** Id of the description paragraph, for the aria-describedby of a host dialog. */
  descriptionId?: string | undefined
};

export function CaseTestRunPanel({ caseId, dirty = false, service, descriptionId }: CaseTestRunPanelProps) {
  const { state, run } = useCaseTestRun(caseId, service);
  const [form, setForm] = useState<TestRunForm>({ seconds: String(TEST_RUN_LIMITS.defaultSeconds), seed: "" });
  const [errors, setErrors] = useState<TestRunFormErrors>({});
  const running = state.status === "running";

  const submit = (event: FormEvent) => {
    event.preventDefault();

    const parsed = parseTestRunForm(form);

    if (!parsed.ok) {
      setErrors(parsed.errors);

      return;
    }

    setErrors({});
    void run(parsed.request);
  };

  return (
    <div className={cx(styles.dialogBody)}>
      <p className={cx(styles.note)} id={descriptionId}>{CASE_TEST_RUN_COPY.description}</p>
      {dirty ? <Alert severity="info">{CASE_TEST_RUN_COPY.dirtyNote}</Alert> : null}
      <form className={cx(styles.form)} onSubmit={submit} noValidate>
        <FormField
          label={CASE_TEST_RUN_COPY.seconds}
          value={form.seconds}
          inputMode="numeric"
          size="small"
          className={cx(styles.formField)}
          disabled={running}
          error={errors.seconds}
          helperText={INTEGER_HELPER_TEXT}
          onChange={(event) => setForm((current) => ({ ...current, seconds: event.target.value }))}
        />
        <FormField
          label={CASE_TEST_RUN_COPY.seed}
          value={form.seed}
          inputMode="numeric"
          size="small"
          className={cx(styles.formField)}
          disabled={running}
          error={errors.seed}
          helperText={`${CASE_TEST_RUN_COPY.seedHelp} ${INTEGER_HELPER_TEXT}`}
          onChange={(event) => setForm((current) => ({ ...current, seed: event.target.value }))}
        />
        <div className={cx(styles.formActions)}>
          <Button type="submit" variant="contained" disabled={running}>{CASE_TEST_RUN_COPY.run}</Button>
        </div>
      </form>
      {running ? <LoadingState label={CASE_TEST_RUN_COPY.running} /> : null}
      {state.status === "error" ? (
        <Alert severity="error">
          <AlertTitle>{CASE_TEST_RUN_COPY.failed}</AlertTitle>
          {state.message}
        </Alert>
      ) : null}
      {state.status === "done" ? (
        <>
          <p className={cx(styles.summary)} role="status">
            {CASE_TEST_RUN_COPY.summary(state.result.engineVersion, state.result.seconds, state.result.seed)}
          </p>
          <TestRunCharts result={state.result} />
        </>
      ) : null}
    </div>
  );
}

export type CaseTestRunDialogProps = {
  open: boolean
  caseId: string
  caseTitle: string
  dirty?: boolean | undefined
  onClose: () => void
  service?: typeof runClinicalCaseTest | undefined
};

/** The panel in a dialog; closing unmounts it, which aborts a run in flight. */
export function CaseTestRunDialog({ open, caseId, caseTitle, dirty, onClose, service }: CaseTestRunDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  // The host clears the title on close: keep the last one while the dialog plays its exit transition.
  const [shownTitle, setShownTitle] = useState(caseTitle);

  if (open && caseTitle !== shownTitle) {
    setShownTitle(caseTitle);
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" aria-labelledby={titleId} {...(open ? { "aria-describedby": descriptionId } : {})}>
      <DialogTitle id={titleId}>{CASE_TEST_RUN_COPY.title(shownTitle)}</DialogTitle>
      <DialogContent>
        {open ? <CaseTestRunPanel caseId={caseId} dirty={dirty} service={service} descriptionId={descriptionId} /> : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{CASE_TEST_RUN_COPY.close}</Button>
      </DialogActions>
    </Dialog>
  );
}
