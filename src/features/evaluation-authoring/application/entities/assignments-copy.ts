/*
* Funcionalidad: Evaluation assignments copy
* Descripción: Spanish UI copy of the activations page /evaluations/manage/[evaluationId]/assignments: header, the not-activatable reason, the activations table, the close-now and delete confirmations, the activation dialog (groups, Bogota date-time fields) and the success toasts. No dependencies. v1.1 (A4 review C1): notStaff replaces notManageable (activations depend on the role and the group scope, not on authorship). v1.2 (Bloque 3): copy of the "Asignación a grupos" section of the builder (the page is gone): section title and subtitle, the READY-only message "Marca la evaluación como lista para asignarla.", the inline "Nueva asignación" form (submit "Asignar") and the assignment toasts.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

// TODO(i18n): move to an evaluation-authoring namespace in src/i18n.
export const ASSIGNMENTS_COPY = {
  title: "Asignación a grupos",
  subtitle: "Grupos y fechas (hora de Bogotá) en que los estudiantes pueden presentar la evaluación.",
  notActivatable: "Marca la evaluación como lista para asignarla.",
  notStaff: "Solo docentes y administradores pueden asignar evaluaciones.",
  listLoading: "Cargando las asignaciones…",
  listErrorTitle: "No se pudieron cargar las asignaciones",
  emptyTitle: "Todavía no hay asignaciones",
  emptyDescription: "Asigna la evaluación a uno o más grupos y define su ventana de fechas.",
  tableLabel: "Asignaciones de la evaluación",
  columns: {
    group: "Grupo",
    window: "Ventana (hora de Bogotá)",
    state: "Estado",
    attempts: "Intentos",
    actions: "Acciones",
  },
  attemptBreakdown: (inProgress: number, pendingReview: number, graded: number) =>
    `${inProgress} en curso · ${pendingReview} por revisar · ${graded} calificados`,
  closeNow: "Cerrar ahora",
  closeNowFor: (group: string) => `Cerrar ahora la asignación de ${group}`,
  delete: "Eliminar",
  deleteFor: (group: string) => `Eliminar la asignación de ${group}`,
  closeTitle: "¿Cerrar la asignación ahora?",
  closeDescription: (group: string) =>
    `La ventana de ${group} termina ahora y sus estudiantes ya no podrán iniciar intentos.`,
  closeConfirm: "Cerrar ahora",
  deleteTitle: "¿Eliminar la asignación?",
  deleteDescription: (group: string) => `La asignación de ${group} se eliminará. Todavía no tiene intentos.`,
  deleteConfirm: "Eliminar",
  cancel: "Cancelar",
  closed: (group: string) => `Se cerró la asignación de ${group}.`,
  deleted: (group: string) => `Se eliminó la asignación de ${group}.`,
  activated: (count: number) => (count === 1 ? "Evaluación asignada a 1 grupo." : `Evaluación asignada a ${count} grupos.`),
  form: {
    title: "Nueva asignación",
    groups: "Grupos",
    groupMembers: (count: number) => `${count} ${count === 1 ? "integrante" : "integrantes"}`,
    groupsLoading: "Cargando tus grupos…",
    groupsError: "No se pudieron cargar los grupos.",
    retry: "Reintentar",
    noGroups: "No administras grupos de estudiantes activos.",
    startsAt: "Inicio",
    endsAt: "Cierre",
    timeZoneHint: "Hora de Bogotá (UTC-5)",
    submit: "Asignar",
  },
} as const;
