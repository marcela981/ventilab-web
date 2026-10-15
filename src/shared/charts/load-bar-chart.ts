/*
* Funcionalidad: Lazy bar chart loader
* Descripción: Dynamically imports Chart.js (with retryImport) and registers only what a bar chart needs: BarController, BarElement, CategoryScale, LinearScale, Tooltip and Legend. Keeps Chart.js out of every eager chunk; the import only runs when a BarChart mounts. Depends on chart.js and @shared/lib/retry-import.
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

export async function loadBarChart(): Promise<ChartConstructor> {
  const chartJs = await retryImport(() => import("chart.js"));

  chartJs.Chart.register(
    chartJs.BarController,
    chartJs.BarElement,
    chartJs.CategoryScale,
    chartJs.LinearScale,
    chartJs.Tooltip,
    chartJs.Legend,
  );

  return chartJs.Chart;
}
