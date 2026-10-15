/*
* Funcionalidad: Evaluation assignments copy
* Descripción: Spanish UI copy of the activations page /evaluations/manage/[evaluationId]/assignments: header, the not-activatable reason, the activations table, the close-now and delete confirmations, the activation dialog (groups, Bogota date-time fields) and the success toasts. No dependencies. v1.1 (A4 review C1): notStaff replaces notManageable (activations depend on the role and the group scope, not on authorship).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

// TODO(i18n): move to an evaluation-authoring namespace in src/i18n.
export const ASSIGNMENTS_COPY = {
  documentTitle: (title: string) => `Activaciones: ${title} | VentyLab`,
  title: "Activaciones",
  subtitle: (title: string) => `Grupos y fechas en que los estudiantes pueden presentar «${title}».`,
  subtitleLoading: "Grupos y fechas en que los estudiantes pueden presentar la evaluación.",
  backToList: "Volver a la lista",
  edit: "Editar evaluación",
  activate: "Activar",
  status: (label: string) => `Estado: ${label}`,
  notActivatable: "Solo una evaluación en estado «Lista» se puede activar. Márcala como lista en el editor.",
  notStaff: "Solo docentes y administradores pueden activar evaluaciones.",
  loading: "Cargando la evaluación…",
  loadErrorTitle: "No se pudo cargar la evaluación",
  listLoading: "Cargando las activaciones…",
  listErrorTitle: "No se pudieron cargar las activaciones",
  emptyTitle: "Todavía no hay activaciones",
  emptyDescription: "Activa la evaluación para uno o más grupos y define su ventana de fechas.",
  tableLabel: "Activaciones de la evaluación",
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
  closeNowFor: (group: string) => `Cerrar ahora la activación de ${group}`,
  delete: "Eliminar",
  deleteFor: (group: string) => `Eliminar la activación de ${group}`,
  closeTitle: "¿Cerrar la activación ahora?",
  closeDescription: (group: string) =>
    `La ventana de ${group} termina ahora y sus estudiantes ya no podrán iniciar intentos.`,
  closeConfirm: "Cerrar ahora",
  deleteTitle: "¿Eliminar la activación?",
  deleteDescription: (group: string) => `La activación de ${group} se eliminará. Todavía no tiene intentos.`,
  deleteConfirm: "Eliminar",
  cancel: "Cancelar",
  closed: (group: string) => `Se cerró la activación de ${group}.`,
  deleted: (group: string) => `Se eliminó la activación de ${group}.`,
  activated: (count: number) => (count === 1 ? "Evaluación activada para 1 grupo." : `Evaluación activada para ${count} grupos.`),
  dialog: {
    title: "Activar evaluación",
    groups: "Grupos",
    groupMembers: (count: number) => `${count} ${count === 1 ? "integrante" : "integrantes"}`,
    groupsLoading: "Cargando tus grupos…",
    groupsError: "No se pudieron cargar los grupos.",
    retry: "Reintentar",
    noGroups: "No administras grupos de estudiantes activos.",
    startsAt: "Inicio",
    endsAt: "Cierre",
    timeZoneHint: "Hora de Bogotá (UTC-5)",
    cancel: "Cancelar",
    submit: "Activar",
  },
} as const;
