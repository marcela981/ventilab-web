/*
 * Funcionalidad: Cliente API del flujo clínico-paramétrico (OE2/OE3)
 * Descripción: Wrapper sobre las instancias Axios compartidas (`http` / `httpSlow`)
 *              para los endpoints de casos clínicos del backend:
 *                GET  /api/cases              → lista de casos
 *                GET  /api/cases/:id          → detalle del caso (sin config experta)
 *                POST /api/cases/:id/evaluate → comparación con experto + feedback
 *              `evaluateCase` usa `httpSlow` (60 s) porque, cuando exista clave de
 *              IA, la generación de feedback puede tardar; sin IA el backend cae a
 *              su feedback determinístico y responde de inmediato.
 *              NO crea un segundo cliente HTTP: reutiliza el módulo compartido.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */
import { http, httpSlow } from '@/shared/services/api/http';
import type {
  ClinicalCaseListResponse,
  ClinicalCaseDetailResponse,
  EvaluationResult,
  VentilatorConfiguration,
} from './evaluation.types';

export const evaluationApi = {
  /** GET /api/cases — lista de casos clínicos activos (sin configuración experta). */
  getCases: async (): Promise<ClinicalCaseListResponse> => {
    const response = await http.get<ClinicalCaseListResponse>('/cases');
    return response.data;
  },

  /** GET /api/cases/:id — detalle del caso + intentos del usuario. */
  getCaseById: async (caseId: string): Promise<ClinicalCaseDetailResponse> => {
    const response = await http.get<ClinicalCaseDetailResponse>(`/cases/${caseId}`);
    return response.data;
  },

  /**
   * POST /api/cases/:id/evaluate — compara la configuración del usuario con la
   * del experto y devuelve score + comparación paramétrica + feedback (LLM o
   * fallback determinístico). El backend acepta `{ configuration }` o el cuerpo
   * plano; enviamos el envoltorio `{ configuration }` por claridad.
   */
  evaluateCase: async (
    caseId: string,
    configuration: VentilatorConfiguration,
  ): Promise<EvaluationResult> => {
    const response = await httpSlow.post<EvaluationResult>(
      `/cases/${caseId}/evaluate`,
      { configuration },
    );
    return response.data;
  },
};

export default evaluationApi;
