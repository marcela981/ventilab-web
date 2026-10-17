/*
* Funcionalidad: Telemetry sample mapper
* Descripción: Maps the frames of a `ventilator:telemetry` batch to console samples ({tMs, pressure cmH2O, flow L/min,
*   volume mL}; the telemetry units already match the console). Time base: the device clock (`deviceTs`) when the frame
*   has one, else the backend receipt time (`serverTs`); `tMs` is relative to the first frame of the current time base,
*   so it stays small and monotonic non-decreasing. Following the console ring contract (a backwards time is a clock
*   reset that clears the curves): a frame slightly in the past (reordered or late, within lateToleranceMs) is
*   dropped, a larger jump back (device reboot, clock change) or a change of time base restarts at tMs 0, which the
*   ring takes as a reset. Frames with a non-finite time, pressure, flow or volume are dropped. Stateful per source,
*   deterministic, no React. Depends on the realtime frame type and the console sample type.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { VentilatorTelemetryFrame } from "@shared/realtime";
import type { ConsoleSample } from "@shared/ventilator-console";

/** A frame at most this far in the past is a late/reordered frame (dropped); further back is a clock reset. */
export const LATE_FRAME_TOLERANCE_MS = 1000;

type TimeBase = "device" | "server";

export type TelemetrySampleMapper = {
  map: (frames: readonly VentilatorTelemetryFrame[]) => ConsoleSample[]
  reset: () => void
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function createTelemetrySampleMapper(lateToleranceMs: number = LATE_FRAME_TOLERANCE_MS): TelemetrySampleMapper {
  let base: TimeBase | null = null;
  let origin = 0;
  let lastMs: number | null = null;

  const anchor = (nextBase: TimeBase, time: number) => {
    base = nextBase;
    origin = time;
  };

  return {
    map(frames) {
      const samples: ConsoleSample[] = [];

      for (const frame of frames) {
        const nextBase: TimeBase = isFiniteNumber(frame.deviceTs) ? "device" : "server";
        const time = nextBase === "device" ? frame.deviceTs : frame.serverTs;

        if (!isFiniteNumber(time) || !isFiniteNumber(frame.pressure) || !isFiniteNumber(frame.flow) || !isFiniteNumber(frame.volume)) {
          continue;
        }

        // A new time base is a reset (tMs restarts at 0), never a late frame.
        const rebased = base !== nextBase;

        if (rebased) {
          anchor(nextBase, time);
        }

        let tMs = time - origin;

        if (!rebased && lastMs !== null && tMs < lastMs) {
          if (lastMs - tMs <= lateToleranceMs) {
            continue;
          }

          anchor(nextBase, time);
          tMs = 0;
        }

        lastMs = tMs;
        samples.push({ tMs, pressure: frame.pressure, flow: frame.flow, volume: frame.volume });
      }

      return samples;
    },
    reset() {
      base = null;
      origin = 0;
      lastMs = null;
    },
  };
}
