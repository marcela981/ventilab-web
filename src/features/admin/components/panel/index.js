/**
 * =============================================================================
 * Panel Components - Public Exports
 * =============================================================================
 * Central export file for all admin panel components.
 * Import from '@/features/admin/components/panel' for cleaner imports.
 * =============================================================================
 */

// Layout Components
export { default as PanelLayout } from './PanelLayout';
export { DRAWER_WIDTH_OPEN, DRAWER_WIDTH_CLOSED } from './PanelLayout';
export { default as PanelSidebar } from './PanelSidebar';

// Panel Pages
export { default as PanelDashboard } from './pages/PanelDashboard';
export { default as PanelStudents } from './pages/PanelStudents';
export { default as PanelStudentDetail } from './pages/PanelStudentDetail';
export { default as PanelSettings } from './pages/PanelSettings';
export { default as PanelAdmin } from './pages/PanelAdmin';
