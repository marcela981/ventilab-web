import React, { Suspense, lazy } from 'react';
import { Box, Paper, Skeleton, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import PrerequisiteTooltip from '@/features/ensenanza/shared/components/modulos/ModuleCard/PrerequisiteTooltip';

import {
  LessonHeader,
  IntroductionSection,
  TheorySection,
  AnalogiesSection,
  VisualElementsSection,
  WaveformsSection,
  ParameterTablesSection,
  KeyPointsSection,
  AssessmentSection,
  ReferencesSection,
  PracticalCaseSection,
  CompletionPage,
} from './sections';

const ClinicalCaseViewer = lazy(() => import('../clinical/ClinicalCaseViewer'));

const LessonPageRenderer = ({
  data,
  currentPageData,
  currentPage,
  totalPages,
  moduleId,
  lessonId,
  caseAnswers,
  showCaseAnswers,
  handleCaseAnswerChange,
  handleShowCaseAnswers,
  assessmentAnswers,
  showAssessmentResults,
  assessmentScore,
  handleAssessmentAnswerChange,
  handleSubmitAssessment,
  setShowAssessmentResults,
  setAssessmentAnswers,
  handleNavigateToLesson,
  moduleCompletion,
  triggerAutoCompletion,
  calculatePages,
  setCurrentPage,
  completedLessonsCount,
  totalLessons,
}) => {
  if (!currentPageData || !data) return null;

  switch (currentPageData.type) {
    case 'header-intro':
      const hasLegacyIntro = !!data.content?.introduction;
      return (
        <Box>
          <LessonHeader data={data} currentPage={currentPage} totalPages={totalPages} />
          {hasLegacyIntro ? (
            <IntroductionSection introduction={data.content.introduction} />
          ) : (
            currentPageData.section && (
              <TheorySection
                section={currentPageData.section}
                sectionIndex={currentPageData.sectionIndex}
                theory={data.content?.theory}
                moduleId={moduleId}
                lessonId={lessonId}
                lessonData={data}
                currentPageType={currentPageData.type}
              />
            )
          )}
        </Box>
      );
    case 'theory':
      return (
        <TheorySection
          section={currentPageData.section}
          sectionIndex={currentPageData.sectionIndex}
          theory={data.content?.theory}
          moduleId={moduleId}
          lessonId={lessonId}
          lessonData={data}
          currentPageType={currentPageData.type}
        />
      );
    case 'analogies':
      return <AnalogiesSection analogies={data.content?.theory?.analogies} />;
    case 'analogy':
      return <AnalogiesSection singleAnalogy={currentPageData.analogy} />;
    case 'visual-elements':
      return <VisualElementsSection visualElements={data.content?.visualElements} />;
    case 'waveforms':
      return <WaveformsSection data={data} />;
    case 'parameter-tables':
      return <ParameterTablesSection data={data} />;
    case 'practical-case':
      return (
        <PracticalCaseSection
          practicalCase={data.content?.practicalCases?.[currentPageData.caseIndex]}
          caseIndex={currentPageData.caseIndex}
          caseAnswers={caseAnswers}
          showAnswers={showCaseAnswers[currentPageData.case?.caseId || `case-${currentPageData.caseIndex}`]}
          onAnswerChange={handleCaseAnswerChange}
          onToggleAnswers={handleShowCaseAnswers}
        />
      );
    case 'key-points':
      return <KeyPointsSection keyPoints={data.content?.keyPoints} />;
    case 'assessment':
      return (
        <AssessmentSection
          questions={data.content?.assessment?.questions || data.quiz?.questions}
          assessmentAnswers={assessmentAnswers}
          showAssessmentResults={showAssessmentResults}
          assessmentScore={assessmentScore}
          onAnswerChange={handleAssessmentAnswerChange}
          onSubmit={handleSubmitAssessment}
          onReset={() => {
            setShowAssessmentResults(false);
            setAssessmentAnswers({});
          }}
          onCloseResults={() => setShowAssessmentResults(false)}
        />
      );
    case 'references':
      return (
        <ReferencesSection references={data.content?.references || data.resources?.references} />
      );
    case 'completion':
      return (
        <CompletionPage
          data={data}
          totalPages={totalPages}
          onNavigateToLesson={handleNavigateToLesson}
          startTime={Date.now()}
        />
      );
    case 'clinical-case':
      return (
        <Box id="clinical-case-section">
          {moduleCompletion === 100 ? (
            <Suspense fallback={
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Skeleton variant="rectangular" width="100%" height={200} sx={{ mb: 2 }} />
                <Skeleton variant="text" width="60%" sx={{ mx: 'auto' }} />
              </Paper>
            }>
              <ClinicalCaseViewer
                moduleId={moduleId}
                onCompleted={triggerAutoCompletion}
                onBack={() => {
                  const completionPageIndex = calculatePages.findIndex(page => page.type === 'completion');
                  if (completionPageIndex >= 0) {
                    setCurrentPage(completionPageIndex);
                  }
                }}
              />
            </Suspense>
          ) : (
            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                position: 'relative',
              }}
            >
              <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
                <PrerequisiteTooltip missing={[]} side="top">
                  <LockIcon sx={{ fontSize: 40, color: 'text.disabled' }} aria-label="Caso clínico bloqueado" />
                </PrerequisiteTooltip>
              </Box>
              <Box sx={{ mt: 4, mb: 2 }}>
                <LockIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              </Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Caso Clínico Bloqueado
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mt: 2 }}>
                Debes completar {completedLessonsCount}/{totalLessons} lecciones antes de iniciar el caso clínico
              </Typography>
            </Paper>
          )}
        </Box>
      );
    default:
      return null;
  }
};

export default LessonPageRenderer;
