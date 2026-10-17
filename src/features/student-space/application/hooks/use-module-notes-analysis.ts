/*
* Funcionalidad: useModuleNotesAnalysis
* Descripción: On-demand AI analysis of the caller's notes of one module (`POST /api/notes/analyze` with moduleId), the same flow as the lesson analysis of the learning feature (useNotesAnalysis): result, error and pending state, reset when the module changes, and the answer of a previous module is dropped. Depends on React, the learning NotesAnalysis type and the student space service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useRef, useState } from "react";
import type { NotesAnalysis } from "@features/learning";
import { analyzeModuleNotes } from "../../api/services/student-space.service";

export type ModuleNotesAnalysisState = {
  analysis: NotesAnalysis | null
  error: unknown
  isAnalyzing: boolean
  analyze: () => Promise<void>
};

export function useModuleNotesAnalysis(moduleId: string): ModuleNotesAnalysisState {
  const [analysis, setAnalysis] = useState<NotesAnalysis | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const moduleRef = useRef(moduleId);

  useEffect(() => {
    moduleRef.current = moduleId;
    setAnalysis(null);
    setError(null);
    setIsAnalyzing(false);
  }, [moduleId]);

  const analyze = useCallback(async() => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeModuleNotes(moduleId);

      if (moduleRef.current === moduleId) {
        setAnalysis(result);
      }
    } catch (caught) {
      if (moduleRef.current === moduleId) {
        setError(caught);
      }
    } finally {
      if (moduleRef.current === moduleId) {
        setIsAnalyzing(false);
      }
    }
  }, [moduleId]);

  return { analysis, error, isAnalyzing, analyze };
}
