/*
* Funcionalidad: Simulator exam config
* Descripción: Static configuration of the EXAM practical part (T9): the session time multiplier of an exam session
*   (the rubric and the question carry none, so it is the contract default of StartSimulationSessionDTO), the countdown
*   tick and its warning threshold, and the bounded flush of the pending events when the attempt deadline expires in
*   the console. Depends on the simulator config.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { DEFAULT_TIME_MULTIPLIER } from "./simulator.config";
import type { TimeMultiplier } from "./simulator.config";

/**
 * BACKEND GAP: neither the question nor the rubric fixes a multiplier, so an exam session uses the contract default
 * of `timeMultiplier` (1). It is fixed for the whole session: the console offers no selector and no pause in EXAM.
 */
export const EXAM_TIME_MULTIPLIER: TimeMultiplier = DEFAULT_TIME_MULTIPLIER;

/** The console countdown refreshes once per second. */
export const DEADLINE_TICK_MS = 1000;

/** Below this many ms the countdown is shown as a warning. */
export const DEADLINE_WARNING_MS = 5 * 60_000;

/** At the deadline the pending events get at most this long to reach the server before POST /end. */
export const DEADLINE_FLUSH_TIMEOUT_MS = 5000;
