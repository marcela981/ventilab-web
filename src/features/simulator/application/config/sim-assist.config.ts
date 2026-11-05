/*
* Funcionalidad: Simulator AI assist config
* Descripción: Static configuration of the AI assist of the running console (T7): the question limit, which mirrors
*   SimulationAssistDTO.question (maxLength 1000 in openapi/openapi.json; the counter appears near it as in the AI
*   chat composer) and the rating target type of an assist answer (SIM_ASSIST, targetId = aiHelpEventId). Depends on
*   the ai-rating public types. v1.1 (Bloque A): the AI_CALL target type and the SIM_ALARM and SIMULATOR_ASSIST
*   surfaces of the alarm help and the assistance answers.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { AiRatingSurface, AiRatingTargetType } from "@shared/ai-rating";

/** SimulationAssistDTO.question maxLength. */
export const ASSIST_QUESTION_MAX_LENGTH = 1000;

/** ai-ratings targetType of an assist answer (the targetId is its aiHelpEventId). */
export const ASSIST_RATING_TARGET_TYPE: AiRatingTargetType = "SIM_ASSIST";

/** v1.1 (Bloque A): an alarm help or real-mode answer is rated as its own AI call (targetId = aiCallId). */
export const AI_CALL_RATING_TARGET_TYPE: AiRatingTargetType = "AI_CALL";

/** v1.1 (Bloque A): surface of the "¿Cómo estabilizar?" alarm help answers. */
export const ALARM_HELP_RATING_SURFACE: AiRatingSurface = "SIM_ALARM";

/** v1.1 (Bloque A): surface of the assistance answers (digital and real). */
export const ASSIST_RATING_SURFACE: AiRatingSurface = "SIMULATOR_ASSIST";
