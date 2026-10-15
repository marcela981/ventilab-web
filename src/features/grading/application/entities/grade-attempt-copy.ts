/*
* Funcionalidad: Grade attempt copy
* Descripción: Spanish UI copy of the grade-attempt page /grading/attempts/[attemptId]: header (attempt, student, status, grade, passing grade, publication), the question navigator, each answer card (scores, correct answer, explanation, score and comment fields), the simulation rubric breakdown (criterion and reason labels of the server scoring), the save and publish actions with their confirmations and toasts, the unsaved-changes prompt and the AI feedback panel (statuses, provider and model, regenerate). No dependencies. v1.1 (G2 review W1/S3/S4): the read-only previous comment, the hint of a comment-only edit of an automatic score, the stale-after-save alert and its reload action, and the results link of G3.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

const pointsFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

export function formatPoints(value: number): string {
  return pointsFormatter.format(value);
}

// TODO(i18n): move to a grading namespace in src/i18n.
export const GRADE_COPY = {
  documentTitle: (title: string) => `Calificar: ${title} | VentyLab`,
  fallbackTitle: "Calificar intento",
  loading: "Cargando el intento…",
  loadErrorTitle: "No se pudo cargar el intento",
  backToQueue: "Volver a la cola",
  subtitle: (attemptNumber: number, studentId: string) => `Intento #${attemptNumber} · Estudiante ${studentId}`,
  submittedAt: (date: string) => `Enviado el ${date}`,
  score: (score: string, max: string) => `${score} de ${max} puntos`,
  gradeLabel: "Nota",
  noGrade: "Sin nota todavía: faltan preguntas por calificar.",
  passed: "Aprobado",
  failed: "No aprobado",
  passingGrade: (grade: string) => `Nota mínima para aprobar: ${grade}`,
  published: (date: string) => `Publicada el ${date}`,
  unpublished: "Sin publicar",
  legacy: "Intento migrado del sistema anterior: solo lectura.",
  navigatorLabel: "Preguntas del intento",
  navigatorItem: (position: number, pending: boolean) => `Pregunta ${position}${pending ? ", pendiente" : ""}`,
  questionTitle: (position: number, points: string) => `Pregunta ${position} · ${points} ${points === "1" ? "punto" : "puntos"}`,
  pendingChip: "Pendiente",
  notAnswered: "El estudiante no respondió esta pregunta.",
  autoScore: (value: string) => `Automático: ${value}`,
  manualScore: (value: string) => `Manual: ${value}`,
  earnedScore: (value: string) => `Cuenta: ${value}`,
  noScore: "Sin puntaje",
  correctAnswer: "Respuesta correcta",
  explanation: "Explicación",
  scoreField: (points: string) => `Puntaje (0 a ${points})`,
  scoreHint: "Hasta dos decimales.",
  commentField: "Comentario para el estudiante",
  commentRequiredHint: "Obligatorio: esta respuesta ya tiene un puntaje.",
  commentOptionalHint: "Opcional.",
  previousComment: "Comentario anterior",
  overrideCommentHint: "Obligatorio: escribe un comentario nuevo que explique el cambio de puntaje.",
  commentOnlyOverrideHint: "Al guardar se registrará un puntaje manual igual al automático, y contará como una corrección del puntaje.",
  refreshFailed: "Las calificaciones se guardaron, pero no se pudo actualizar el intento. Recarga para ver los valores guardados.",
  reloadAttempt: "Recargar",
  viewResults: "Ver resultados de la evaluación",
  rubricTitle: "Evaluación práctica (calculada por el servidor)",
  rubricScore: (percent: string) => `Puntaje práctico: ${percent}`,
  rubricUnavailable: "No se pudo calcular la evaluación práctica.",
  rubricEmpty: "La evaluación práctica no tiene criterios.",
  rubricColumns: {
    criterion: "Criterio",
    value: "Valor",
    threshold: "Umbral",
    points: "Puntos",
    weighted: "Ponderado",
    justification: "Justificación",
  },
  rubricTableLabel: "Desglose de la rúbrica",
  dirty: (count: number) => (count === 1 ? "1 calificación sin guardar" : `${count} calificaciones sin guardar`),
  save: "Guardar calificación",
  saved: (count: number) => (count === 1 ? "Se guardó 1 calificación." : `Se guardaron ${count} calificaciones.`),
  saveFailed: "Algunas calificaciones no se guardaron. Revisa las preguntas marcadas.",
  fixErrors: "Corrige los campos marcados antes de guardar.",
  unsavedPrompt: "Tienes calificaciones sin guardar. ¿Salir de todos modos?",
  publish: "Publicar",
  publishTitle: "¿Publicar la calificación?",
  publishDescription: "El estudiante verá su nota, las respuestas correctas y la retroalimentación.",
  publishConfirm: "Publicar",
  cancel: "Cancelar",
  publishedToast: "Calificación publicada.",
  alreadyPublishedToast: "La calificación ya estaba publicada.",
  publishNeedsGraded: "Solo se puede publicar cuando todas las preguntas estén calificadas.",
  publishNeedsSave: "Guarda los cambios antes de publicar.",
  feedbackTitle: "Retroalimentación con IA",
  feedbackOverall: "General",
  feedbackQuestion: (position: number | null) => (position === null ? "Pregunta" : `Pregunta ${position}`),
  feedbackEmpty: "Todavía no hay retroalimentación para este intento.",
  feedbackError: "No se pudo cargar la retroalimentación.",
  feedbackPollingStopped: "La retroalimentación sigue en proceso. Vuelve a cargarla en unos minutos.",
  feedbackReload: "Volver a cargar",
  feedbackMeta: (provider: string, model: string, date: string) => `${provider} · ${model} · ${date}`,
  feedbackUpdated: (date: string) => `Actualizada el ${date}`,
  regenerate: "Regenerar retroalimentación IA",
  regenerateNeedsGraded: "La retroalimentación solo se puede generar para un intento calificado.",
  regenerated: "Se pidió una nueva retroalimentación. Se actualizará cuando esté lista.",
  feedbackReady: "La retroalimentación está lista.",
} as const;

export const FEEDBACK_STATUS_LABELS = {
  PENDING: "Generando…",
  READY: "Lista",
  FAILED: "Falló",
} as const;

export const FEEDBACK_SOURCE_LABELS = {
  LLM: "Modelo de lenguaje",
  DETERMINISTIC: "Automática (sin IA)",
} as const;

// Criterion types of the server simulation scoring; unknown names are shown as they come.
export const RUBRIC_CRITERION_LABELS: Readonly<Record<string, string>> = {
  TARGETS_REACHED: "Metas alcanzadas",
  TIME_TO_STABILIZE: "Tiempo hasta estabilizar",
  TIME_IN_RANGE: "Tiempo en rango",
  SAFETY_VIOLATIONS: "Violaciones de seguridad",
  AI_ASSIST_USAGE: "Uso de la asistencia con IA",
  tidalVolume: "Volumen corriente",
  respiratoryRate: "Frecuencia respiratoria",
  peep: "PEEP",
  fio2: "FiO2",
  maxPressure: "Presión máxima",
  ventilationMode: "Modo ventilatorio",
  iERatio: "Relación I:E",
};

export const PRACTICAL_REASON_LABELS: Readonly<Record<string, string>> = {
  SESSION_NOT_FOUND: "No se encontró la sesión del simulador de esta respuesta.",
  SESSION_NOT_BOUND: "La sesión del simulador no corresponde a este intento.",
  INVALID_RUBRIC: "La rúbrica de la pregunta no es válida para el cálculo automático.",
  CASE_UNAVAILABLE: "El caso clínico de la pregunta ya no está disponible.",
  EMPTY_PARAMETERS_LOG: "La sesión no registró parámetros del ventilador.",
  INVALID_LAST_COMMAND: "La última configuración enviada al simulador no es válida.",
};
