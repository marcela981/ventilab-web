import React, { Suspense, lazy, useCallback } from 'react';
import { Box, Stack } from '@mui/material';
import { MediaSkeleton, MediaFallback } from './content';

// Lazy load multimedia components
const LazyVideoPlayer = lazy(() => import('../media/VideoPlayer'));
const LazyImageGallery = lazy(() => import('../media/ImageGallery'));
const LazyInteractiveDiagram = lazy(() => import('../media/InteractiveDiagram'));

const MediaBlocksContainer = ({ media }) => {
  const renderMediaBlock = useCallback((block, index) => {
    if (!block || !block.type || !block.data) {
      console.warn(`[MediaBlocksContainer] Bloque multimedia ${index + 1} malformado: Falta type o data`, block);
      return (
        <MediaFallback
          message="Contenido no disponible: estructura de datos inválida"
          blockIndex={index}
          blockType="unknown"
        />
      );
    }

    const { type, data } = block;
    const ariaLabelBase = `Bloque multimedia ${index + 1}`;

    switch (type) {
      case 'video': {
        if (!data.url || typeof data.url !== 'string') {
          console.warn(`[MediaBlocksContainer] Bloque video ${index + 1} inválido: URL no proporcionada o inválida`, data);
          return (
            <MediaFallback
              message="Video: URL no proporcionada o inválida"
              actionUrl={data.url}
              blockIndex={index}
              blockType="video"
            />
          );
        }

        const ariaLabel = data.title ? `Video: ${data.title}` : `${ariaLabelBase} - Video`;

        return (
          <Suspense fallback={<MediaSkeleton variant="video" />}>
            <Box sx={{ my: 2 }} aria-label={ariaLabel}>
              <LazyVideoPlayer
                url={data.url}
                title={data.title}
                provider={data.provider || 'auto'}
                start={data.start}
                poster={data.poster}
                onError={(error, url) => {
                  console.warn(`[MediaBlocksContainer] Error en video ${index + 1}:`, error, { url, blockIndex: index });
                }}
              />
            </Box>
          </Suspense>
        );
      }

      case 'imageGallery': {
        if (!data.images || !Array.isArray(data.images) || data.images.length === 0) {
          console.warn(`[MediaBlocksContainer] Bloque imageGallery ${index + 1} inválido: No hay imágenes o array inválido`, data);
          return (
            <MediaFallback
              message="Galería: No hay imágenes disponibles"
              blockIndex={index}
              blockType="imageGallery"
            />
          );
        }

        const ariaLabel = `${ariaLabelBase} - Galería de imágenes`;

        return (
          <Suspense fallback={<MediaSkeleton variant="imageGallery" />}>
            <Box sx={{ my: 2 }} aria-label={ariaLabel}>
              <LazyImageGallery
                images={data.images}
                columns={data.columns}
                onImageError={(imgIndex, src) => {
                  console.warn(`[MediaBlocksContainer] Error en imagen ${imgIndex + 1} de galería ${index + 1}:`, { src, imageIndex: imgIndex, galleryIndex: index });
                }}
              />
            </Box>
          </Suspense>
        );
      }

      case 'diagram': {
        if (!data.svgSrc && !data.svgString) {
          console.warn(`[MediaBlocksContainer] Bloque diagram ${index + 1} inválido: No se proporcionó svgSrc ni svgString`, data);
          return (
            <MediaFallback
              message="Diagrama: No se proporcionó svgSrc ni svgString"
              actionUrl={data.svgSrc}
              blockIndex={index}
              blockType="diagram"
            />
          );
        }

        const ariaLabel = data.ariaLabel || `${ariaLabelBase} - Diagrama interactivo`;

        return (
          <Suspense fallback={<MediaSkeleton variant="diagram" />}>
            <Box sx={{ my: 2 }} aria-label={ariaLabel}>
              <LazyInteractiveDiagram
                svgSrc={data.svgSrc}
                svgString={data.svgString}
                height={data.height || 500}
                width={data.width || '100%'}
                initialScale={data.initialScale || 1}
                onLoad={() => {
                  console.log(`[MediaBlocksContainer] Diagrama ${index + 1} cargado exitosamente`, { blockIndex: index });
                }}
                onError={(error) => {
                  console.warn(`[MediaBlocksContainer] Error en diagrama ${index + 1}:`, error, { blockIndex: index, svgSrc: data.svgSrc });
                }}
                aria-label={ariaLabel}
              />
            </Box>
          </Suspense>
        );
      }

      default:
        console.warn(`[MediaBlocksContainer] Tipo de bloque multimedia no soportado:`, type, { blockIndex: index, block });
        return (
          <MediaFallback
            message={`Tipo de contenido multimedia no soportado: ${type}`}
            blockIndex={index}
            blockType={type}
          />
        );
    }
  }, []);

  if (!media || !Array.isArray(media) || media.length === 0) {
    return null;
  }

  return (
    <Stack spacing={2} sx={{ my: 3 }}>
      {media.map((block, index) => (
        <Box key={`media-block-${index}`}>
          {renderMediaBlock(block, index)}
        </Box>
      ))}
    </Stack>
  );
};

export default MediaBlocksContainer;
