/*
* Funcionalidad: Recording player
* Descripción: Lazily loaded module of /lab/recordings/[recordingId]: plays the recording index in the shared
*   VentilatorConsole read-only
*   (useRecordingPlayback: canControl false, no-op confirm, derived metrics of the played frames, patient monitor per
*   data) with the playback transport. This module and its imports (console, waveforms, Chart.js) stay out of every
*   other /lab chunk. v1.1 (T11 review fix): receives the INDEX (the page indexes while downloading and keeps no raw
*   frames) and hands the recording gaps to the transport. Depends on the shared console, the playback hook and the
*   transport.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { VentilatorConsole } from "@shared/ventilator-console";
import type { RecordingIndex } from "../entities/recording-index";
import { useRecordingPlayback } from "../hooks/use-recording-playback";
import { PlaybackTransport } from "./playback-transport";

const DEFAULT_STEP_MS = 100;

export type RecordingPlayerProps = { index: RecordingIndex };

export function RecordingPlayer({ index }: RecordingPlayerProps) {
  const playback = useRecordingPlayback(index);
  const stepMs = index.sampleRateHz ? Math.round(1000 / index.sampleRateHz) : DEFAULT_STEP_MS;

  return (
    <>
      <PlaybackTransport
        playing={playback.playing}
        speed={playback.speed}
        positionMs={playback.positionMs}
        durationMs={playback.durationMs}
        stepMs={stepMs}
        onPlay={playback.play}
        onPause={playback.pause}
        onSpeedChange={playback.setSpeed}
        onSeek={playback.seek}
        gaps={index.gaps}
      />
      <VentilatorConsole adapter={playback.adapter} variant="live" />
    </>
  );
}
