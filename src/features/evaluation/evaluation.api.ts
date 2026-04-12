/**
 * Evaluation API Service
 * TODO: Implement in Phase 5
 */
import { http } from '@/shared/services/api/http';

export const evaluationApi = {
  getCases: async () => {
    const response = await http.get('/cases');
    return response.data;
  },
  getCaseById: async (caseId: string) => {
    const response = await http.get(`/cases/${caseId}`);
    return response.data;
  },
  evaluateCase: async (caseId: string, configuration: any) => {
    const response = await http.post(`/cases/${caseId}/evaluate`, configuration);
    return response.data;
  },
};
