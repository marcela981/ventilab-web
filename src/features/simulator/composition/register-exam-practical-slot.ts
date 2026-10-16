/*
* Funcionalidad: Exam practical slot registration
* Descripción: Side-effect module imported once by pages/_app.js (T9): it registers the simulator's lazy exam slot as
*   the renderer of the evaluations PracticalQuestionSlot, so every SIMULATION question of an attempt shows it from
*   the first render. It is a composition root (an ESLint `composition` element): it imports the evaluations
*   renderer registry module directly instead of the evaluations barrel, which would pull the evaluations pages and
*   styles into the _app chunk; the function is the same one the evaluations index exports. Its own weight is the
*   registry (types + two functions) and the lazy wrapper; the slot, the console, the sim-engine and Chart.js load
*   later through dynamic imports. Depends on the evaluations renderer registry and the lazy exam slot.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { registerPracticalQuestionRenderer } from "@features/evaluations/application/entities/practical-question-renderer";
import { LazyExamPracticalSlot } from "../application/components/lazy-exam-practical-slot";

registerPracticalQuestionRenderer(LazyExamPracticalSlot);
