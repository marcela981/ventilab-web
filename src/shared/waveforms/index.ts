/*
* Funcionalidad: waveforms public API
* Descripción: Public surface of the shared waveform chart: WaveformChart, the typed series model and the pure series-to-dataset mapping helpers. Chart.js itself is an internal lazy chunk.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { WaveformChart } from "./waveform-chart";
export type { WaveformChartProps } from "./waveform-chart";
export { formatSeriesLabel, resolveTimeRange, resolveTone, sliceToWindow, toChartDatasets } from "./waveform-data";
export type { WaveformDataset } from "./waveform-data";
export { WAVEFORM_TONES } from "./waveform.entity";
export type { WaveformColors, WaveformPoint, WaveformRange, WaveformSeries, WaveformTone } from "./waveform.entity";
