/**
 * Media Components Module
 * 
 * Este módulo exporta componentes multimedia optimizados para la plataforma
 * VentyLab, incluyendo reproductores de video, visualizadores de imágenes,
 * y otros recursos multimedia con lazy loading, accesibilidad y fallbacks.
 */

// Componente principal de reproductor de video
export { default as VideoPlayer } from './VideoPlayer';

// Componente de galería de imágenes
export { default as ImageGallery } from './ImageGallery';

// Componente de diagrama SVG interactivo
export { default as InteractiveDiagram } from './InteractiveDiagram';

// Shared media utility components (re-exported from content)
export { MediaSkeleton, MediaFallback } from '../content';

// Exportación por defecto
export { default } from './VideoPlayer';

