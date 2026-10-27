/*
* Funcionalidad: Ventilator lab recordings entry point
* Descripción: Public entry point of the real-ventilator recordings (W9, Bloque 1) for the Mis sesiones tab of
*   /simulador, without the lab barrel or its pages: the recording rows of one 31-day window (useRecordingsList and
*   recordingsRange), the download and index of one recording (useRecording) with its load states, the LAZY read-only
*   player (console, waveforms and Chart.js stay in its own chunk), the Spanish copy, duration and clock formats and
*   error messages of a recording. Depends on the ventilator-lab application layer.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export { useRecording, useRecordingsList } from "./application/hooks/use-recordings";
export type { RecordingLoadState, RecordingResult, RecordingsListResult } from "./application/hooks/use-recordings";
export {
  formatRecordingDuration,
  getRecordingErrorMessage,
  RECORDINGS_COPY,
  RECORDINGS_RANGE_DAYS,
  recordingsRange,
} from "./application/entities/recordings-list.entity";
export type { RecordingRow, RecordingsRange } from "./application/entities/recordings-list.entity";
export type { RecordingIndex } from "./application/entities/recording-index";
export { formatPlaybackClock } from "./application/entities/playback-engine";
export { LazyRecordingPlayer } from "./application/components/lazy-recording-player";
