/*
* Funcionalidad: Waveform ring buffer
* Descripción: Fixed-capacity ring per channel (Float32Array) plus a Float64Array time axis for live waveform streams. Single and batch push, chronological reads (all, time window, since a write sequence), clear with a generation counter so renderers can detect resets. Generic over channel names; no dependency on the simulation engine. v1.1: binary search for the window start and end, plus `createWindow` / `readWindowInto` / `readSinceInto` that reuse a preallocated window so a render frame allocates nothing (a window's arrays may be longer than `length`). v1.2: times are monotonic non-decreasing per source; `push` treats a time going backwards as a clock reset and clears the ring (new generation) before storing the sample, so the binary search always sees sorted times.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

/**
 * One sample at time `tMs` (milliseconds) with one value per channel. Missing channels are stored as NaN. `tMs` must be
 * monotonic non-decreasing within one stream; a backwards time resets the ring (see `WaveformRingBuffer.push`).
 */
export type WaveformFrame<C extends string> = {
  tMs: number
  values: Partial<Record<C, number>>
};

/** Chronological copy of part of the ring. `firstSequence` is the write sequence of index 0. */
export type WaveformWindow<C extends string> = {
  t: Float64Array
  values: Record<C, Float32Array>
  length: number
  firstSequence: number
};

export type WaveformRingBufferOptions<C extends string> = {
  channels: readonly C[]
  capacity: number
};

/** Ring of samples whose times are monotonic non-decreasing; a backwards time clears it (clock reset). */
export class WaveformRingBuffer<C extends string> {
  public readonly channels: readonly C[];
  public readonly capacity: number;

  private readonly times: Float64Array;
  private readonly data: Record<C, Float32Array>;
  private written = 0;
  private resets = 0;

  public constructor(options: WaveformRingBufferOptions<C>) {
    if (!Number.isInteger(options.capacity) || options.capacity <= 0) {
      throw new RangeError("WaveformRingBuffer capacity must be a positive integer");
    }

    this.channels = [...options.channels];
    this.capacity = options.capacity;
    this.times = new Float64Array(options.capacity);
    this.data = Object.fromEntries(
      this.channels.map((channel) => [channel, new Float32Array(options.capacity)]),
    ) as Record<C, Float32Array>;
  }

  /** Total samples pushed since the last clear (monotonic sequence). */
  public get writeCount(): number {
    return this.written;
  }

  /** Incremented by every clear, so a renderer can detect a reset stream. */
  public get generation(): number {
    return this.resets;
  }

  public get size(): number {
    return Math.min(this.written, this.capacity);
  }

  public get latestTime(): number | null {
    return this.written === 0 ? null : this.timeAt(this.written - 1);
  }

  /**
   * Appends one sample. Times must be monotonic non-decreasing per source (the window reads binary-search them); a time
   * that goes backwards is taken as a clock reset (source restart, device reboot): the ring is cleared first, which
   * bumps `generation` so painters repaint in full, and the sample starts the new stream.
   */
  public push(frame: WaveformFrame<C>): void {
    const latest = this.latestTime;

    if (latest !== null && frame.tMs < latest) {
      this.clear();
    }

    const slot = this.written % this.capacity;
    this.times[slot] = frame.tMs;

    for (const channel of this.channels) {
      this.data[channel][slot] = frame.values[channel] ?? Number.NaN;
    }

    this.written += 1;
  }

  public pushBatch(frames: readonly WaveformFrame<C>[]): void {
    for (const frame of frames) {
      this.push(frame);
    }
  }

  public clear(): void {
    this.written = 0;
    this.resets += 1;
  }

  public readAll(): WaveformWindow<C> {
    return this.copyRange(this.oldestSequence(), this.written, this.allocate(this.size));
  }

  /** Samples with `fromMs <= t <= toMs`, oldest first. */
  public readWindow(fromMs: number, toMs: number = Number.POSITIVE_INFINITY): WaveformWindow<C> {
    const [start, end] = this.windowBounds(fromMs, toMs);

    return this.copyRange(start, end, this.allocate(end - start));
  }

  /** Samples written at or after `sequence`, clamped to the oldest sample still kept. */
  public readSince(sequence: number): WaveformWindow<C> {
    const start = Math.max(sequence, this.oldestSequence());

    return this.copyRange(start, this.written, this.allocate(this.written - start));
  }

  /** A window with room for the whole ring, meant to be reused by the `*Into` reads. */
  public createWindow(): WaveformWindow<C> {
    return this.allocate(this.capacity);
  }

  /** `readWindow` into `target` (arrays reused, `length` and `firstSequence` updated); allocates nothing. */
  public readWindowInto(target: WaveformWindow<C>, fromMs: number, toMs: number = Number.POSITIVE_INFINITY): WaveformWindow<C> {
    const [start, end] = this.windowBounds(fromMs, toMs);

    return this.copyRange(start, end, target);
  }

  /** `readSince` into `target`; allocates nothing. */
  public readSinceInto(target: WaveformWindow<C>, sequence: number): WaveformWindow<C> {
    return this.copyRange(Math.max(sequence, this.oldestSequence()), this.written, target);
  }

  private oldestSequence(): number {
    return Math.max(0, this.written - this.capacity);
  }

  private timeAt(sequence: number): number {
    return this.times[sequence % this.capacity] ?? Number.NaN;
  }

  /** First sequence in `[from, to)` whose time is not below `ms`; times are ascending. */
  private lowerBound(ms: number, from: number, to: number, inclusive: boolean): number {
    let low = from;
    let high = to;

    while (low < high) {
      const mid = (low + high) >> 1;
      const time = this.timeAt(mid);

      if (inclusive ? time <= ms : time < ms) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    return low;
  }

  private windowBounds(fromMs: number, toMs: number): [number, number] {
    const start = this.lowerBound(fromMs, this.oldestSequence(), this.written, false);

    return [start, this.lowerBound(toMs, start, this.written, true)];
  }

  private allocate(length: number): WaveformWindow<C> {
    const size = Math.max(0, length);
    const values = Object.fromEntries(
      this.channels.map((channel) => [channel, new Float32Array(size)]),
    ) as Record<C, Float32Array>;

    return { t: new Float64Array(size), values, length: 0, firstSequence: 0 };
  }

  private copyRange(start: number, end: number, target: WaveformWindow<C>): WaveformWindow<C> {
    const length = Math.max(0, end - start);

    if (target.t.length < length) {
      throw new RangeError("WaveformRingBuffer target window is smaller than the requested range");
    }

    for (let i = 0; i < length; i += 1) {
      const slot = (start + i) % this.capacity;
      target.t[i] = this.times[slot] ?? Number.NaN;

      for (const channel of this.channels) {
        target.values[channel][i] = this.data[channel][slot] ?? Number.NaN;
      }
    }

    target.length = length;
    target.firstSequence = start;

    return target;
  }
}
