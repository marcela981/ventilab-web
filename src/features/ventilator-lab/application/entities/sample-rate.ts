/*
* Funcionalidad: Telemetry sample-rate estimate
* Descripción: Estimates the samples per second of the live telemetry from the sample times, because the live batch
*   carries no `sampleRateHz` (the device publishes 30–60 Hz). Keeps the times of the last windowMs, estimates
*   (count - 1) / span once the span reaches minSpanMs, rounds to stepHz steps (capped at maxHz) and only publishes a
*   larger value than the one already published: the console recreates (clears) its curve ring when the rate changes, so
*   jitter must not move it, and a ring sized for a higher rate only keeps more history. A time going backwards (clock
*   reset) restarts the window. Pure state, no React.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type SampleRateOptions = { windowMs: number, minSpanMs: number, stepHz: number, maxHz: number };

export const DEFAULT_SAMPLE_RATE_OPTIONS: SampleRateOptions = { windowMs: 2000, minSpanMs: 1000, stepHz: 10, maxHz: 200 };

export type SampleRateEstimator = {
  /** Adds sample times (ms) and returns the published rate (undefined until there is enough data). */
  push: (times: readonly number[]) => number | undefined
  current: () => number | undefined
  reset: () => void
};

export function createSampleRateEstimator(overrides: Partial<SampleRateOptions> = {}): SampleRateEstimator {
  const options: SampleRateOptions = { ...DEFAULT_SAMPLE_RATE_OPTIONS, ...overrides };
  let times: number[] = [];
  let published: number | undefined;

  const estimate = (): number | undefined => {
    const first = times[0];
    const last = times[times.length - 1];

    if (first === undefined || last === undefined || last - first < options.minSpanMs) {
      return undefined;
    }

    const hz = ((times.length - 1) * 1000) / (last - first);

    return Math.min(options.maxHz, Math.max(options.stepHz, Math.round(hz / options.stepHz) * options.stepHz));
  };

  return {
    push(newTimes) {
      for (const time of newTimes) {
        const last = times[times.length - 1];

        if (last !== undefined && time < last) {
          times = [];
        }

        times.push(time);
      }

      const latest = times[times.length - 1];

      if (latest !== undefined) {
        const from = times.findIndex((time) => time >= latest - options.windowMs);
        times = times.slice(Math.max(0, from));
      }

      const next = estimate();

      if (next !== undefined && (published === undefined || next > published)) {
        published = next;
      }

      return published;
    },
    current: () => published,
    reset() {
      times = [];
      published = undefined;
    },
  };
}
