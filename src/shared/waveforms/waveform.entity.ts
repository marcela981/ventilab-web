/*
* Funcionalidad: Waveform types
* Descripción: Typed series model shared by the simulator and the real ventilator: points `{t, v}` (t in seconds, v in the series unit), series identity/label/unit, optional palette tone, y-range and the resolved color map. No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type WaveformPoint = {
  t: number
  v: number
};

export const WAVEFORM_TONES = ["primary", "secondary", "error", "info", "success", "warning"] as const;

export type WaveformTone = (typeof WAVEFORM_TONES)[number];

export type WaveformSeries = {
  key: string
  label: string
  unit: string
  points: readonly WaveformPoint[]
  tone?: WaveformTone
};

export type WaveformRange = {
  min: number
  max: number
};

export type WaveformColors = Record<WaveformTone, string>;
