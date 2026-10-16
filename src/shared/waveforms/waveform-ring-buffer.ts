/*
* Funcionalidad: Waveform ring buffer
* Descripción: Fixed-capacity ring per channel (Float32Array) plus a Float64Array time axis for live waveform streams. Single and batch push, chronological reads (all, time window, since a write sequence), clear with a generation counter so renderers can detect resets. Generic over channel names; no dependency on the simulation engine.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

/** One sample at time `tMs` (milliseconds) with one value per channel. Missing channels are stored as NaN. */
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

  public push(frame: WaveformFrame<C>): void {
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
    return this.copyRange(this.oldestSequence(), this.written);
  }

  /** Samples with `fromMs <= t <= toMs`, oldest first. */
  public readWindow(fromMs: number, toMs: number = Number.POSITIVE_INFINITY): WaveformWindow<C> {
    let start = this.oldestSequence();

    while (start < this.written && this.timeAt(start) < fromMs) {
      start += 1;
    }

    let end = start;

    while (end < this.written && this.timeAt(end) <= toMs) {
      end += 1;
    }

    return this.copyRange(start, end);
  }

  /** Samples written at or after `sequence`, clamped to the oldest sample still kept. */
  public readSince(sequence: number): WaveformWindow<C> {
    return this.copyRange(Math.max(sequence, this.oldestSequence()), this.written);
  }

  private oldestSequence(): number {
    return Math.max(0, this.written - this.capacity);
  }

  private timeAt(sequence: number): number {
    return this.times[sequence % this.capacity] ?? Number.NaN;
  }

  private copyRange(start: number, end: number): WaveformWindow<C> {
    const length = Math.max(0, end - start);
    const t = new Float64Array(length);
    const values = Object.fromEntries(
      this.channels.map((channel) => [channel, new Float32Array(length)]),
    ) as Record<C, Float32Array>;

    for (let i = 0; i < length; i += 1) {
      const slot = (start + i) % this.capacity;
      t[i] = this.times[slot] ?? Number.NaN;

      for (const channel of this.channels) {
        values[channel][i] = this.data[channel][slot] ?? Number.NaN;
      }
    }

    return { t, values, length, firstSequence: start };
  }
}
