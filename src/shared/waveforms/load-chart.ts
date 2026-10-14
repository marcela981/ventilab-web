/*
* Funcionalidad: Lazy Chart.js loader
* Descripción: Dynamically imports Chart.js (with retryImport) and registers only what a live line chart needs: LineController, LineElement, PointElement, LinearScale, Tooltip, Legend and Decimation. Keeps Chart.js out of every First Load JS. Depends on chart.js and lib/retry-import.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { Chart } from "chart.js";
import { retryImport } from "@shared/lib/retry-import";

export type ChartConstructor = typeof Chart;

export async function loadChart(): Promise<ChartConstructor> {
  const chartJs = await retryImport(() => import("chart.js"));

  chartJs.Chart.register(
    chartJs.LineController,
    chartJs.LineElement,
    chartJs.PointElement,
    chartJs.LinearScale,
    chartJs.Tooltip,
    chartJs.Legend,
    chartJs.Decimation,
  );

  return chartJs.Chart;
}
