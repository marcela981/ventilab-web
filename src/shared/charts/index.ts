/*
* Funcionalidad: charts public API
* Descripción: Public surface of the shared charts module: the accessible BarChart (vertical or horizontal, with a visually hidden fallback table) and its typed dataset model. Chart.js itself is an internal lazy chunk loaded only when a chart mounts; consumers that want the chart component out of their page chunk lazy-load the component that uses it. v1.1: the accessible LineChart (same dataset model and fallback table, values over an ordered category axis such as sampled times).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { BarChart } from "./bar-chart";
export type { BarChartProps } from "./bar-chart";
export { BAR_TONES } from "./bar-chart.entity";
export type { BarDataset, BarTone } from "./bar-chart.entity";
export { LineChart } from "./line-chart";
export type { LineChartProps } from "./line-chart";
