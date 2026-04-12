import { http } from '@/shared/services/api/http';
import type { ActivityAssignment, AssignActivityPayload } from '../evaluation.types';

export const assignmentApi = {
  listForActivity: async (activityId: string): Promise<ActivityAssignment[]> => {
    const { data } = await http.get(`/api/activity-assignments?activityId=${encodeURIComponent(activityId)}`);
    return data.assignments ?? [];
  },
  upsert: async (payload: AssignActivityPayload): Promise<ActivityAssignment> => {
    const { data } = await http.post('/api/activity-assignments', payload);
    return data.assignment;
  },
  remove: async (assignmentId: string): Promise<ActivityAssignment> => {
    const { data } = await http.delete(`/api/activity-assignments/${assignmentId}`);
    return data.assignment;
  },
};

