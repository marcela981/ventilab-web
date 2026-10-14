/*
* Funcionalidad: useNotesAnalysis
* Descripción: On-demand AI analysis of the caller's notes of one lesson (`POST /api/notes/analyze` with the slow timeout). Keeps the last analysis, the error and the in-flight flag; the result of a request is ignored when the lesson changed meanwhile, and the state resets when the lesson changes. Depends on react, the notes service and the note entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeLessonNotes } from "../../api/services/notes.service";
import type { NotesAnalysis } from "../entities/note.entity";

export type NotesAnalysisState = {
  analysis: NotesAnalysis | null
  error: unknown
  isAnalyzing: boolean
  analyze: () => Promise<void>
};

export function useNotesAnalysis(lessonId: string): NotesAnalysisState {
  const [analysis, setAnalysis] = useState<NotesAnalysis | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const lessonRef = useRef(lessonId);

  useEffect(() => {
    lessonRef.current = lessonId;
    setAnalysis(null);
    setError(null);
    setIsAnalyzing(false);
  }, [lessonId]);

  const analyze = useCallback(async() => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeLessonNotes(lessonId);

      if (lessonRef.current === lessonId) {
        setAnalysis(result);
      }
    } catch (caught) {
      if (lessonRef.current === lessonId) {
        setError(caught);
      }
    } finally {
      if (lessonRef.current === lessonId) {
        setIsAnalyzing(false);
      }
    }
  }, [lessonId]);

  return { analysis, error, isAnalyzing, analyze };
}
