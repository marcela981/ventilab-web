import { http } from '@/shared/services/api/http';
import type { ActivitySubmission, GradeSubmissionPayload, SaveSubmissionPayload } from '../evaluation.types';

export const submissionApi = {
  my: async (): Promise<ActivitySubmission[]> => {
    const { data } = await http.get('/activity-submissions/my');
    return data.submissions ?? [];
  },
  getById: async (id: string): Promise<ActivitySubmission> => {
    const { data } = await http.get(`/activity-submissions/${id}`);
    return data.submission;
  },
  saveDraft: async (id: string, payload: SaveSubmissionPayload): Promise<ActivitySubmission> => {
    const { data } = await http.put(`/activity-submissions/${id}`, payload);
    return data.submission;
  },
  submit: async (id: string): Promise<ActivitySubmission> => {
    const { data } = await http.post(`/activity-submissions/${id}/submit`);
    return data.submission;
  },
  grade: async (id: string, payload: GradeSubmissionPayload): Promise<ActivitySubmission> => {
    const { data } = await http.put(`/activity-submissions/${id}/grade`, payload);
    return data.submission;
  },

  // Returns null if not attempted; never throws on 404
  getForActivity: async (activityId: string): Promise<ActivitySubmission | null> => {
    try {
      const { data } = await http.get(`/activity-submissions/for-activity/${activityId}`);
      return data.submission ?? null;
    } catch {
      return null;
    }
  },

  // Transparently returns existing submission on 409 (already-completed)
  getOrCreateForActivity: async (activityId: string): Promise<ActivitySubmission> => {
    try {
      const { data } = await http.post('/activity-submissions', { activityId });
      return data.submission;
    } catch (e: unknown) {
      const axiosErr = e as { response?: { status?: number; data?: { submission?: ActivitySubmission } } };
      if (axiosErr?.response?.status === 409 && axiosErr.response?.data?.submission) {
        return axiosErr.response.data.submission;
      }
      throw e;
    }
  },

  resetById: async (id: string): Promise<void> => {
    await http.delete(`/activity-submissions/${id}/reset`);
  },
};

