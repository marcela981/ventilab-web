/*
* Funcionalidad: Student preview entity
* Descripción: The evaluation as a student sees it while answering, for the "Vista previa como estudiante" of the builder: title, description, scenarios and questions in the attempt shape of @features/evaluations (no answers, no correctness, explanation or rubric), so the preview renders the same student components. Depends on the @features/evaluations barrel types.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import type { AttemptQuestion, AttemptScenario, RichText } from "@features/evaluations";

export type StudentPreview = {
  title: string
  description: RichText | null
  // Sorted by order.
  scenarios: AttemptScenario[]
  // Sorted by order; position starts at 1.
  questions: AttemptQuestion[]
};
