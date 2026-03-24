const fs = require('fs');

const lessonViewerPath = 'c:/Marcela/TESIS/ventilab-web/src/features/ensenanza/curriculum/shared/leccion/LessonViewer.jsx';
let content = fs.readFileSync(lessonViewerPath, 'utf8');

// The new hook import
const hookImport = "import { useLessonViewerState } from './useLessonViewerState';\n";

// Find the start of the component body
const startMarker = "const LessonViewer = memo(({ lessonId, moduleId, onComplete, onNavigate, defaultOpen = false, onProgressUpdate }) => {";
const endMarker = "  const renderMediaBlock = useCallback((block, index) => {";

if (content.includes(startMarker) && content.includes(endMarker)) {
  const parts = content.split(startMarker);
  const part2 = parts[1].split(endMarker);
  
  // Replace the huge state block with a call to our hook
  const newStateBlock = `
  const state = useLessonViewerState({ lessonId, moduleId, onComplete, onNavigate, onProgressUpdate });
  const {
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
  } = state;

  const handleCloseSnackbar = useCallback(() => setSnackbarOpen(false), [setSnackbarOpen]);

`;
  
  // Insert import at the top
  const finalContent = hookImport + parts[0] + startMarker + newStateBlock + endMarker + part2[1];
  fs.writeFileSync(lessonViewerPath, finalContent, 'utf8');
  console.log('Successfully refactored LessonViewer.jsx');
} else {
  console.log('Markers not found');
}
