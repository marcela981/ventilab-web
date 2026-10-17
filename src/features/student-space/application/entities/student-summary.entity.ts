/*
* Funcionalidad: Student summary entity
* Descripción: Domain shape of the student home (`GET /api/me/summary`): learning progress (overall and per section, values exactly as the API computes them), active and upcoming evaluations, latest published grades, notes, AI conversations, simulation sessions, upcoming ventilator reservations and the unread notifications count. Nothing here is computed on the client. No dependencies. v1.1 (B2 closure): section progress carries its title, grades their attemptId and module, notes their module, lesson and page titles, and simulation sessions their case title (the backend gaps are closed).
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type ProgressItem = {
  // Section id and title; null for the overall progress (the title is also null when the API has none).
  id: string | null
  title: string | null
  percentage: number
  completedLessons: number
  totalLessons: number
  completed: boolean
};

export type SummaryEvaluation = {
  assignmentId: string
  evaluationId: string
  title: string
  type: string
  startsAt: string
  endsAt: string | null
};

export type SummaryGrade = {
  attemptId: string
  evaluationId: string
  moduleId: string | null
  moduleTitle: string | null
  title: string
  type: string
  attemptNumber: number
  grade: number
  passed: boolean
  publishedAt: string
};

export type SummaryNote = {
  id: string
  lessonId: string
  pageId: string | null
  moduleId: string | null
  lessonTitle: string | null
  pageTitle: string | null
  excerpt: string
  updatedAt: string
};

export type SummaryConversation = {
  id: string
  title: string
  scope: string
  updatedAt: string
};

export type SummarySimulationSession = {
  id: string
  caseTitle: string | null
  mode: string
  status: string
  score: number | null
  startedAt: string
  endedAt: string | null
};

export type SummaryReservation = {
  id: string
  startsAt: string
  endsAt: string
  purpose: string | null
  heldByGroup: boolean
};

export type StudentSummary = {
  overallProgress: ProgressItem
  sectionProgress: ProgressItem[]
  activeEvaluations: SummaryEvaluation[]
  upcomingEvaluations: SummaryEvaluation[]
  grades: SummaryGrade[]
  latestNotes: SummaryNote[]
  latestConversations: SummaryConversation[]
  latestSimulationSessions: SummarySimulationSession[]
  upcomingReservations: SummaryReservation[]
  unreadNotifications: number
};
