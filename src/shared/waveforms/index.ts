/*
* Funcionalidad: waveforms public API
* Descripción: Public surface of the shared waveform chart: WaveformChart, the typed series model and the pure series-to-dataset mapping helpers. Chart.js itself is an internal lazy chunk. v1.1 (T2 simulation): adds the raw canvas live renderers (WaveformRingBuffer, SweepCanvas with sweep/scroll, freeze and measurement cursor, LoopCanvas for P-V/F-V, useWaveformRenderer) and their pure geometry helpers.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { WaveformRingBuffer } from "./waveform-ring-buffer";
export type { WaveformFrame, WaveformRingBufferOptions, WaveformWindow } from "./waveform-ring-buffer";
export {
  computeAutoRange,
  computeLanes,
  eraseSpans,
  extractLoop,
  findNearestIndex,
  formatCursorReadout,
  niceTicks,
  pixelToTime,
  scrollX,
  sweepRatio,
  sweepX,
  valueToX,
  valueToY,
} from "./waveform-geometry";
export type { CursorReadoutEntry, Lane, LoopPoints, PlotSpan, WaveformDisplayMode } from "./waveform-geometry";
export { DEFAULT_WAVEFORM_FPS, resolveCanvasColor, resolveCanvasFont, useWaveformRenderer } from "./use-waveform-renderer";
export type { WaveformRenderer, WaveformRendererOptions, WaveformRenderFrame } from "./use-waveform-renderer";
export { SweepCanvas } from "./sweep-canvas";
export type { SweepCanvasProps } from "./sweep-canvas";
export type { SweepChannel } from "./sweep-painter";
export { LoopCanvas } from "./loop-canvas";
export type { LoopCanvasProps } from "./loop-canvas";
export type { LoopAxis } from "./loop-painter";
export { WaveformChart } from "./waveform-chart";
export type { WaveformChartProps } from "./waveform-chart";
export { formatSeriesLabel, resolveTimeRange, resolveTone, sliceToWindow, toChartDatasets } from "./waveform-data";
export type { WaveformDataset } from "./waveform-data";
export { WAVEFORM_TONES } from "./waveform.entity";
export type { WaveformColors, WaveformPoint, WaveformRange, WaveformSeries, WaveformTone } from "./waveform.entity";
