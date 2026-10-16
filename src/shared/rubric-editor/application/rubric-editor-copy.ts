/*
* Funcionalidad: Rubric editor copy
* Descripción: Spanish UI copy of the two shared rubric editors. PARAMETER_RUBRIC_COPY is the copy of the parameter
*   rubric editor, moved unchanged (same keys and texts) from the evaluation builder copy, which spreads it back into
*   BUILDER_COPY. OUTCOME_RUBRIC_COPY is the copy of the outcome rubric editor of a clinical case `defaultRubric`
*   (assistance policy, passing score, criteria with weight, threshold, window and penalty, reorder, the weight total
*   and its warning). No dependencies. v1.1 (review of 4134725): the live announcements of a reorder or removal and the
*   copy of a criterion with an unknown stored type.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

// TODO(i18n): move to a rubric-editor namespace in src/i18n.
export const PARAMETER_RUBRIC_COPY = {
  rubricTitle: "Rúbrica",
  rubricHelp: "Cada criterio compara un parámetro del ventilador con el valor esperado; el rango es opcional y solo para parámetros numéricos.",
  rubricEmpty: "La rúbrica no tiene criterios. Agrega al menos uno para poder marcar la evaluación como lista.",
  rubricParameter: (position: number) => `Parámetro del criterio ${position}`,
  rubricExpected: (position: number) => `Valor esperado del criterio ${position}`,
  rubricMin: (position: number) => `Mínimo del criterio ${position}`,
  rubricMax: (position: number) => `Máximo del criterio ${position}`,
  rubricPriority: (position: number) => `Prioridad del criterio ${position}`,
  rubricRemove: (position: number) => `Quitar el criterio ${position}`,
  rubricChooseParameter: "Elige un parámetro",
  rubricAdd: "Agregar criterio",
  rubricJustification: "Justificación (opcional)",
  rubricIssues: "Problemas de la rúbrica",
} as const;

// TODO(i18n): move to a rubric-editor namespace in src/i18n.
export const OUTCOME_RUBRIC_COPY = {
  title: "Rúbrica de calificación del caso",
  help: "Cada criterio mide el resultado de la simulación. Los pesos son puntos y deben sumar 100.",
  empty: "La rúbrica no tiene criterios. Agrega al menos uno.",
  assistancePolicy: "Asesoría de IA",
  passingScore: "Puntaje mínimo para aprobar (0 a 100)",
  criteria: "Criterios",
  type: (position: number) => `Tipo del criterio ${position}`,
  weight: (position: number) => `Peso del criterio ${position} (puntos)`,
  threshold: (position: number, label: string) => `${label} (criterio ${position})`,
  windowMinutes: (position: number) => `Ventana de evaluación del criterio ${position} (minutos)`,
  penaltyPoints: (position: number) => `Penalización del criterio ${position} (puntos)`,
  moveUp: (position: number) => `Subir el criterio ${position}`,
  moveDown: (position: number) => `Bajar el criterio ${position}`,
  remove: (position: number) => `Quitar el criterio ${position}`,
  add: "Agregar criterio",
  weightTotal: (total: string, expected: number) => `Suma de los pesos: ${total} de ${expected}`,
  weightTotalWarning: (expected: number) => `Los pesos deben sumar exactamente ${expected}; el servidor rechaza la rúbrica si no.`,
  issues: "Problemas de la rúbrica",
  announcements: "Avisos de la rúbrica",
  moved: (position: number, count: number) => `Criterio movido a la posición ${position} de ${count}.`,
  removed: (position: number) => `Criterio ${position} eliminado.`,
  removedLast: (position: number) => `Criterio ${position} eliminado. La rúbrica no tiene criterios.`,
  unknownTypeOption: (raw: string) => `Tipo desconocido: ${raw}`,
  unknownTypeError: (raw: string) => `El tipo guardado «${raw}» no existe; elige un tipo de criterio.`,
  unknownThreshold: (position: number) => `Umbral (criterio ${position})`,
} as const;
