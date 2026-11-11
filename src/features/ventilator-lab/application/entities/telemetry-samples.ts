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
*   v1.1 (2026-11-10, real-mode chart): a `deviceTs` that is not epoch ms (outside 1e12..1e13, e.g. the device uptime
*   counter; defense in depth: the backend now sets it only when valid) is ignored and `deviceClock` is never used, so the frame falls back to `serverTs`. On the `serverTs` base the times are made STRICTLY increasing in
*   arrival order: the backend stamps the receipt time in whole ms and batches every 33 ms, so several frames share a
*   millisecond or arrive with network jitter, which drew vertical strokes (a "noise band") and zero-length breath
*   phases. A frame whose receipt time does not move past the previous sample is placed one nominal sample period after
*   it (the mean receipt interval of the last NOMINAL_WINDOW frames); as soon as the receipt time is ahead again it is
*   used as is, so the axis never drifts from the server clock by more than one burst. This is the simplest fix: no
*   resampling, no interpolation, no clock model, and it keeps every frame.
* Versión: 1.1
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

/** Plausible epoch ms range (2001-09-09 .. 2286-11-20); outside it a `deviceTs` is a counter or garbage, not a clock. */
export const MIN_EPOCH_MS = 1e12;
export const MAX_EPOCH_MS = 1e13;

/** Receipt times averaged for the nominal sample period of the `serverTs` base. */
export const NOMINAL_WINDOW = 32;

/** Nominal period before enough receipt times are known (the device publishes 30–60 Hz). */
export const DEFAULT_NOMINAL_PERIOD_MS = 20;

/** Past this lead over the receipt time a spaced frame advances 1 ms only, so the axis falls back to the server clock. */
export const MAX_LEAD_MS = 250;

type TimeBase = "device" | "server";

export type TelemetrySampleMapper = {
  map: (frames: readonly VentilatorTelemetryFrame[]) => ConsoleSample[]
  reset: () => void
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function deviceTimeOf(frame: VentilatorTelemetryFrame): number | null {
  return isFiniteNumber(frame.deviceTs) && frame.deviceTs > MIN_EPOCH_MS && frame.deviceTs < MAX_EPOCH_MS ? frame.deviceTs : null;
}

export function createTelemetrySampleMapper(lateToleranceMs: number = LATE_FRAME_TOLERANCE_MS): TelemetrySampleMapper {
  let base: TimeBase | null = null;
  let origin = 0;
  let lastMs: number | null = null;
  /** Raw receipt times (relative) of the last NOMINAL_WINDOW server-base frames, in arrival order. */
  let receipts: number[] = [];

  const anchor = (nextBase: TimeBase, time: number) => {
    base = nextBase;
    origin = time;
    lastMs = null;
    receipts = [];
  };

  const nominalPeriod = (): number => {
    const first = receipts[0];
    const last = receipts[receipts.length - 1];

    return first !== undefined && last !== undefined && last > first ? (last - first) / (receipts.length - 1) : DEFAULT_NOMINAL_PERIOD_MS;
  };

  return {
    map(frames) {
      const samples: ConsoleSample[] = [];

      for (const frame of frames) {
        const deviceTime = deviceTimeOf(frame);
        const nextBase: TimeBase = deviceTime === null ? "server" : "device";
        const time = deviceTime ?? frame.serverTs;

        if (!isFiniteNumber(time) || !isFiniteNumber(frame.pressure) || !isFiniteNumber(frame.flow) || !isFiniteNumber(frame.volume)) {
          continue;
        }

        // A new time base is a reset (tMs restarts at 0), never a late frame.
        const rebased = base !== nextBase;

        if (rebased) {
          anchor(nextBase, time);
        }

        const raw = time - origin;
        // The previous time on the same scale: the raw receipt on the server base (tMs may lead it), else tMs.
        const previous = nextBase === "server" ? receipts[receipts.length - 1] ?? null : lastMs;
        let tMs = raw;

        if (!rebased && previous !== null && raw < previous) {
          if (previous - raw > lateToleranceMs) {
            // A large jump back: clock reset.
            anchor(nextBase, time);
            tMs = 0;
          } else if (nextBase === "device") {
            // Device clock: a slightly late frame is dropped.
            continue;
          }
        }

        if (nextBase === "server") {
          receipts = [...receipts, tMs].slice(-NOMINAL_WINDOW);

          if (lastMs !== null && tMs <= lastMs) {
            // Same millisecond, jitter or a burst: one nominal period after the previous sample, in arrival order.
            tMs = lastMs + (lastMs - tMs > MAX_LEAD_MS ? 1 : nominalPeriod());
          }
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
      receipts = [];
    },
  };
}
