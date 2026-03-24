/**
 * =============================================================================
 * useQuestionSuggestions Hook
 * =============================================================================
 * 
 * Hook para gestionar sugerencias de preguntas de forma determinista y rápida.
 * Soporta modo cliente (determinista) y modo servidor (embeddings) con fallback.
 * 
 * @hook
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { buildCandidateBank, rerankCandidates } from '@/shared/utils/suggestions.es';

/**
 * Feature flag para modo de sugerencias
 * Valores: 'client' | 'server'
 * Por defecto: 'client'
 */
const AI_SUGGESTIONS_MODE = process.env.NEXT_PUBLIC_AI_SUGGESTIONS_MODE || 'client';

/**
 * Timeout para llamadas al servidor (5 segundos)
 */
const SERVER_TIMEOUT = 5000;

/**
 * Llamar al backend para obtener sugerencias usando embeddings
 * @param {Object} context - Contexto de la sección
 * @param {string} seed - Texto semilla (input del usuario)
 * @returns {Promise<Array<{id: string, text: string}>>} Array de sugerencias
 */
async function fetchServerSuggestions(context, seed) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SERVER_TIMEOUT);
    
    const response = await fetch(`${API_BASE_URL}/ai/suggest-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: JSON.stringify({
        context: {
          moduleId: context.moduleId,
          lessonId: context.lessonId,
          sectionId: context.sectionId,
          sectionTitle: context.sectionTitle,
          lessonTitle: context.lessonTitle,
          visibleText: (context.visibleText || context.visibleTextBlock || '').substring(0, 2000), // Limitar para performance
        },
        seed: seed || '',
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Nuevo formato: { success: true, data: { suggestions: [{ id, text }, ...] } }
    if (data.success && Array.isArray(data.data?.suggestions)) {
      return data.data.suggestions
        .map((s) => ({
          id: s.id || `server-${s.text?.substring(0, 10)}`,
          text: typeof s === 'string' ? s : s.text || '',
        }))
        .filter((s) => s.text && s.text.length >= 10);
    }
    
    throw new Error('Invalid server response');
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Server timeout');
    }
    throw error;
  }
}

/**
 * Hook para gestionar sugerencias de preguntas
 * @param {Object} params - Parámetros del hook
 * @param {Object} params.context - Contexto de useTopicContext
 * @param {string} params.initialSeed - Input inicial (prefill)
 * @param {string[]} params.bank - Opcional: sugerencias definidas en metadata
 * @returns {Object} Objeto con sugerencias y funciones de control
 */
export function useQuestionSuggestions({ context, initialSeed = '', bank = null }) {
  // Estado
  const [currentSeed, setCurrentSeed] = useState(initialSeed || '');
  const [windowIndex, setWindowIndex] = useState(0);
  const [serverMode, setServerMode] = useState(AI_SUGGESTIONS_MODE === 'server');
  const [serverError, setServerError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const candidateBankRef = useRef(null);
  const lastContextRef = useRef(null);
  
  // Construir banco de candidatos (memoizado, solo se recalcula si cambia el contexto)
  const candidateBank = useMemo(() => {
    // Verificar si el contexto cambió significativamente
    const contextKey = `${context.moduleId}-${context.lessonId}-${context.sectionId}`;
    const lastKey = lastContextRef.current;
    
    if (candidateBankRef.current && contextKey === lastKey) {
      return candidateBankRef.current;
    }
    
    // Extraer bank de metadata si existe
    // Nota: lessonData y sectionData no están en el contexto por defecto
    // Si se necesitan, deben pasarse explícitamente o estar disponibles en el contexto
    const bankFromMetadata = bank || null;
    
    const builtBank = buildCandidateBank(context, bankFromMetadata);
    candidateBankRef.current = builtBank;
    lastContextRef.current = contextKey;
    
    return builtBank;
  }, [context, bank]);
  
  // Obtener sugerencias rankeadas (memoizado)
  const rankedSuggestions = useMemo(() => {
    if (!candidateBank || candidateBank.length === 0) return [];
    
    // Si hay seed, re-rankear
    if (currentSeed && currentSeed.trim().length > 0) {
      return rerankCandidates(currentSeed.trim(), candidateBank, candidateBank.length);
    }
    
    // Si no hay seed, retornar todas ordenadas por orden original (contexto)
    return candidateBank.map((c, index) => ({ ...c, score: 0, originalIndex: index }));
  }, [candidateBank, currentSeed]);
  
  // Obtener ventana actual de sugerencias (top-2)
  const suggestions = useMemo(() => {
    if (rankedSuggestions.length === 0) return [];
    
    const windowSize = 2;
    const startIndex = windowIndex * windowSize;
    const endIndex = startIndex + windowSize;
    
    let windowSuggestions = rankedSuggestions.slice(startIndex, endIndex);
    
    // Si no hay suficientes en la ventana actual, completar desde el inicio (ciclo)
    if (windowSuggestions.length < windowSize && rankedSuggestions.length > 0) {
      const remaining = windowSize - windowSuggestions.length;
      const additional = rankedSuggestions.slice(0, remaining);
      windowSuggestions = [...windowSuggestions, ...additional];
    }
    
    return windowSuggestions.slice(0, windowSize);
  }, [rankedSuggestions, windowIndex]);
  
  // Intentar obtener sugerencias del servidor (si está en modo servidor)
  useEffect(() => {
    if (!serverMode || !context) return;
    
    const fetchSuggestions = async () => {
      setIsLoading(true);
      setServerError(null);
      
      try {
        const serverSuggestions = await fetchServerSuggestions(context, currentSeed);
        
        if (serverSuggestions && serverSuggestions.length > 0) {
          // Reemplazar banco de candidatos con sugerencias del servidor
          candidateBankRef.current = serverSuggestions;
          setWindowIndex(0); // Resetear ventana
        }
      } catch (error) {
        console.warn('[useQuestionSuggestions] Server fetch failed, falling back to client mode:', error);
        setServerError(error.message);
        setServerMode(false); // Fallback a modo cliente
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSuggestions();
  }, [serverMode, context, currentSeed]);
  
  /**
   * Re-rankear sugerencias con nuevo seed (query del usuario)
   * @param {string} seed - Nuevo texto semilla
   */
  const rerank = useCallback((seed) => {
    setCurrentSeed(seed || '');
    setWindowIndex(0); // Resetear ventana al re-rankear
  }, []);
  
  /**
   * Avanzar a la siguiente ventana de sugerencias (refresh)
   */
  const refresh = useCallback(() => {
    const maxWindows = Math.ceil(rankedSuggestions.length / 2);
    setWindowIndex(prev => (prev + 1) % maxWindows);
  }, [rankedSuggestions.length]);
  
  /**
   * Resetear a estado inicial
   */
  const reset = useCallback(() => {
    setCurrentSeed(initialSeed || '');
    setWindowIndex(0);
    setServerError(null);
  }, [initialSeed]);
  
  return {
    suggestions,
    rankedSuggestions, // Todas las sugerencias rankeadas (para debug/analytics)
    candidateBank, // Banco completo de candidatos
    refresh,
    rerank,
    reset,
    windowIndex,
    isLoading,
    serverMode,
    serverError,
    hasMore: rankedSuggestions.length > (windowIndex + 1) * 2,
  };
}

export default useQuestionSuggestions;

