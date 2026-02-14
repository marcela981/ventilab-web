/**
 * Evaluation Types
 */
export interface ClinicalCase {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  scenario: string;
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  details: any[];
}
