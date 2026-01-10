/**
 * HOC (Higher Order Components) Index
 * Central export point for all HOCs
 */

export {
  default as withAuth,
  withStudentAuth,
  withTeacherAuth,
  withAdminAuth,
  withAnyAuth,
} from './withAuth';

// Future HOCs can be added here
// export { default as withPermission } from './withPermission';
// export { default as withLoading } from './withLoading';
// export { default as withErrorBoundary } from './withErrorBoundary';
