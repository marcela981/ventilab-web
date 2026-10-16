/*
* Funcionalidad: useConsoleWaveforms
* Descripción: Connects the adapter frame source to a WaveformRingBuffer for the console curves. The buffer lives for the whole component (the canvases read it directly, never React state); the hook subscribes on mount, pushes every batch of pressure/flow/volume samples into the ring, clears it when the source changes and unsubscribes on unmount. Depends on React and @shared/waveforms.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useState } from "react";
import { WaveformRingBuffer } from "@shared/waveforms";
import { CONSOLE_BUFFER_CAPACITY, CURVE_IDS } from "./config/console.config";
import type { CurveId } from "./config/console.config";
import type { ConsoleFrameSource, ConsoleSampleBatch } from "./ventilator-console.entity";

export function pushConsoleBatch(buffer: WaveformRingBuffer<CurveId>, batch: ConsoleSampleBatch): void {
  for (const sample of batch.samples) {
    buffer.push({ tMs: sample.tMs, values: { pressure: sample.pressure, flow: sample.flow, volume: sample.volume } });
  }
}

export function useConsoleWaveforms(frames: ConsoleFrameSource, capacity = CONSOLE_BUFFER_CAPACITY): WaveformRingBuffer<CurveId> {
  const [buffer] = useState(() => new WaveformRingBuffer<CurveId>({ channels: CURVE_IDS, capacity }));

  useEffect(() => {
    buffer.clear();

    return frames.subscribe((batch) => {
      pushConsoleBatch(buffer, batch);
    });
  }, [buffer, frames]);

  return buffer;
}
