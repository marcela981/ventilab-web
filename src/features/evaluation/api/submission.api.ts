/*
 * Funcionalidad: API client de Entregas (submissions)
 * Descripción: Wrapper Axios para los endpoints /activity-submissions del backend.
 *              Usa httpSlow (60 s): el timeout de 8 s de la instancia rápida
 *              moría con el cold start de Neon y hacía fallar en silencio la
 *              lectura de estado y el envío de entregas.
 *              Nota de inconsistencia: GET /activity-submissions/my retorna
 *              { success, submissions } en lugar del estándar { success, data }.
 *              Usar SubmissionsApiResponse hasta que el backend sea alineado.
 * Versión: 2.1
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { httpSlow } from '@/shared/services/api/http';
import type { SubmissionsApiResponse } from '@/types/api';
import type { ActivitySubmission, GradeSubmissionPayload, SaveSubmissionPayload } from '../evaluation.types';

interface SubmissionBody   { submission: ActivitySubmission }
interface SubmissionsBody  { submissions: ActivitySubmission[] }

export const submissionApi = {
  // TODO: cuando el backend alinee este endpoint a { success, data: [...] },
  // cambiar SubmissionsApiResponse → ApiResponse<ActivitySubmission[]>
  // y leer data.data en lugar de data.submissions.
  my: async (): Promise<ActivitySubmission[]> => {
    const { data } = await httpSlow.get<SubmissionsApiResponse<ActivitySubmission[]>>(
      '/activity-submissions/my',
    );
    // Backend: GET /api/activity-submissions/my → { success: true, submissions: [...] }
    return data.submissions ?? [];
  },
  getById: async (id: string): Promise<ActivitySubmission> => {
    const { data } = await httpSlow.get<SubmissionBody>(`/activity-submissions/${id}`);
    return data.submission;
  },
  saveDraft: async (id: string, payload: SaveSubmissionPayload): Promise<ActivitySubmission> => {
    const { data } = await httpSlow.put<SubmissionBody>(`/activity-submissions/${id}`, payload);
    return data.submission;
  },
  submit: async (id: string): Promise<ActivitySubmission> => {
    const { data } = await httpSlow.post<SubmissionBody>(`/activity-submissions/${id}/submit`);
    return data.submission;
  },
  grade: async (id: string, payload: GradeSubmissionPayload): Promise<ActivitySubmission> => {
    const { data } = await httpSlow.put<SubmissionBody>(`/activity-submissions/${id}/grade`, payload);
    return data.submission;
  },

  getForActivity: async (activityId: string): Promise<ActivitySubmission | null> => {
    try {
      const { data } = await httpSlow.get<SubmissionBody>(
        `/activity-submissions/for-activity/${activityId}`,
      );
      return data.submission ?? null;
    } catch {
      return null;
    }
  },

  getOrCreateForActivity: async (activityId: string): Promise<ActivitySubmission> => {
    try {
      const { data } = await httpSlow.post<SubmissionBody>('/activity-submissions', { activityId });
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
    await httpSlow.delete(`/activity-submissions/${id}/reset`);
  },
};

