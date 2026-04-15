import { http } from '@/shared/services/api/http';
import type { Activity, CreateActivityPayload, UpdateActivityPayload } from '../evaluation.types';

export const activityApi = {
  list: async (): Promise<Activity[]> => {
    const { data } = await http.get('/api/evaluation/activities');
    return data.activities ?? [];
  },
  getById: async (id: string): Promise<Activity> => {
    const { data } = await http.get(`/api/evaluation/activities/${id}`);
    return data.activity;
  },
  create: async (payload: CreateActivityPayload): Promise<Activity> => {
    const { data } = await http.post('/api/evaluation/activities', payload);
    return data.activity;
  },
  update: async (id: string, payload: UpdateActivityPayload): Promise<Activity> => {
    const { data } = await http.put(`/api/evaluation/activities/${id}`, payload);
    return data.activity;
  },
  remove: async (id: string): Promise<Activity> => {
    const { data } = await http.delete(`/api/evaluation/activities/${id}`);
    return data.activity;
  },
  publish: async (id: string): Promise<Activity> => {
    const { data } = await http.post(`/api/evaluation/activities/${id}/publish`);
    return data.activity;
  },
  listSubmissions: async (id: string, params?: { groupId?: string }) => {
    const query = params?.groupId ? `?groupId=${encodeURIComponent(params.groupId)}` : '';
    const { data } = await http.get(`/api/evaluation/activities/${id}/submissions${query}`);
    return data.submissions ?? [];
  },
};

