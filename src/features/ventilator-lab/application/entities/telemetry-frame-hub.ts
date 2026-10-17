/*
* Funcionalidad: Telemetry frame hub
* Descripción: The console frame source of the real ventilator, one per data origin (sourceId = the reservation id),
*   following the simulator hub (`createConsoleFrameHub`): a stable `source` object ({sourceId, subscribe}) and a `push`
*   that maps a telemetry batch to console samples and hands them synchronously to the subscribed listeners, which the
*   console uses to write them into its curve ring by reference, so a batch costs no React render. It also feeds the
*   sample-rate estimate (`sampleRateHz()`, undefined until known) and returns the samples for the breath detection.
*   Depends on the telemetry sample mapper, the sample-rate estimate and the console contract.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { VentilatorTelemetryFrame } from "@shared/realtime";
import type { ConsoleFrameListener, ConsoleFrameSource, ConsoleSample } from "@shared/ventilator-console";
import { createSampleRateEstimator } from "./sample-rate";
import { createTelemetrySampleMapper } from "./telemetry-samples";

export type TelemetryFrameHub = {
  /** Stable for the hub's life: keep it (or spread it) in the adapter so the console keeps its subscription. */
  source: ConsoleFrameSource
  /** Maps and delivers a batch; returns the delivered samples. */
  push: (frames: readonly VentilatorTelemetryFrame[]) => readonly ConsoleSample[]
  sampleRateHz: () => number | undefined
};

export function createTelemetryFrameHub(sourceId: string): TelemetryFrameHub {
  const listeners = new Set<ConsoleFrameListener>();
  const mapper = createTelemetrySampleMapper();
  const rate = createSampleRateEstimator();

  return {
    source: {
      sourceId,
      subscribe(listener) {
        listeners.add(listener);

        return () => {
          listeners.delete(listener);
        };
      },
    },
    push(frames) {
      const samples = mapper.map(frames);

      if (samples.length > 0) {
        rate.push(samples.map((sample) => sample.tMs));
        listeners.forEach((listener) => listener({ samples }));
      }

      return samples;
    },
    sampleRateHz: () => rate.current(),
  };
}
