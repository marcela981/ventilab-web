"use client";

import React, { createContext, useContext, useState } from 'react';

// Crear el Context con valores por defecto
const LearningProgressContext = createContext({
  // Estado
  completedLessons: new Set(),
  quizScores: {},
  timeSpent: 0,
  currentModule: '',
  
  // Funciones
  markLessonComplete: () => {},
  saveQuizScore: () => {},
  updateTimeSpent: () => {},
  setCurrentModule: () => {},
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

  // Función para marcar una lección como completada
  const markLessonComplete = (lessonId) => {
    setCompletedLessons(prev => new Set([...prev, lessonId]));
  };

  // Función para guardar puntuación de quiz
  const saveQuizScore = (lessonId, score) => {
    setQuizScores(prev => ({
      ...prev,
      [lessonId]: score
    }));
  };

  // Función para actualizar tiempo gastado
  const updateTimeSpent = (increment = 1) => {
    setTimeSpent(prev => prev + increment);
  };

  // Función para establecer el módulo actual
  const setCurrentModuleHandler = (moduleId) => {
    setCurrentModule(moduleId);
  };

  // Valor del contexto
  const contextValue = {
    // Estado
    completedLessons,
    quizScores,
    timeSpent,
    currentModule,
    
    // Funciones
    markLessonComplete,
    saveQuizScore,
    updateTimeSpent,
    setCurrentModule: setCurrentModuleHandler,
  };

  return (
    <LearningProgressContext.Provider value={contextValue}>
      {children}
    </LearningProgressContext.Provider>
  );
};

export default LearningProgressContext;
