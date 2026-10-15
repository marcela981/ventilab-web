/*
* Funcionalidad: EvaluationResultsCharts
* Descripción: Charts of the evaluation results page, drawn with the shared BarChart: the grade histogram exactly as the API buckets it (0.5 wide, labels such as "3,0–3,5", graded attempts per bucket) and the difficulty index of each question as horizontal bars on a 0–1 axis formatted as es-CO percentages (no value when the API has none). Nothing is computed here, only labeled and formatted. Loaded lazily by the results page so Chart.js and this code stay in a deferred chunk. Depends on React, @shared/charts, the evaluation results entities and the CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useMemo } from "react";
import { BarChart } from "@shared/charts";
import type { BarDataset } from "@shared/charts";
import { cx } from "@shared/lib/class-names";
import { formatCount, formatHistogramLabel, formatRate, questionLabel } from "../../entities/evaluation-results.entity";
import type { HistogramBin, QuestionStat } from "../../entities/evaluation-results.entity";
import styles from "../../../UI/evaluation-results.module.css";

// TODO(i18n): move to a grading namespace in src/i18n.
export const RESULTS_CHARTS_COPY = {
  histogramTitle: "Distribución de notas",
  histogramDescription: "Intentos calificados en cada rango de nota de 0,5.",
  histogramCategory: "Nota",
  histogramValue: "Intentos",
  difficultyTitle: "Índice de dificultad por pregunta",
  difficultyDescription: "Proporción media del puntaje obtenido en cada pregunta; un valor más bajo indica una pregunta más difícil.",
  difficultyCategory: "Pregunta",
  difficultyValue: "Índice de dificultad",
} as const;

export type EvaluationResultsChartsProps = {
  histogram: readonly HistogramBin[]
  questions: readonly QuestionStat[]
};

export function EvaluationResultsCharts({ histogram, questions }: EvaluationResultsChartsProps) {
  const histogramLabels = useMemo(() => histogram.map(formatHistogramLabel), [histogram]);
  const histogramData = useMemo<BarDataset[]>(
    () => [{ label: RESULTS_CHARTS_COPY.histogramValue, values: histogram.map((bin) => bin.count), tone: "primary" }],
    [histogram],
  );
  const sortedQuestions = useMemo(() => [...questions].sort((a, b) => a.order - b.order), [questions]);
  const questionLabels = useMemo(() => sortedQuestions.map(questionLabel), [sortedQuestions]);
  const difficultyData = useMemo<BarDataset[]>(
    () => [{ label: RESULTS_CHARTS_COPY.difficultyValue, values: sortedQuestions.map((stat) => stat.difficultyIndex), tone: "secondary" }],
    [sortedQuestions],
  );

  return (
    <div className={cx(styles.charts)}>
      <div className={cx(styles.chartCard)}>
        <BarChart
          title={RESULTS_CHARTS_COPY.histogramTitle}
          description={RESULTS_CHARTS_COPY.histogramDescription}
          labels={histogramLabels}
          datasets={histogramData}
          categoryAxisLabel={RESULTS_CHARTS_COPY.histogramCategory}
          valueAxisLabel={RESULTS_CHARTS_COPY.histogramValue}
          formatValue={formatCount}
        />
      </div>
      {sortedQuestions.length > 0 ? (
        <div className={cx(styles.chartCard)}>
          <BarChart
            title={RESULTS_CHARTS_COPY.difficultyTitle}
            description={RESULTS_CHARTS_COPY.difficultyDescription}
            labels={questionLabels}
            datasets={difficultyData}
            categoryAxisLabel={RESULTS_CHARTS_COPY.difficultyCategory}
            valueAxisLabel={RESULTS_CHARTS_COPY.difficultyValue}
            valueMax={1}
            formatValue={formatRate}
            horizontal
          />
        </div>
      ) : null}
    </div>
  );
}
