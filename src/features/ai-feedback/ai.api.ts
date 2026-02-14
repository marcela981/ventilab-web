/**
 * AI API Service
 * TODO: Consolidate AI API calls
 */
import { http } from '@/services/api/http';

export const aiApi = {
  askQuestion: async (question: string, context?: string) => {
    const response = await http.post('/ai/ask', { question, context });
    return response.data;
  },
  getFeedback: async (answer: string, expectedAnswer?: string) => {
    const response = await http.post('/ai/feedback', { answer, expectedAnswer });
    return response.data;
  },
};
