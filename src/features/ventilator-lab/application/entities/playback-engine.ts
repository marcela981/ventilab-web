/*
* Funcionalidad: Recording playback engine
* Descripción: Pure playback clock of a telemetry recording, independent of React and of the frames: the position is
*   an anchor (position + wall time) advanced by the wall clock times the speed while playing, clamped to
*   [0, duration]. Play / pause / speed (×0.5, ×1, ×2, ×4) keep the position; a seek moves it and starts a new frame
*   source GENERATION (like the simulator replay: the console curves restart on a new source id); playing again from
*   the end restarts at 0 with a new generation. The caller pauses when `playbackEnded` (the position reached the
*   duration). Also the clock text (mm:ss, h:mm:ss above one hour). No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const PLAYBACK_SPEEDS = [0.5, 1, 2, 4] as const;

export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export type PlaybackState = {
  durationMs: number
  playing: boolean
  speed: PlaybackSpeed
  /** Position at `anchorWallMs`. */
  anchorPositionMs: number
  anchorWallMs: number
  /** Frame source generation: a new one after every seek (and a restart from the end). */
  generation: number
};

const clamp = (value: number, max: number): number => Math.min(Math.max(0, value), Math.max(0, max));

export function createPlayback(durationMs: number): PlaybackState {
  return { durationMs: Math.max(0, durationMs), playing: false, speed: 1, anchorPositionMs: 0, anchorWallMs: 0, generation: 0 };
}

export function playbackPosition(state: PlaybackState, wallMs: number): number {
  const elapsed = state.playing ? (wallMs - state.anchorWallMs) * state.speed : 0;

  return clamp(state.anchorPositionMs + elapsed, state.durationMs);
}

export function playbackEnded(state: PlaybackState, wallMs: number): boolean {
  return playbackPosition(state, wallMs) >= state.durationMs;
}

export function playPlayback(state: PlaybackState, wallMs: number): PlaybackState {
  if (state.playing) {
    return state;
  }

  if (state.durationMs > 0 && playbackEnded(state, wallMs)) {
    return { ...state, playing: true, anchorPositionMs: 0, anchorWallMs: wallMs, generation: state.generation + 1 };
  }

  return { ...state, playing: true, anchorPositionMs: playbackPosition(state, wallMs), anchorWallMs: wallMs };
}

export function pausePlayback(state: PlaybackState, wallMs: number): PlaybackState {
  return state.playing ? { ...state, playing: false, anchorPositionMs: playbackPosition(state, wallMs), anchorWallMs: wallMs } : state;
}

export function setPlaybackSpeed(state: PlaybackState, speed: PlaybackSpeed, wallMs: number): PlaybackState {
  return { ...state, speed, anchorPositionMs: playbackPosition(state, wallMs), anchorWallMs: wallMs };
}

export function seekPlayback(state: PlaybackState, positionMs: number, wallMs: number): PlaybackState {
  return {
    ...state,
    anchorPositionMs: clamp(Number.isFinite(positionMs) ? positionMs : 0, state.durationMs),
    anchorWallMs: wallMs,
    generation: state.generation + 1,
  };
}

/** mm:ss below one hour, h:mm:ss above (whole seconds, rounded down). */
export function formatPlaybackClock(positionMs: number): string {
  const totalSeconds = Math.floor(Math.max(0, positionMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
