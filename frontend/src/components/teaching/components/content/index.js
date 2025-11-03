/**
 * Content Components Module
 * 
 * Este módulo exporta componentes para renderizar y visualizar contenido
 * educativo en la plataforma VentyLab, incluyendo renderizado de Markdown,
 * visualización de imágenes, reproducción de videos, quizzes interactivos,
 * toma de notas personales, headers de lecciones y componentes especializados
 * para contenido médico.
 */

// Componente principal de renderizado de Markdown
export { default as MarkdownRenderer } from './MarkdownRenderer';

// Componentes de estructura y navegación
export { default as LessonHeader } from './LessonHeader';
export { default as SectionNavigation } from './SectionNavigation';

// Componentes interactivos
export { default as VideoPlayer } from './VideoPlayer';
export { default as InteractiveQuiz } from './InteractiveQuiz';
export { default as PersonalNotes } from './PersonalNotes';

// Componentes de visualización
export { default as MedicalCodeBlock } from './MedicalCodeBlock';
export { default as StyledTable } from './StyledTable';
export { default as ZoomableImage } from './ZoomableImage';

// Exportación por defecto del componente principal
export { default } from './MarkdownRenderer';

