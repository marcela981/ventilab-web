import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for legacy features (quiz scores, flashcards, time tracking)
 */
export const useLegacyFeatures = () => {
  const [quizScores, setQuizScores] = useState({});
  const [timeSpent, setTimeSpent] = useState(0);
  const [flashcards, setFlashcards] = useState([]);
  const [flashcardReviews, setFlashcardReviews] = useState({});

  const saveQuizScore = useCallback((lessonId, score) => {
    if (!lessonId) return;
    setQuizScores(prev => ({ ...prev, [lessonId]: score }));
  }, []);

  const updateTimeSpent = useCallback((increment = 1) => {
    setTimeSpent(prev => prev + (Number.isFinite(increment) ? increment : 0));
  }, []);

  const addFlashcard = useCallback((flashcard) => {
    if (!flashcard?.id) return;
    setFlashcards(prev => {
      if (prev.some(f => f.id === flashcard.id)) return prev;
      return [...prev, { ...flashcard, createdAt: new Date().toISOString() }];
    });
  }, []);

  const updateFlashcard = useCallback((updatedFlashcard) => {
    if (!updatedFlashcard?.id) return;
    setFlashcards(prev => prev.map(f => 
      f.id === updatedFlashcard.id ? { ...f, ...updatedFlashcard } : f
    ));
  }, []);

  const markFlashcardReviewed = useCallback((flashcardId, rating) => {
    if (!flashcardId) return;
    setFlashcardReviews(prev => ({
      ...prev,
      [flashcardId]: {
        ...prev[flashcardId],
        lastReview: new Date().toISOString(),
        rating,
        totalReviews: (prev[flashcardId]?.totalReviews || 0) + 1,
      },
    }));
  }, []);

  const getFlashcardsDue = useCallback(() => {
    const now = new Date();
    return flashcards.filter(f => {
      if (!f?.sm2Data?.nextReviewDate) return true;
      return now >= new Date(f.sm2Data.nextReviewDate);
    });
  }, [flashcards]);

  const getFlashcardStats = useMemo(() => {
    const total = flashcards.length;
    const due = getFlashcardsDue().length;
    const newCards = flashcards.filter(f => !f?.sm2Data || f.sm2Data.repetitions === 0).length;
    const reviewed = flashcards.filter(f => f?.sm2Data && f.sm2Data.repetitions > 0).length;
    
    return {
      total,
      due,
      new: newCards,
      reviewed,
      completionRate: total > 0 ? (reviewed / total) * 100 : 0,
    };
  }, [flashcards, getFlashcardsDue]);

  return {
    quizScores,
    saveQuizScore,
    timeSpent,
    updateTimeSpent,
    flashcards,
    addFlashcard,
    updateFlashcard,
    flashcardReviews,
    markFlashcardReviewed,
    getFlashcardsDue,
    getFlashcardStats,
  };
};

