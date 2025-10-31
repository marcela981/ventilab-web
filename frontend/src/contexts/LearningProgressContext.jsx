"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Crear el Context con valores por defecto
const LearningProgressContext = createContext({
  // Estado
  completedLessons: new Set(),
  quizScores: {},
  timeSpent: 0,
  currentModule: '',
  flashcards: [],
  flashcardReviews: {},
  
  // Funciones
  markLessonComplete: () => {},
  saveQuizScore: () => {},
  updateTimeSpent: () => {},
  setCurrentModule: () => {},
  addFlashcard: () => {},
  updateFlashcard: () => {},
  markFlashcardReviewed: () => {},
  getFlashcardsDue: () => [],
  getFlashcardStats: {},
});

// Hook personalizado para usar el contexto
export const useLearningProgress = () => {
  const context = useContext(LearningProgressContext);
  if (!context) {
    throw new Error('useLearningProgress debe ser usado dentro de LearningProgressProvider');
  }
  return context;
};

// Provider del contexto
export const LearningProgressProvider = ({ children }) => {
  // Estado en memoria (sin persistencia)
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [quizScores, setQuizScores] = useState({});
  const [timeSpent, setTimeSpent] = useState(0);
  const [currentModule, setCurrentModule] = useState('');
  const [flashcards, setFlashcards] = useState([]);
  const [flashcardReviews, setFlashcardReviews] = useState({});

  // Función para marcar una lección como completada
  const markLessonComplete = useCallback((lessonId) => {
    setCompletedLessons(prev => new Set([...prev, lessonId]));
  }, []);

  // Función para guardar puntuación de quiz
  const saveQuizScore = useCallback((lessonId, score) => {
    setQuizScores(prev => ({
      ...prev,
      [lessonId]: score
    }));
  }, []);

  // Función para actualizar tiempo gastado
  const updateTimeSpent = useCallback((increment = 1) => {
    setTimeSpent(prev => prev + increment);
  }, []);

  // Función para establecer el módulo actual
  const setCurrentModuleHandler = useCallback((moduleId) => {
    setCurrentModule(moduleId);
  }, []);

  // Funciones para flashcards - memoizadas para evitar re-renders infinitos
  const addFlashcard = useCallback((flashcard) => {
    setFlashcards(prev => {
      // Evitar duplicados basándose en el ID
      const exists = prev.some(f => f.id === flashcard.id);
      if (exists) return prev;
      
      return [...prev, {
        ...flashcard,
        createdAt: new Date().toISOString()
      }];
    });
  }, []);

  const updateFlashcard = useCallback((updatedFlashcard) => {
    setFlashcards(prev => 
      prev.map(f => 
        f.id === updatedFlashcard.id ? updatedFlashcard : f
      )
    );
  }, []);

  const markFlashcardReviewed = useCallback((flashcardId, rating) => {
    setFlashcardReviews(prev => ({
      ...prev,
      [flashcardId]: {
        ...prev[flashcardId],
        lastReview: new Date().toISOString(),
        rating,
        totalReviews: (prev[flashcardId]?.totalReviews || 0) + 1
      }
    }));
  }, []);

  const getFlashcardsDue = useCallback(() => {
    if (!Array.isArray(flashcards)) return [];
    
    const now = new Date();
    return flashcards.filter(flashcard => {
      if (!flashcard || !flashcard.sm2Data || !flashcard.sm2Data.nextReviewDate) {
        return true; // New cards are always due
      }
      
      const nextReview = new Date(flashcard.sm2Data.nextReviewDate);
      return now >= nextReview;
    });
  }, [flashcards]);

  const getFlashcardStats = useMemo(() => {
    if (!Array.isArray(flashcards)) {
      return {
        total: 0,
        due: 0,
        new: 0,
        reviewed: 0,
        completionRate: 0
      };
    }
    
    const due = flashcards.filter(flashcard => {
      if (!flashcard || !flashcard.sm2Data || !flashcard.sm2Data.nextReviewDate) {
        return true; // New cards are always due
      }
      
      const nextReview = new Date(flashcard.sm2Data.nextReviewDate);
      const now = new Date();
      return now >= nextReview;
    }).length;
    
    const total = flashcards.length;
    const newCards = flashcards.filter(f => f && (!f.sm2Data || f.sm2Data.repetitions === 0)).length;
    const reviewed = flashcards.filter(f => f && f.sm2Data && f.sm2Data.repetitions > 0).length;
    
    return {
      total,
      due,
      new: newCards,
      reviewed,
      completionRate: total > 0 ? (reviewed / total) * 100 : 0
    };
  }, [flashcards]);

  // Valor del contexto - memoizado para evitar re-renders innecesarios
  const contextValue = useMemo(() => ({
    // Estado
    completedLessons,
    quizScores,
    timeSpent,
    currentModule,
    flashcards,
    flashcardReviews,
    
    // Funciones
    markLessonComplete,
    saveQuizScore,
    updateTimeSpent,
    setCurrentModule: setCurrentModuleHandler,
    addFlashcard,
    updateFlashcard,
    markFlashcardReviewed,
    getFlashcardsDue,
    getFlashcardStats,
  }), [
    completedLessons,
    quizScores,
    timeSpent,
    currentModule,
    flashcards,
    flashcardReviews,
    markLessonComplete,
    saveQuizScore,
    updateTimeSpent,
    setCurrentModuleHandler,
    addFlashcard,
    updateFlashcard,
    markFlashcardReviewed,
    getFlashcardsDue,
    getFlashcardStats,
  ]);

  return (
    <LearningProgressContext.Provider value={contextValue}>
      {children}
    </LearningProgressContext.Provider>
  );
};

export default LearningProgressContext;
