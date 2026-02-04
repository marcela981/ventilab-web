/**
 * =============================================================================
 * Panel Components - Public Exports
 * =============================================================================
 * Central export file for all admin panel components.
 * Import from '@/components/panel' for cleaner imports.
 * =============================================================================
 */

// Layout Components
export { default as PanelLayout } from './PanelLayout';
export { DRAWER_WIDTH_OPEN, DRAWER_WIDTH_CLOSED } from './PanelLayout';
export { default as PanelSidebar } from './PanelSidebar';

// Route Protection
export { default as ProtectedPanelRoute } from './ProtectedPanelRoute';

// Panel Pages
export { default as PanelDashboard } from './pages/PanelDashboard';
export { default as PanelTeaching } from './pages/PanelTeaching';
export { default as PanelStudents } from './pages/PanelStudents';
export { default as PanelStudentDetail } from './pages/PanelStudentDetail';
export { default as PanelStatistics } from './pages/PanelStatistics';
export { default as PanelSettings } from './pages/PanelSettings';
