/*
* Funcionalidad: Simulator AI assist config
* Descripción: Static configuration of the AI assist of the running console (T7): the question limit, which mirrors
*   SimulationAssistDTO.question (maxLength 1000 in openapi/openapi.json; the counter appears near it as in the AI
*   chat composer) and the rating target type of an assist answer (SIM_ASSIST, targetId = aiHelpEventId). Depends on
*   the ai-rating public types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { AiRatingTargetType } from "@shared/ai-rating";

/** SimulationAssistDTO.question maxLength. */
export const ASSIST_QUESTION_MAX_LENGTH = 1000;

/** ai-ratings targetType of an assist answer (the targetId is its aiHelpEventId). */
export const ASSIST_RATING_TARGET_TYPE: AiRatingTargetType = "SIM_ASSIST";
