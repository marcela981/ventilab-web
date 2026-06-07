/*
 * Funcionalidad: Tipos del módulo de Evaluación (actividades y entregas)
 * Descripción: Contratos TypeScript para Activities (EXAM/QUIZ/WORKSHOP/TALLER),
 *   asignaciones y entregas, alineados con el backend `ventylab-server`.
 * Versión: 2.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

export type ActivityType = 'EXAM' | 'QUIZ' | 'WORKSHOP' | 'TALLER';
export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'GRADED' | 'LATE';

export interface ActivityAssignment {
  id: string;
  activityId: string;
  groupId: string;
  assignedBy: string;
  visibleFrom: string | null;
  dueDate: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  type: ActivityType;
  maxScore: number;
  timeLimit: number | null;
  dueDate: string | null;
  isPublished: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;

  assignments?: Array<Pick<ActivityAssignment, 'id' | 'groupId' | 'visibleFrom' | 'dueDate'>>;
  submissions?: Array<Pick<ActivitySubmission, 'id' | 'status' | 'score' | 'maxScore' | 'submittedAt' | 'gradedAt'>>;
  _count?: { submissions: number };
}

export interface ActivitySubmission {
  id: string;
  activityId: string;
  userId: string;
  groupId: string;
  status: SubmissionStatus;
  content: unknown | null;
  submittedAt: string | null;
  score: number | null;
  maxScore: number | null;
  feedback: string | null;
  gradedBy: string | null;
  gradedAt: string | null;
  createdAt: string;
  updatedAt: string;

  activity?: Pick<Activity, 'id' | 'title' | 'type' | 'instructions' | 'dueDate' | 'maxScore'>;
  student?: { id: string; name: string | null; email: string };
  grader?: { id: string; name: string | null; email: string } | null;
}

export interface CreateActivityPayload {
  title: string;
  description?: string | null;
  instructions?: string | null;
  type: ActivityType;
  maxScore?: number;
  timeLimit?: number | null;
  dueDate?: string | null;
}

export interface UpdateActivityPayload extends Partial<CreateActivityPayload> {
  isActive?: boolean;
}

export interface AssignActivityPayload {
  activityId: string;
  groupId: string;
  visibleFrom?: string | null;
  dueDate?: string | null;
  isActive?: boolean;
}

export interface SaveSubmissionPayload {
  content: unknown;
}

export interface GradeSubmissionPayload {
  score: number;
  feedback?: string | null;
}
