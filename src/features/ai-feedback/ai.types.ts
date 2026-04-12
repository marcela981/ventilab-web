/**
 * AI Feedback Types
 */
export interface AIQuestion {
  question: string;
  context?: string;
  lessonId?: string;
}

export interface AIResponse {
  response: string;
  confidence?: number;
  sources?: string[];
}
