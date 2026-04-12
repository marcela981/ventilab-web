import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import useLesson from '@/features/ensenanza/shared/hooks/useLesson';
import { useLearningProgress } from '@/features/progress/LearningProgressContext';
import useLessonPages from '@/features/ensenanza/shared/hooks/useLessonPages';
import { useLessonProgress } from '@/features/ensenanza/shared/hooks/useLessonProgress';
import { useTopicContext } from '@/features/ensenanza/shared/hooks/useTopicContext';
import useScrollCompletion from '@/shared/hooks/useScrollCompletion';
import { getModuleById } from '@/features/ensenanza/shared/data/curriculumData';

export function useLessonViewerState({ lessonId, moduleId, onComplete, onNavigate, onProgressUpdate }) {
  const { data, isLoading, error, refetch } = useLesson(lessonId, moduleId);
  
  useEffect(() => {
    if (error && onNavigate) console.error('[LessonViewer] Error loading lesson:', error);
  }, [error, onNavigate]);
  
  const { completedLessons, getModuleProgressAggregated } = useLearningProgress();
  const module = useMemo(() => getModuleById(moduleId), [moduleId]);
  
  const moduleCompletion = useMemo(() => {
    if (!moduleId || !module?.lessons) return 0;
    const completedCount = module.lessons.filter(lesson => completedLessons.has(`${moduleId}-${lesson.id}`)).length;
    return Math.round((completedCount / module.lessons.length) * 100);
  }, [moduleId, module, completedLessons]);

  const isModuleCompleted = useMemo(() => {
    if (!moduleId) return false;
    return getModuleProgressAggregated(moduleId)?.isCompleted === true;
  }, [moduleId, getModuleProgressAggregated]);
  
  const totalLessons = useMemo(() => module?.lessons?.length || 0, [module]);
  
  const completedLessonsCount = useMemo(() => {
    if (!module || !module.lessons) return 0;
    return module.lessons.filter(lesson => completedLessons.has(`${moduleId}-${lesson.id}`)).length;
  }, [module, moduleId, completedLessons]);

  const currentLessonIndex = useMemo(() => {
    if (!module?.lessons) return 0;
    const idx = module.lessons.findIndex(l => l.id === lessonId);
    return idx >= 0 ? idx : 0;
  }, [module, lessonId]);

  const lessonType = useMemo(() => {
    if (!data) return 'teoria';
    return data.tipoDeLeccion || data.type || (data.content?.practicalCases?.length > 0 ? 'caso_clinico' : data.content?.assessment?.questions?.length > 0 ? 'evaluacion' : 'teoria');
  }, [data]);

  const estimatedTimeMinutes = useMemo(() => {
    const base = data?.estimatedTime || data?.duration || data?.metadata?.estimatedTime || module?.estimatedTime || 0;
    return typeof base === 'number' ? base : 0;
  }, [data, module]);

  const passingScore = useMemo(() => {
    const score = data?.content?.assessment?.passingScore ?? data?.assessment?.passingScore ?? data?.metadata?.passingScore;
    return typeof score === 'number' ? score : 70;
  }, [data]);

  const isFirstLesson = useMemo(() => {
    if (!module?.lessons || module.lessons.length === 0) return false;
    return module.lessons[0]?.id === lessonId;
  }, [module, lessonId]);

  const [caseAnswers, setCaseAnswers] = useState({});
  const [showCaseAnswers, setShowCaseAnswers] = useState({});
  const [assessmentAnswers, setAssessmentAnswers] = useState({});
  const [showAssessmentResults, setShowAssessmentResults] = useState(false);
  const [assessmentScore, setAssessmentScore] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const completedThisSessionRef = useRef(false);
  const previousLessonIdRef = useRef(lessonId);
  const tutorFinalSuggestionsDispatchedRef = useRef(false);
  const contentRef = useRef(null);
  const autoCompletionRef = useRef(false);
  const autoCompletionInFlightRef = useRef(false);
  const completionNotifiedRef = useRef(false);
  // Tracks whether the initial page position has been restored from backendProgress.
  // Once initialized for the current lessonId we never overwrite the user's manual navigation.
  const pageInitializedForLessonRef = useRef(null);

  const { isScrolledEnough, meetsReadingTime } = useScrollCompletion({ contentRef, estimatedTimeMinutes });

  const { localProgress, isSaving, isCompleted, isRateLimited, showResumeAlert, dismissResumeAlert, saveProgress, savePageProgress, backendProgress } = useLessonProgress({
    lessonId, moduleId, contentRef,
    onComplete: () => {
      const lessonKey = `${moduleId}-${lessonId}`;
      if (completedLessons.has(lessonKey) || completedThisSessionRef.current) return;
      completedThisSessionRef.current = true;
      setShowConfetti(true);
    },
    autoSaveThreshold: 5, autoCompleteThreshold: 90,
  });

  const wasLessonCompletedOnEntry = useMemo(() => {
    const lessonKey = `${moduleId}-${lessonId}`;
    return completedLessons.has(lessonKey) || backendProgress?.completed === true || isCompleted === true;
  }, [moduleId, lessonId, completedLessons, backendProgress, isCompleted]);

  useEffect(() => {
    completedThisSessionRef.current = false;
    autoCompletionRef.current = false;
    autoCompletionInFlightRef.current = false;
    completionNotifiedRef.current = false;
    tutorFinalSuggestionsDispatchedRef.current = false;
    if (previousLessonIdRef.current !== lessonId) {
      setCurrentPage(0);
      previousLessonIdRef.current = lessonId;
      // Reset the initialisation guard so backendProgress can set the correct
      // starting page for the new lesson.
      pageInitializedForLessonRef.current = null;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [lessonId]);

  useEffect(() => {
    // Only restore the initial page ONCE per lessonId.
    // If the user is manually navigating (including repeating a completed lesson)
    // we must not reset their position on every backendProgress update.
    if (pageInitializedForLessonRef.current === lessonId) return;

    if (!backendProgress) {
      try {
        const savedProgress = localStorage.getItem(`lesson_progress_${lessonId}`);
        if (savedProgress) {
          const { currentPage: savedPage } = JSON.parse(savedProgress);
          if (typeof savedPage === 'number' && savedPage >= 0) {
            setCurrentPage(savedPage);
            pageInitializedForLessonRef.current = lessonId;
            return;
          }
        }
      } catch (e) {
        console.error('[LessonViewer] Error reading localStorage:', e);
      }
      setCurrentPage(0);
      pageInitializedForLessonRef.current = lessonId;
      return;
    }
    // Completed lesson: start from the beginning so the user can freely navigate.
    // In-progress lesson: resume from the last saved step.
    if (backendProgress.completed) {
      setCurrentPage(0);
    } else if (backendProgress.currentStep && backendProgress.currentStep > 0) {
      setCurrentPage(backendProgress.currentStep - 1);
    } else {
      setCurrentPage(0);
    }
    pageInitializedForLessonRef.current = lessonId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [lessonId, backendProgress]);

  const handleNavigateToLesson = useCallback(async (targetLessonId, targetModuleId) => {
    if (targetLessonId === lessonId) return;
    if (!targetLessonId || !targetModuleId) return;
    try { await saveProgress(); } catch (error) { console.error('Failed to save progress', error); }
    if (onNavigate) {
      onNavigate(targetLessonId, targetModuleId);
    } else if (typeof window !== 'undefined') {
      window.location.href = `/teaching/lesson/${targetModuleId}/${targetLessonId}`;
    }
  }, [lessonId, saveProgress, onNavigate]);

  const triggerAutoCompletion = useCallback(async (scores = {}) => {
    if (!data || completedThisSessionRef.current || autoCompletionRef.current || autoCompletionInFlightRef.current) return false;
    if (wasLessonCompletedOnEntry || isModuleCompleted) return false;
    autoCompletionInFlightRef.current = true;
    try {
      await saveProgress(true, scores);
      autoCompletionRef.current = true;
      completedThisSessionRef.current = true;
      if (!completionNotifiedRef.current && onComplete && !wasLessonCompletedOnEntry) {
        completionNotifiedRef.current = true;
        onComplete(data);
      }
      return true;
    } catch (error) {
      setSnackbarMessage('No se pudo completar la lección automáticamente.');
      setSnackbarOpen(true);
      return false;
    } finally {
      autoCompletionInFlightRef.current = false;
    }
  }, [data, saveProgress, onComplete, wasLessonCompletedOnEntry, isModuleCompleted]);

  const handleCaseAnswerChange = useCallback((caseId, questionIndex, answer) => {
    setCaseAnswers(prev => ({ ...prev, [`${caseId}-${questionIndex}`]: answer }));
  }, []);
  const handleShowCaseAnswers = useCallback((caseId) => setShowCaseAnswers(prev => ({ ...prev, [caseId]: !prev[caseId] })), []);
  const handleAssessmentAnswerChange = useCallback((questionId, answer) => setAssessmentAnswers(prev => ({ ...prev, [questionId]: answer })), []);

  const handleSubmitAssessment = useCallback(() => {
    // Support both legacy (data.content.assessment.questions) and new JSON format (data.quiz.questions)
    const questions = data?.quiz?.questions || data?.content?.assessment?.questions;
    if (!questions || questions.length === 0) return;
    let correct = 0;
    let total = questions.length;
    questions.forEach((question) => {
      const qId = question.questionId || question.id || '';
      const userAnswer = assessmentAnswers[qId];
      if (userAnswer === undefined) return;
      // New JSON format: correctAnswer is the full text; compare by finding its index in options
      let expectedAnswer = String(question.correctAnswer);
      if (question.options && question.options.indexOf) {
        const idx = question.options.indexOf(question.correctAnswer);
        if (idx >= 0) expectedAnswer = String(idx);
      }
      if (String(userAnswer) === expectedAnswer) correct++;
    });
    const percentage = Math.round((correct / total) * 100);
    setAssessmentScore({ correct, total, percentage });
    setShowAssessmentResults(true);
    if (percentage >= passingScore && !wasLessonCompletedOnEntry) triggerAutoCompletion({ quizScore: percentage });
  }, [data, assessmentAnswers, passingScore, triggerAutoCompletion, wasLessonCompletedOnEntry]);

  const calculatePages = useLessonPages(data, moduleId, moduleCompletion);
  const totalPages = calculatePages.length;
  const currentPageData = calculatePages[currentPage];

  useEffect(() => {
    if (onProgressUpdate && totalPages > 0) onProgressUpdate(currentPage, totalPages);
  }, [currentPage, totalPages, onProgressUpdate]);

  const topicContext = useTopicContext({ contentRef, moduleId, lessonId, sectionId: currentPageData?.section?.id || currentPageData?.sectionId || null, moduleData: module, lessonData: data, sectionData: currentPageData?.section || currentPageData || null });

  const totalSteps = useMemo(() => (!data?.sections || !Array.isArray(data.sections)) ? totalPages : data.sections.length, [data, totalPages]);

  const handleNextPage = useCallback(async () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(c => c + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      try { await savePageProgress(currentPage + 1, totalPages, totalSteps); } catch (e) {}
    }
  }, [currentPage, totalPages, totalSteps, savePageProgress]);

  const handlePrevPage = useCallback(async () => {
    if (currentPage > 0) {
      setCurrentPage(c => c - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      try { await savePageProgress(currentPage - 1, totalPages, totalSteps); } catch (e) {}
    }
  }, [currentPage, totalPages, totalSteps, savePageProgress]);

  const handleNavigateToPage = useCallback((targetPageIndex) => {
    if (targetPageIndex >= 0 && targetPageIndex < totalPages) {
      setCurrentPage(targetPageIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      savePageProgress(targetPageIndex, totalPages, totalSteps);
    }
  }, [totalPages, totalSteps, savePageProgress]);

  const handleSelectLesson = useCallback((index) => {
    if (!module?.lessons) return;
    if (!isModuleCompleted && index > currentLessonIndex) return;
    const targetLesson = module.lessons[index];
    if (!targetLesson || targetLesson.id === lessonId) return;
    if (onNavigate) onNavigate(targetLesson.id, moduleId);
  }, [module, isModuleCompleted, currentLessonIndex, lessonId, moduleId, onNavigate]);

  useEffect(() => {
    const completionPageIndex = calculatePages.findIndex(page => page.type === 'completion');
    if (completionPageIndex >= 0 && currentPage === completionPageIndex && data) {
      if (!completedThisSessionRef.current && !wasLessonCompletedOnEntry) {
        completedThisSessionRef.current = true;
        setShowConfetti(true);
      }
      if (!completionNotifiedRef.current && onComplete && !wasLessonCompletedOnEntry) {
        completionNotifiedRef.current = true;
        onComplete(data);
      }
      if (!tutorFinalSuggestionsDispatchedRef.current && !completedLessons.has(`${moduleId}-${lessonId}`)) {
        tutorFinalSuggestionsDispatchedRef.current = true;
        window.dispatchEvent(new CustomEvent('tutor:finalSuggestions', { detail: { ctx: { moduleId, lessonId }, results: assessmentScore } }));
      }
    }
    if (isCompleted && !completedThisSessionRef.current && !wasLessonCompletedOnEntry) {
      completedThisSessionRef.current = true;
      setShowConfetti(true);
    }
  }, [currentPage, calculatePages, data, isCompleted, moduleId, lessonId, module, currentPageData, assessmentScore, onComplete, completedLessons, wasLessonCompletedOnEntry]);

  const buildLessonContext = useCallback(() => {
    if (!data) return null;
    return { lessonId: data.lessonId || lessonId, title: data.title || '', objectives: data.content?.introduction?.objectives || [], tags: data.tags || [], tipoDeLeccion: lessonType };
  }, [data, lessonId, lessonType]);

  return {
    data, isLoading, error, refetch, module, moduleCompletion, isModuleCompleted,
    totalLessons, completedLessonsCount, currentLessonIndex, lessonType, isFirstLesson,
    caseAnswers, showCaseAnswers, assessmentAnswers, showAssessmentResults, assessmentScore,
    snackbarOpen, snackbarMessage, completionDialogOpen, currentPage, showConfetti,
    contentRef, isRateLimited, showResumeAlert, backendProgress, localProgress,
    dismissResumeAlert, totalPages, currentPageData, topicContext, totalSteps,
    wasLessonCompletedOnEntry,
    handleNavigateToLesson, triggerAutoCompletion, handleCaseAnswerChange,
    handleShowCaseAnswers, handleAssessmentAnswerChange, handleSubmitAssessment,
    handleNextPage, handlePrevPage, handleNavigateToPage, handleSelectLesson,
    setSnackbarOpen, setCompletionDialogOpen, setShowAssessmentResults,
    setAssessmentAnswers, setShowConfetti, buildLessonContext, setCurrentPage,
    calculatePages
  };
}
