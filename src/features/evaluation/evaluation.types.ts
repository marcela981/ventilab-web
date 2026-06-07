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

// =============================================================================
// Flujo clínico-paramétrico (OE2: comparación con experto · OE3: explicación)
// Tipos alineados con el contrato del backend `ventylab-server`:
//   GET  /api/cases · GET /api/cases/:id · POST /api/cases/:id/evaluate
// =============================================================================

/**
 * Vocabulario del modo de ventilación. DEBE coincidir EXACTAMENTE con lo
 * sembrado en `prisma/seed-clinical-cases.ts` y con lo que mapea
 * `buildFeedbackPrompt` en el backend ('volume' → «Volumen Control»).
 */
export type VentilationMode = 'volume' | 'pressure';

/** Configuración de ventilador que ingresa el estudiante. */
export interface VentilatorConfiguration {
  ventilationMode: VentilationMode;
  tidalVolume: number;     // Vt en ml
  respiratoryRate: number; // FR en resp/min
  peep: number;            // cmH2O
  fio2: number;            // % (0-100)
  maxPressure: number;     // Presión máxima en cmH2O
  iERatio?: string;        // Relación I:E (opcional)
}

export type ErrorClassification = 'correcto' | 'menor' | 'moderado' | 'critico';

export interface ClinicalCaseAttemptSummary {
  hasAttempted: boolean;
  bestScore: number | null;
  lastAttempt: string | null;
  isSuccessful: boolean;
}

/** Item de la lista de casos (GET /api/cases). */
export interface ClinicalCaseListItem {
  id: string;
  title: string;
  description: string;
  patientAge: number;
  patientWeight: number;
  mainDiagnosis: string;
  comorbidities: string[];
  difficulty: string;
  pathology: string;
  educationalGoal: string;
  userAttempts?: ClinicalCaseAttemptSummary;
}

export interface ClinicalCaseListResponse {
  cases: ClinicalCaseListItem[];
  pagination?: { limit: number; offset: number; total: number; hasMore?: boolean };
}

/** Detalle del caso (GET /api/cases/:id) — sin configuración experta. */
export interface ClinicalCaseDetail {
  id: string;
  title: string;
  description: string;
  patientAge: number;
  patientWeight: number;
  mainDiagnosis: string;
  comorbidities: string[];
  labData?: Record<string, unknown> | null;
  difficulty: string;
  pathology: string;
  educationalGoal: string;
}

export interface ClinicalCaseDetailResponse {
  case: ClinicalCaseDetail;
  userAttempts?: {
    total: number;
    bestScore: number | null;
    lastAttempt: string | null;
    attempts: Array<{ id: string; score: number; isSuccessful: boolean; completedAt: string | null }>;
  };
}

/** Comparación de un parámetro contra el experto. */
export interface ParameterComparison {
  parameter: string;
  userValue: number | string | null;
  expertValue: number | string | null;
  difference: number | null;
  differencePercent: number | null;
  withinRange: boolean;
  errorClassification: ErrorClassification;
  priority: string;
}

export interface EvaluationComparison {
  score: number;
  totalParameters: number;
  correctParameters: number;
  summary: { correct: number; minor: number; moderate: number; critical: number };
  parameters: ParameterComparison[];
  criticalErrors: string[];
}

export interface EvaluationFeedback {
  text: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  safetyConcerns?: string[];
}

export interface ExpertConfigurationPublic {
  ventilationMode: string;
  tidalVolume: number | null;
  respiratoryRate: number | null;
  peep: number | null;
  fio2: number | null;
  maxPressure: number | null;
  iERatio: string | null;
  justification: string;
}

/** Respuesta de POST /api/cases/:id/evaluate. */
export interface EvaluationResult {
  success: boolean;
  attempt: { id: string; score: number; isSuccessful: boolean; completionTime: number };
  comparison: EvaluationComparison;
  feedback: EvaluationFeedback;
  expertConfiguration: ExpertConfigurationPublic;
  improvement: {
    previousScore: number | null;
    currentScore: number;
    difference: number;
    improved: boolean;
  } | null;
}

export type FeedbackSource = 'ia' | 'fallback';

export interface GradeSubmissionPayload {
  score: number;
  feedback?: string | null;
}
