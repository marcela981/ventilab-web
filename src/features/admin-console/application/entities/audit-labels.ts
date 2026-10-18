/*
* Funcionalidad: Audit labels
* Descripción: Spanish labels of the audit log codes the backend sends raw (`GET /api/audit`, `GET /api/audit/catalog`): auditActionLabel maps every action of the backend catalog (ventylab-server AUDIT_ACTIONS) and auditTargetTypeLabel the target types (aggregate names, table names and entity types such as "user", "evaluation_attempts" or "ClinicalCase", matched case-insensitively, without underscores and in singular) and auditRoleLabel the actor role (ROLE_LABELS). An unknown code is returned unchanged, so a new backend action still shows. Depends on the admin console config.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { ROLE_LABELS, USER_ROLES } from "../config/admin-console.config";
import type { UserRole } from "../config/admin-console.config";

// TODO(i18n): move to an admin-console namespace in src/i18n.
const AUDIT_ACTION_LABELS: Readonly<Record<string, string>> = {
  user_created: "Usuario creado",
  user_profile_updated: "Perfil de usuario actualizado",
  user_password_changed: "Contraseña cambiada",
  user_role_changed: "Rol de usuario cambiado",
  user_status_changed: "Estado de usuario cambiado",
  user_student_code_changed: "Código de estudiante cambiado",
  user_google_account_linked: "Cuenta de Google vinculada",
  superadmin_enforced: "Superadministrador aplicado",
  role_folded_superuser_to_admin: "Superusuario convertido en administrador",
  evaluation_score_overridden: "Nota de evaluación modificada",
  grade_published: "Calificación publicada",
  evaluation_activated: "Evaluación activada",
  evaluation_status_changed: "Estado de evaluación cambiado",
  evaluation_created: "Evaluación creada",
  evaluation_updated: "Evaluación actualizada",
  evaluation_deleted: "Evaluación eliminada",
  evaluation_scenario_added: "Escenario de evaluación agregado",
  evaluation_scenario_updated: "Escenario de evaluación actualizado",
  evaluation_scenario_removed: "Escenario de evaluación eliminado",
  evaluation_question_added: "Pregunta de evaluación agregada",
  evaluation_question_updated: "Pregunta de evaluación actualizada",
  evaluation_question_removed: "Pregunta de evaluación eliminada",
  evaluation_option_added: "Opción de respuesta agregada",
  evaluation_option_updated: "Opción de respuesta actualizada",
  evaluation_option_removed: "Opción de respuesta eliminada",
  evaluation_items_reordered: "Elementos de evaluación reordenados",
  evaluation_assignment_created: "Activación de evaluación creada",
  evaluation_assignment_window_changed: "Ventana de activación cambiada",
  evaluation_assignment_closed: "Activación de evaluación cerrada",
  evaluation_assignment_deleted: "Activación de evaluación eliminada",
  evaluation_attempt_created: "Intento de evaluación iniciado",
  reservation_created: "Reserva creada",
  "reservation.preempted": "Reserva desplazada",
  reservation_preempted: "Reserva desplazada por su titular",
  reservation_cancelled: "Reserva cancelada",
  reservation_completed: "Reserva completada",
  ventilator_control_taken_over: "Control del ventilador tomado",
  content_created: "Contenido creado",
  content_updated: "Contenido actualizado",
  content_deleted: "Contenido eliminado",
  content_published: "Contenido publicado",
  content_archived: "Contenido archivado",
  section_status_changed: "Estado de sección cambiado",
  section_created: "Sección creada",
  section_updated: "Sección actualizada",
  level_created: "Nivel creado",
  level_updated: "Nivel actualizado",
  level_deactivated: "Nivel desactivado",
  level_prerequisite_added: "Prerrequisito de nivel agregado",
  level_prerequisite_removed: "Prerrequisito de nivel eliminado",
  level_prerequisites_replaced: "Prerrequisitos de nivel reemplazados",
  module_created: "Módulo creado",
  module_updated: "Módulo actualizado",
  module_deactivated: "Módulo desactivado",
  module_prerequisite_added: "Prerrequisito de módulo agregado",
  module_prerequisite_removed: "Prerrequisito de módulo eliminado",
  module_prerequisites_replaced: "Prerrequisitos de módulo reemplazados",
  lesson_created: "Lección creada",
  lesson_updated: "Lección actualizada",
  lesson_deactivated: "Lección desactivada",
  lesson_blocks_saved: "Bloques de lección guardados",
  step_created: "Paso creado",
  step_updated: "Paso actualizado",
  step_deactivated: "Paso desactivado",
  step_order_changed: "Orden de pasos cambiado",
  page_created: "Página creada",
  page_updated: "Página actualizada",
  activity_created: "Actividad creada",
  activity_updated: "Actividad actualizada",
  activity_deactivated: "Actividad desactivada",
  activity_published: "Actividad publicada",
  activity_assigned: "Actividad asignada",
  activity_assignment_updated: "Asignación de actividad actualizada",
  activity_assignment_removed: "Asignación de actividad eliminada",
  activity_submission_started: "Entrega de actividad iniciada",
  activity_submission_draft_saved: "Borrador de entrega guardado",
  activity_submission_submitted: "Entrega de actividad enviada",
  activity_submission_graded: "Entrega de actividad calificada",
  activity_submission_reset: "Entrega de actividad reiniciada",
  content_override_created: "Ajuste de contenido creado",
  content_override_updated: "Ajuste de contenido actualizado",
  content_override_deactivated: "Ajuste de contenido desactivado",
  media_uploaded: "Archivo subido",
  media_deleted: "Archivo eliminado",
  clinical_case_created: "Caso clínico creado",
  clinical_case_updated: "Caso clínico actualizado",
  clinical_case_status_changed: "Estado de caso clínico cambiado",
  clinical_case_deleted: "Caso clínico eliminado",
  clinical_case_duplicated: "Caso clínico duplicado",
  clinical_case_validated_by_expert: "Caso clínico validado por experto",
  SETTINGS_CHANGED: "Configuración cambiada",
  group_created: "Grupo creado",
  group_updated: "Grupo actualizado",
  group_deleted: "Grupo eliminado",
  group_simulator_lead_changed: "Líder del simulador cambiado",
  group_supervision_added: "Supervisión de grupo agregada",
  group_supervision_removed: "Supervisión de grupo eliminada",
  group_member_added: "Miembro agregado al grupo",
  group_member_role_changed: "Rol de miembro cambiado",
  group_member_membership_role_changed: "Rol de membresía cambiado",
  group_member_removed: "Miembro retirado del grupo",
  leader_membership_backfilled: "Membresía de líder completada",
  student_assigned_to_teacher: "Estudiante asignado a docente",
  teacher_student_removed: "Estudiante retirado del docente",
  quiz_attempt_created: "Intento de cuestionario creado",
  score_recorded: "Puntaje registrado",
  score_updated: "Puntaje actualizado",
  score_deleted: "Puntaje eliminado",
  achievement_unlocked: "Logro desbloqueado",
  simulator_session_started: "Sesión de simulación iniciada",
  simulator_session_saved: "Sesión de simulación guardada",
};

// Keys are normalized by normalizeTargetType: lowercase letters only, singular.
const AUDIT_TARGET_TYPE_LABELS: Readonly<Record<string, string>> = {
  user: "Usuario",
  evaluation: "Evaluación",
  evaluationattempt: "Intento de evaluación",
  evaluationanswer: "Respuesta de evaluación",
  evaluationassignment: "Activación de evaluación",
  reservation: "Reserva",
  ventilatorcontrol: "Control del ventilador",
  section: "Sección",
  level: "Nivel",
  module: "Módulo",
  lesson: "Lección",
  step: "Paso",
  page: "Página",
  pageblock: "Bloque de página",
  activity: "Actividad",
  activityassignment: "Asignación de actividad",
  activitysubmission: "Entrega de actividad",
  contentoverride: "Ajuste de contenido",
  card: "Tarjeta",
  media: "Archivo",
  clinicalcase: "Caso clínico",
  platformsetting: "Configuración de la plataforma",
  group: "Grupo",
  groupmember: "Miembro de grupo",
  teacherstudent: "Estudiante de docente",
  quizattempt: "Intento de cuestionario",
  score: "Puntaje",
  custom: "Puntaje personalizado",
  achievement: "Logro",
};

function normalizeTargetType(value: string): string {
  const compact = value.toLowerCase().replace(/[^a-z]/g, "");

  if (compact.endsWith("ies")) {
    return `${compact.slice(0, -3)}y`;
  }

  return compact.endsWith("s") ? compact.slice(0, -1) : compact;
}

function lookup(labels: Readonly<Record<string, string>>, key: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(labels, key) ? labels[key] : undefined;
}

export function auditActionLabel(action: string): string {
  return lookup(AUDIT_ACTION_LABELS, action) ?? action;
}

function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

export function auditRoleLabel(role: string): string {
  return isUserRole(role) ? ROLE_LABELS[role] : role;
}

export function auditTargetTypeLabel(targetType: string): string {
  return lookup(AUDIT_TARGET_TYPE_LABELS, normalizeTargetType(targetType)) ?? targetType;
}
