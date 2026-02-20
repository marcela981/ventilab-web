/**
 * @deprecated This file is deprecated and will be removed.
 * 
 * This is the OLD LessonViewer implementation. The canonical LessonViewer is now at:
 * src/components/teaching/components/LessonViewer.jsx
 * 
 * The route page now uses LessonViewerRouteAdapter which bridges to the canonical component.
 * 
 * DO NOT USE THIS FILE. Import from:
 * - For route pages: @/features/teaching/pages/LessonViewerRouteAdapter
 * - For direct use: @/features/teaching/components/LessonViewer
 * 
 * This file is kept temporarily for reference but will be removed after migration is complete.
 */

// Re-export the canonical LessonViewer for backward compatibility
// This shim will be removed once all imports are updated
export { default } from './components/LessonViewer';
