/*
* Funcionalidad: Lazy line chart loader
* Descripción: Dynamically imports Chart.js (with retryImport) and registers only what a line chart needs:
*   LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip and Legend. Like loadBarChart, it
*   keeps Chart.js out of every eager chunk; the import only runs when a LineChart mounts. Depends on chart.js and
*   @shared/lib/retry-import.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { retryImport } from "@shared/lib/retry-import";
import type { ChartConstructor } from "./load-bar-chart";

export async function loadLineChart(): Promise<ChartConstructor> {
  const chartJs = await retryImport(() => import("chart.js"));

  chartJs.Chart.register(
    chartJs.LineController,
    chartJs.LineElement,
    chartJs.PointElement,
    chartJs.CategoryScale,
    chartJs.LinearScale,
    chartJs.Tooltip,
    chartJs.Legend,
  );

  return chartJs.Chart;
}
