/*
* Funcionalidad: Recording playback engine tests
* Descripción: The pure playback clock of a recording: paused at 0, play advances with the wall clock times the speed,
*   pause freezes the position, a speed change keeps the position, seek clamps to the recording and starts a new frame
*   source generation, the end pauses at the duration and play from the end restarts at 0 with a new generation, and
*   the clock text. Depends on Vitest only.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it } from "vitest";
import {
  createPlayback,
  formatPlaybackClock,
  pausePlayback,
  PLAYBACK_SPEEDS,
  playbackEnded,
  playbackPosition,
  playPlayback,
  seekPlayback,
  setPlaybackSpeed,
} from "./playback-engine";

const DURATION = 60_000;

describe("playback engine", () => {
  it("starts paused at 0 with the ×1 speed and offers ×0.5, ×1, ×2 and ×4", () => {
    const state = createPlayback(DURATION);

    expect(PLAYBACK_SPEEDS).toEqual([0.5, 1, 2, 4]);
    expect(state).toMatchObject({ playing: false, speed: 1, generation: 0 });
    expect(playbackPosition(state, 5_000)).toBe(0);
  });

  it("advances with the wall clock times the speed and freezes on pause", () => {
    let state = playPlayback(createPlayback(DURATION), 1_000);

    expect(playbackPosition(state, 3_000)).toBe(2_000);
    state = setPlaybackSpeed(state, 4, 3_000);
    expect(playbackPosition(state, 3_000)).toBe(2_000);
    expect(playbackPosition(state, 4_000)).toBe(6_000);
    state = setPlaybackSpeed(state, 0.5, 4_000);
    expect(playbackPosition(state, 6_000)).toBe(7_000);

    state = pausePlayback(state, 6_000);
    expect(state.playing).toBe(false);
    expect(playbackPosition(state, 60_000)).toBe(7_000);
    // Pausing does not start a new frame source.
    expect(state.generation).toBe(0);
  });

  it("seeks within the recording to a new frame source generation, keeping play / pause", () => {
    const paused = seekPlayback(createPlayback(DURATION), 30_000, 0);

    expect(playbackPosition(paused, 10_000)).toBe(30_000);
    expect(paused.generation).toBe(1);
    expect(seekPlayback(paused, -5, 0).anchorPositionMs).toBe(0);
    expect(seekPlayback(paused, 99_999, 0).anchorPositionMs).toBe(DURATION);

    const playing = seekPlayback(playPlayback(createPlayback(DURATION), 0), 10_000, 2_000);
    expect(playing.playing).toBe(true);
    expect(playbackPosition(playing, 3_000)).toBe(11_000);
  });

  it("stops at the end and plays again from 0 with a new generation", () => {
    const state = playPlayback(createPlayback(DURATION), 0);

    expect(playbackPosition(state, 120_000)).toBe(DURATION);
    expect(playbackEnded(state, 120_000)).toBe(true);
    expect(playbackEnded(state, 1_000)).toBe(false);

    const ended = pausePlayback(state, 120_000);
    const again = playPlayback(ended, 130_000);
    expect(again.generation).toBe(ended.generation + 1);
    expect(playbackPosition(again, 131_000)).toBe(1_000);
  });

  it("keeps a recording without duration at 0", () => {
    const state = playPlayback(createPlayback(0), 0);

    expect(playbackPosition(state, 10_000)).toBe(0);
    expect(playbackEnded(state, 10_000)).toBe(true);
  });

  it("writes the clock as mm:ss or h:mm:ss, never negative", () => {
    expect(formatPlaybackClock(0)).toBe("00:00");
    expect(formatPlaybackClock(65_400)).toBe("01:05");
    expect(formatPlaybackClock(3_725_000)).toBe("1:02:05");
    expect(formatPlaybackClock(-10)).toBe("00:00");
  });
});
