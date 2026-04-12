import { http } from '@/shared/services/api/http';
import type { ActivitySubmission, GradeSubmissionPayload, SaveSubmissionPayload } from '../evaluation.types';

export const submissionApi = {
  my: async (): Promise<ActivitySubmission[]> => {
    const { data } = await http.get('/api/activity-submissions/my');
    return data.submissions ?? [];
  },
  getById: async (id: string): Promise<ActivitySubmission> => {
    const { data } = await http.get(`/api/activity-submissions/${id}`);
    return data.submission;
  },
  getOrCreateForActivity: async (activityId: string): Promise<ActivitySubmission> => {
    const { data } = await http.post('/api/activity-submissions', { activityId });
    return data.submission;
  },
  saveDraft: async (id: string, payload: SaveSubmissionPayload): Promise<ActivitySubmission> => {
    const { data } = await http.put(`/api/activity-submissions/${id}`, payload);
    return data.submission;
  },
  submit: async (id: string): Promise<ActivitySubmission> => {
    const { data } = await http.post(`/api/activity-submissions/${id}/submit`);
    return data.submission;
  },
  grade: async (id: string, payload: GradeSubmissionPayload): Promise<ActivitySubmission> => {
    const { data } = await http.put(`/api/activity-submissions/${id}/grade`, payload);
    return data.submission;
  },
};

