export * from './evaluation.types';

export { activityApi } from './api/activity.api';
export { assignmentApi } from './api/assignment.api';
export { submissionApi } from './api/submission.api';

export { useActivities } from './hooks/useActivities';
export { useMySubmissions } from './hooks/useSubmissions';
export { useActivityBuilder } from './hooks/useActivityBuilder';

export { EvaluationProvider, useEvaluationContext } from './context/EvaluationContext';

// Student components
export { default as ActivityCard } from './components/student/ActivityCard';
export { default as ActivityList } from './components/student/ActivityList';
export { default as SubmissionForm } from './components/student/SubmissionForm';
export { default as SubmissionStatusBadge } from './components/student/SubmissionStatusBadge';
export { default as GradeResult } from './components/student/GradeResult';

// Teacher components
export { default as TeacherEvaluationDashboard } from './components/dashboard/TeacherEvaluationDashboard';
export { default as ActivityBuilder } from './components/builder/ActivityBuilder';
export { default as GroupAssignmentSelector } from './components/builder/GroupAssignmentSelector';
export { default as GradingDashboard } from './components/grading/GradingDashboard';
export { default as SubmissionReviewer } from './components/grading/SubmissionReviewer';

