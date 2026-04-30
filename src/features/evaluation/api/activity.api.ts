/*
 * Funcionalidad: API client de Actividades (docente)
 * Descripción: Wrapper Axios para CRUD de actividades de evaluación desde el panel docente.
 *              Tipado con ApiResponse<T> en los endpoints que retornan { success, data }.
 * Versión: 2.1
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { httpSlow } from '@/shared/services/api/http';
import type { ApiResponse } from '@/types/api';
import type { Activity, ActivitySubmission, CreateActivityPayload, UpdateActivityPayload } from '../evaluation.types';

interface ActivityBody    { activity: Activity }
interface ActivitiesBody  { activities?: Activity[]; data?: Activity[] }
interface SubmissionsBody { submissions: ActivitySubmission[] }

export const activityApi = {
  list: async (): Promise<Activity[]> => {
    const { data } = await httpSlow.get<ActivitiesBody>('/evaluation/activities');
    // Backend: GET /api/evaluation/activities → { success: true, data: Activity[] }
    return (data as ApiResponse<Activity[]>).data ?? (data as ActivitiesBody).activities ?? [];
  },
  getById: async (id: string): Promise<Activity> => {
    const { data } = await httpSlow.get<ActivityBody>(`/evaluation/activities/${id}`);
    return data.activity;
  },
  create: async (payload: CreateActivityPayload): Promise<Activity> => {
    const { data } = await httpSlow.post<ActivityBody>('/activities', payload);
    return data.activity;
  },
  update: async (id: string, payload: UpdateActivityPayload): Promise<Activity> => {
    const { data } = await httpSlow.put<ActivityBody>(`/activities/${id}`, payload);
    return data.activity;
  },
  remove: async (id: string): Promise<Activity> => {
    const { data } = await httpSlow.delete<ActivityBody>(`/activities/${id}`);
    return data.activity;
  },
  publish: async (id: string): Promise<Activity> => {
    const { data } = await httpSlow.post<ActivityBody>(`/activities/${id}/publish`);
    return data.activity;
  },
  listSubmissions: async (id: string, params?: { groupId?: string }) => {
    const query = params?.groupId ? `?groupId=${encodeURIComponent(params.groupId)}` : '';
    const { data } = await httpSlow.get<SubmissionsBody>(`/activities/${id}/submissions${query}`);
    return data.submissions ?? [];
  },
};
