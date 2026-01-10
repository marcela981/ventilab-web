"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import dynamic from 'next/dynamic';
import {
  Box,
  Card,
  CardContent,
  Alert,
  Button,
  Typography,
  styled,
} from '@mui/material';
import {
  Warning as WarningIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import MediaSkeleton from '../content/MediaSkeleton';
import MediaFallback from '../content/MediaFallback';

// Lazy load ReactPlayer para optimizar el bundle inicial
const ReactPlayer = dynamic(
  () => import('react-player'),
  {
    ssr: false,
    loading: () => null, // No mostrar nada mientras carga, el skeleton ya está visible
  }
);

/**
 * ResponsiveVideoContainer - Contenedor que mantiene aspect ratio 16:9
 */
const ResponsiveVideoContainer = styled(Box)({
  position: 'relative',
  width: '100%',
  paddingTop: '56.25%', // 16:9 aspect ratio
  overflow: 'hidden',
  borderRadius: '8px',
  backgroundColor: '#000',
});

/**
 * PlayerWrapper - Wrapper absoluto para el reproductor
 */
const PlayerWrapper = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
});

/**
 * PosterOverlay - Overlay para mostrar el poster antes de reproducir
 */
const PosterOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  zIndex: 1,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': {
    opacity: 0.9,
  },
  transition: 'opacity 0.3s ease',
}));

/**
 * VideoPlayer - Componente optimizado para reproducir videos de YouTube/Vimeo
 * 
 * Características:
 * - Lazy loading del iframe usando IntersectionObserver
 * - Soporte para YouTube y Vimeo con detección automática
 * - Accesibilidad completa (ARIA labels)
 * - Fallback robusto con opción de abrir en nueva pestaña
 * - Poster image como preview
 * - Inicio en offset personalizado
 * 
 * @component
 * @example
 * ```jsx
 * // YouTube con inicio en 30 segundos
 * <VideoPlayer
 *   url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 *   title="Introducción a la ventilación mecánica"
 *   provider="youtube"
 *   start={30}
 *   poster="/posters/ventilation-intro.jpg"
 * />
 * 
 * // Vimeo con detección automática
 * <VideoPlayer
 *   url="https://vimeo.com/123456789"
 *   title="Configuración del ventilador"
 *   provider="auto"
 * />
 * ```
 * 
 * @example
 * // Pruebas manuales:
 * // YouTube: https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * // Vimeo: https://vimeo.com/148751763
 */
const VideoPlayer = ({
  url,
  title,
  provider = 'auto',
  start,
  poster,
  onError,
  ...props
}) => {
  const [isInViewport, setIsInViewport] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showPoster, setShowPoster] = useState(!!poster);
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  /**
   * IntersectionObserver para detectar cuando el componente entra en viewport
   */
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInViewport(true);
            // Desconectar después de la primera intersección
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Cargar 50px antes de entrar en vista
        threshold: 0.1,
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  /**
   * Maneja el inicio de reproducción (oculta el poster)
   */
  const handlePlay = useCallback(() => {
    setShowPoster(false);
    setIsPlaying(true);
  }, []);

  /**
   * Maneja errores del reproductor
   */
  const handleError = useCallback(
    (error) => {
      console.error('Error en VideoPlayer:', error);
      setHasError(true);
      
      let message = 'No se pudo cargar el video';
      
      // Mensajes de error más específicos según el tipo
      if (error?.message) {
        message = `Error: ${error.message}`;
      } else if (typeof error === 'string') {
        message = error;
      }

      setErrorMessage(message);

      // Llamar callback de error si existe
      if (onError && typeof onError === 'function') {
        onError(error, url);
      }
    },
    [url, onError]
  );

  /**
   * Maneja cuando el video está listo
   */
  const handleReady = useCallback(() => {
    // Si hay start, mover a ese offset
    if (start && playerRef.current && typeof start === 'number' && start > 0) {
      playerRef.current.seekTo(start, 'seconds');
    }
  }, [start]);

  /**
   * Maneja click en el poster para iniciar reproducción
   */
  const handlePosterClick = useCallback(() => {
    setShowPoster(false);
    setIsPlaying(true);
  }, []);

  /**
   * Determina la configuración del proveedor
   */
  const getPlayerConfig = useCallback(() => {
    const config = {
      youtube: {
        playerVars: {
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          controls: 1,
          ...(start && { start }),
        },
      },
      vimeo: {
        playerOptions: {
          byline: false,
          portrait: false,
          title: false,
          ...(start && { start }),
        },
      },
    };

    // Si provider es 'auto', react-player detectará automáticamente
    if (provider === 'auto') {
      return {
        youtube: config.youtube,
        vimeo: config.vimeo,
      };
    }

    return {
      [provider]: config[provider],
    };
  }, [provider, start]);

  // Validar URL
  if (!url || typeof url !== 'string') {
    return (
      <MediaFallback
        variant="video"
        message="URL de video no proporcionada o inválida"
      />
    );
  }

  // Mostrar fallback si hay error
  if (hasError) {
    return (
      <Card {...props}>
        <CardContent>
          <MediaFallback
            variant="video"
            message={errorMessage || 'No se pudo cargar el video'}
            externalUrl={url}
            buttonText="Abrir en nueva pestaña"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card {...props} ref={containerRef}>
      <CardContent sx={{ p: 0 }}>
        {/* Título del video */}
        {title && (
          <Box sx={{ p: 2, pb: 1 }}>
            <Typography
              variant="h6"
              component="h3"
              sx={{
                fontWeight: 600,
                mb: 0,
              }}
            >
              {title}
            </Typography>
          </Box>
        )}

        {/* Contenedor del video */}
        <Box sx={{ px: 2, pb: 2 }}>
          <ResponsiveVideoContainer
            role="region"
            aria-label={title ? `Reproductor de video: ${title}` : 'Reproductor de video'}
          >
            {/* Poster overlay */}
            {showPoster && poster && (
              <PosterOverlay
                onClick={handlePosterClick}
                sx={{
                  backgroundImage: `url(${poster})`,
                }}
                aria-label="Imagen de previsualización del video. Click para reproducir"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePosterClick();
                  }
                }}
              />
            )}

            {/* Skeleton mientras no está en viewport */}
            {!isInViewport && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                }}
              >
                <MediaSkeleton variant="video" />
              </Box>
            )}

            {/* Reproductor (solo se monta cuando está en viewport) */}
            {isInViewport && (
              <PlayerWrapper>
                <ReactPlayer
                  ref={playerRef}
                  url={url}
                  width="100%"
                  height="100%"
                  playing={isPlaying && !showPoster}
                  controls={true}
                  onReady={handleReady}
                  onError={handleError}
                  onPlay={handlePlay}
                  config={getPlayerConfig()}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                  // ReactPlayer maneja lazy loading internamente cuando playing={false}
                  // El iframe no se carga hasta que el usuario interactúa
                  // El poster se maneja con overlay personalizado, no con prop 'light'
                />
              </PlayerWrapper>
            )}
          </ResponsiveVideoContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

VideoPlayer.propTypes = {
  /**
   * URL del video a reproducir.
   * Soporta YouTube, Vimeo y otras plataformas compatibles con react-player.
   * 
   * Ejemplos:
   * - YouTube: 'https://www.youtube.com/watch?v=VIDEO_ID'
   * - Vimeo: 'https://vimeo.com/VIDEO_ID'
   * 
   * @required
   */
  url: PropTypes.string.isRequired,

  /**
   * Título del video para accesibilidad y contexto.
   * Se muestra encima del reproductor y se usa en aria-labels.
   */
  title: PropTypes.string,

  /**
   * Proveedor del video. Si es 'auto', react-player detectará automáticamente.
   * 
   * @default 'auto'
   */
  provider: PropTypes.oneOf(['youtube', 'vimeo', 'auto']),

  /**
   * Tiempo de inicio en segundos.
   * El video comenzará a reproducirse desde este offset.
   */
  start: PropTypes.number,

  /**
   * URL de la imagen de previsualización (poster).
   * Se muestra antes de que el usuario inicie la reproducción.
   */
  poster: PropTypes.string,

  /**
   * Callback llamado cuando ocurre un error al cargar o reproducir el video.
   * 
   * @param {Error|string} error - Objeto de error o mensaje de error
   * @param {string} url - URL del video que falló
   */
  onError: PropTypes.func,
};

VideoPlayer.defaultProps = {
  title: null,
  provider: 'auto',
  start: null,
  poster: null,
  onError: null,
};

export default VideoPlayer;

