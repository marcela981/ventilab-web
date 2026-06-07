/*
 * Funcionalidad : Hook del flujo clínico-paramétrico (OE2/OE3)
 * Descripción   : Carga el detalle de un caso clínico y envía la configuración
 *                 del estudiante para compararla con la del experto. Gestiona
 *                 estados de carga / error / resultado.
 *
 *                 RESILIENTE A FALTA DE IA: si el backend respondió (200) con
 *                 feedback determinístico (fallback), eso NO es un error — se
 *                 renderiza igual. Sólo se trata como error un fallo de red o un
 *                 status ≠ 2xx. Se infiere el origen del feedback (IA vs
 *                 determinístico) porque la respuesta no trae un flag explícito.
 * Versión       : 1.0
 * Autor         : Marcela Mazo Castro
 * Proyecto      : VentyLab
 * Tesis         : Desarrollo de una aplicación web para la enseñanza de mecánica
 *                 ventilatoria que integre un sistema de retroalimentación usando
 *                 modelos de lenguaje
 * Institución   : Universidad del Valle
 * Contacto      : marcela.mazo@correounivalle.edu.co
 */
import { useCallback, useEffect, useState } from 'react';
import { evaluationApi } from '../evaluation.api';
import type {
  ClinicalCaseDetail,
  EvaluationResult,
  FeedbackSource,
  VentilatorConfiguration,
} from '../evaluation.types';

/**
 * Infiere si el feedback fue determinístico (fallback) o generado por IA.
 * El fallback del backend (`generateFallbackFeedback`) produce SIEMPRE un texto
 * que empieza por «Tu configuración obtuvo un score de …» y fortalezas/mejoras
 * usando los nombres crudos de los parámetros (p.ej. «tidalVolume necesita
 * ajuste»). La IA produce prosa natural en español. Mientras la respuesta no
 * exponga un flag explícito, esta heurística es suficiente para el indicador.
 */
export function inferFeedbackSource(result: EvaluationResult | null): FeedbackSource {
  if (!result) return 'fallback';
  const text = result.feedback?.text ?? '';
  const looksDeterministic =
    /^Tu configuración obtuvo un score de/i.test(text.trim()) ||
    result.feedback?.improvements?.some((s) => /necesita ajuste \(diferencia:/i.test(s)) === true;
  return looksDeterministic ? 'fallback' : 'ia';
}

interface UseClinicalCaseEvaluationResult {
  clinicalCase: ClinicalCaseDetail | null;
  isLoadingCase: boolean;
  caseError: string | null;
  result: EvaluationResult | null;
  feedbackSource: FeedbackSource;
  isEvaluating: boolean;
  evaluateError: string | null;
  evaluate: (configuration: VentilatorConfiguration) => Promise<void>;
  reset: () => void;
}

export function useClinicalCaseEvaluation(caseId?: string): UseClinicalCaseEvaluationResult {
  const [clinicalCase, setClinicalCase] = useState<ClinicalCaseDetail | null>(null);
  const [isLoadingCase, setIsLoadingCase] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);

  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluateError, setEvaluateError] = useState<string | null>(null);

  const loadCase = useCallback(async (id: string) => {
    setIsLoadingCase(true);
    setCaseError(null);
    try {
      const data = await evaluationApi.getCaseById(id);
      setClinicalCase(data.case);
    } catch (e: unknown) {
      setCaseError(e instanceof Error ? e.message : 'Error cargando el caso clínico');
    } finally {
      setIsLoadingCase(false);
    }
  }, []);

  useEffect(() => {
    if (caseId) loadCase(caseId);
  }, [caseId, loadCase]);

  const evaluate = useCallback(
    async (configuration: VentilatorConfiguration) => {
      if (!caseId) return;
      setIsEvaluating(true);
      setEvaluateError(null);
      try {
        const data = await evaluationApi.evaluateCase(caseId, configuration);
        // 200 con feedback (IA o fallback) → resultado válido, NO error.
        setResult(data);
      } catch (e: unknown) {
        setEvaluateError(
          e instanceof Error ? e.message : 'No se pudo evaluar la configuración',
        );
      } finally {
        setIsEvaluating(false);
      }
    },
    [caseId],
  );

  const reset = useCallback(() => {
    setResult(null);
    setEvaluateError(null);
  }, []);

  return {
    clinicalCase,
    isLoadingCase,
    caseError,
    result,
    feedbackSource: inferFeedbackSource(result),
    isEvaluating,
    evaluateError,
    evaluate,
    reset,
  };
}

export default useClinicalCaseEvaluation;
