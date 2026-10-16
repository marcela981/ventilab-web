/*
* Funcionalidad: useConsoleWaveforms
* Descripción: Connects the adapter frame source to a WaveformRingBuffer for the console curves. The buffer lives for the whole component (the canvases read it directly, never React state); the hook subscribes on mount, pushes every batch of pressure/flow/volume samples into the ring, clears it when the source changes and unsubscribes on unmount. Depends on React and @shared/waveforms. v1.1: the subscription is keyed by the source identity (`sourceId`, or the `subscribe` function identity when absent), not by the frame source object, so a consumer that rebuilds its adapter every render keeps the curves; the latest `subscribe` is kept in a ref. The ring capacity follows the declared `sampleRateHz` (default 50 Hz) and the ring is recreated when it changes.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect, useRef, useState } from "react";
import { WaveformRingBuffer } from "@shared/waveforms";
import { CURVE_IDS, consoleBufferCapacity } from "./config/console.config";
import type { CurveId } from "./config/console.config";
import type { ConsoleFrameSource, ConsoleSampleBatch } from "./ventilator-console.entity";

type RingState = { capacity: number, buffer: WaveformRingBuffer<CurveId> };

function createRing(capacity: number): RingState {
  return { capacity, buffer: new WaveformRingBuffer<CurveId>({ channels: CURVE_IDS, capacity }) };
}

export function pushConsoleBatch(buffer: WaveformRingBuffer<CurveId>, batch: ConsoleSampleBatch): void {
  for (const sample of batch.samples) {
    buffer.push({ tMs: sample.tMs, values: { pressure: sample.pressure, flow: sample.flow, volume: sample.volume } });
  }
}

/**
 * Ring buffer fed by `frames`. `frames` should be stable per data source: the hook resubscribes and clears the curves
 * only when `frames.sourceId` changes (or, without `sourceId`, when the `frames.subscribe` identity changes), so a new
 * adapter object for the same source keeps the subscription and the buffered curves. A new `sampleRateHz` recreates
 * the ring with the matching capacity.
 */
export function useConsoleWaveforms(frames: ConsoleFrameSource): WaveformRingBuffer<CurveId> {
  const capacity = consoleBufferCapacity(frames.sampleRateHz);
  const [ring, setRing] = useState(() => createRing(capacity));
  const subscribeRef = useRef(frames.subscribe);
  const sourceKey: string | ConsoleFrameSource["subscribe"] = frames.sourceId ?? frames.subscribe;
  let current = ring;

  // Adjust state during render: a new rate replaces the ring before the canvases read it.
  if (ring.capacity !== capacity) {
    current = createRing(capacity);
    setRing(current);
  }

  const { buffer } = current;

  // Declared before the subscription effect so it runs first and the subscription reads the latest function.
  useEffect(() => {
    subscribeRef.current = frames.subscribe;
  });

  useEffect(() => {
    buffer.clear();

    return subscribeRef.current((batch) => {
      pushConsoleBatch(buffer, batch);
    });
  }, [buffer, sourceKey]);

  return buffer;
}
