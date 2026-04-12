import React, { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import ReactPlayer from 'react-player';
import {
  Box,
  Paper,
  IconButton,
  LinearProgress,
  Skeleton,
  Alert,
  Tooltip,
  styled,
  Typography,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Fullscreen as FullscreenIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
} from '@mui/icons-material';

/**
 * VideoContainer - Contenedor principal del video con padding y elevación
 */
const VideoContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: theme.shape.borderRadius,
  boxShadow: 'none',
  overflow: 'hidden',
}));

/**
 * ResponsiveWrapper - Wrapper responsive para mantener aspect ratio 16:9
 */
const ResponsiveWrapper = styled(Box)({
  position: 'relative',
  paddingTop: '56.25%', // 16:9 aspect ratio (9/16 * 100)
  width: '100%',
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
 * ControlsContainer - Contenedor para los controles del video
 */
const ControlsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
  padding: theme.spacing(1),
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: theme.shape.borderRadius,
  border: '1px solid rgba(255, 255, 255, 0.1)',
}));

/**
 * ProgressContainer - Contenedor para la barra de progreso
 */
const ProgressContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

/**
 * TimeDisplay - Muestra el tiempo actual y duración
 */
const TimeDisplay = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: '#e8f4fd',
  fontFamily: 'monospace',
  minWidth: '100px',
  textAlign: 'center',
}));

/**
 * VideoPlayer - Componente para reproducir videos educativos de YouTube y Vimeo
 * con controles personalizados y seguimiento de progreso.
 * 
 * Utiliza react-player para soportar múltiples plataformas de video y proporciona
 * una interfaz consistente con controles personalizados, indicadores de progreso,
 * y callbacks para tracking del progreso de visualización.
 * 
 * @component
 * @example
 * ```jsx
 * <VideoPlayer
 *   url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 *   title="Introducción a la ventilación mecánica"
 *   onProgress={(state) => console.log('Progreso:', state.played)}
 * />
 * ```
 * 
 * @example
 * ```jsx
 * // Con video de Vimeo
 * <VideoPlayer
 *   url="https://vimeo.com/123456789"
 *   title="Configuración del ventilador"
 *   onProgress={(state) => {
 *     // Guardar progreso en el backend
 *     saveProgress(state.playedSeconds);
 *   }}
 * />
 * ```
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} props.url - URL del video (YouTube, Vimeo, etc.)
 * @param {string} props.title - Título del video para accesibilidad
 * @param {Function} [props.onProgress] - Callback llamado con el progreso de reproducción
 */
const VideoPlayer = ({ url, title, onProgress }) => {
  // Referencias
  const playerRef = useRef(null);
  const containerRef = useRef(null);

  // Estados
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Formatea segundos a formato MM:SS
   * @param {number} seconds - Segundos a formatear
   * @returns {string} - Tiempo formateado
   */
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Maneja el toggle de play/pause
   */
  const handlePlayPause = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  /**
   * Maneja el toggle de mute/unmute
   */
  const handleMuteToggle = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

  /**
   * Maneja la entrada a pantalla completa
   */
  const handleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen().catch((err) => {
          console.error('Error al entrar en pantalla completa:', err);
        });
      }
    }
  }, []);

  /**
   * Maneja el progreso de reproducción
   * @param {Object} state - Estado del reproductor con played, playedSeconds, loaded, loadedSeconds
   */
  const handleProgress = useCallback(
    (state) => {
      setPlayed(state.played);
      setLoaded(state.loaded);
      setCurrentTime(state.playedSeconds);

      // Llamar al callback si está definido
      if (onProgress && typeof onProgress === 'function') {
        onProgress(state);
      }
    },
    [onProgress]
  );

  /**
   * Maneja cuando el video está listo
   */
  const handleReady = useCallback(() => {
    setIsReady(true);
    setError(null);
  }, []);

  /**
   * Maneja la duración del video
   * @param {number} duration - Duración en segundos
   */
  const handleDuration = useCallback((duration) => {
    setDuration(duration);
  }, []);

  /**
   * Maneja errores de reproducción
   * @param {Error} error - Error de reproducción
   */
  const handleError = useCallback((error) => {
    console.error('Error al cargar el video:', error);
    setError('No se pudo cargar el video. Verifica la URL o intenta más tarde.');
    setIsReady(true);
  }, []);

  /**
   * Maneja el click en la barra de progreso para buscar
   * @param {Object} event - Evento del click
   */
  const handleSeek = useCallback(
    (event) => {
      if (!playerRef.current) return;
      
      const progressBar = event.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = clickX / rect.width;
      
      playerRef.current.seekTo(percentage);
      setPlayed(percentage);
    },
    []
  );

  /**
   * Maneja eventos de teclado para controles
   * @param {Object} event - Evento del teclado
   */
  const handleKeyPress = useCallback(
    (event) => {
      switch (event.key) {
        case ' ':
        case 'k':
          event.preventDefault();
          handlePlayPause();
          break;
        case 'f':
          event.preventDefault();
          handleFullscreen();
          break;
        case 'm':
          event.preventDefault();
          handleMuteToggle();
          break;
        default:
          break;
      }
    },
    [handlePlayPause, handleFullscreen, handleMuteToggle]
  );

  // Validar URL
  if (!url || typeof url !== 'string') {
    return (
      <VideoContainer elevation={2}>
        <Alert severity="error">
          URL de video no proporcionada o inválida
        </Alert>
      </VideoContainer>
    );
  }

  return (
    <VideoContainer 
      elevation={2} 
      ref={containerRef}
      onKeyDown={handleKeyPress}
      tabIndex={0}
      role="region"
      aria-label={`Reproductor de video: ${title}`}
    >
      {/* Título del video */}
      {title && (
        <Typography 
          variant="h6" 
          component="h3" 
          gutterBottom
          sx={{ 
            mb: 2,
            color: '#ffffff',
            fontWeight: 600
          }}
        >
          {title}
        </Typography>
      )}

      {/* Wrapper responsive para el video */}
      <ResponsiveWrapper>
        {!isReady && !error && (
          <Skeleton
            variant="rectangular"
            width="100%"
            height="100%"
            animation="wave"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              borderRadius: '8px',
            }}
          />
        )}

        {error ? (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 3,
            }}
          >
            <Alert severity="error" sx={{ maxWidth: '80%' }}>
              {error}
            </Alert>
          </Box>
        ) : (
          <PlayerWrapper>
            <ReactPlayer
              ref={playerRef}
              url={url}
              width="100%"
              height="100%"
              playing={playing}
              muted={muted}
              controls={false}
              onReady={handleReady}
              onProgress={handleProgress}
              onDuration={handleDuration}
              onError={handleError}
              config={{
                youtube: {
                  playerVars: {
                    modestbranding: 1,
                    rel: 0,
                  },
                },
                vimeo: {
                  playerOptions: {
                    byline: false,
                    portrait: false,
                  },
                },
              }}
            />
          </PlayerWrapper>
        )}
      </ResponsiveWrapper>

      {/* Controles personalizados */}
      {isReady && !error && (
        <>
          {/* Barra de progreso */}
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="buffer"
              value={played * 100}
              valueBuffer={loaded * 100}
              sx={{
                height: 8,
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': {
                  height: 10,
                },
                transition: 'height 0.2s ease',
              }}
              onClick={handleSeek}
              aria-label="Barra de progreso del video"
            />
          </Box>

          {/* Controles de reproducción */}
          <ControlsContainer>
            {/* Botón Play/Pause */}
            <Tooltip title={playing ? 'Pausar (K)' : 'Reproducir (K)'}>
              <IconButton
                onClick={handlePlayPause}
                color="primary"
                aria-label={playing ? 'Pausar video' : 'Reproducir video'}
                size="large"
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </IconButton>
            </Tooltip>

            {/* Botón Mute/Unmute */}
            <Tooltip title={muted ? 'Activar sonido (M)' : 'Silenciar (M)'}>
              <IconButton
                onClick={handleMuteToggle}
                aria-label={muted ? 'Activar sonido' : 'Silenciar'}
              >
                {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
              </IconButton>
            </Tooltip>

            {/* Display de tiempo */}
            <ProgressContainer>
              <TimeDisplay variant="body2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </TimeDisplay>
            </ProgressContainer>

            {/* Botón Pantalla completa */}
            <Tooltip title="Pantalla completa (F)">
              <IconButton
                onClick={handleFullscreen}
                aria-label="Pantalla completa"
              >
                <FullscreenIcon />
              </IconButton>
            </Tooltip>
          </ControlsContainer>

          {/* Instrucciones de teclado */}
          <Typography
            variant="caption"
            sx={{ 
              mt: 1, 
              display: 'block', 
              textAlign: 'center',
              color: '#e8f4fd'
            }}
          >
            Atajos: Espacio/K = Play/Pausa, F = Pantalla completa, M = Silenciar
          </Typography>
        </>
      )}
    </VideoContainer>
  );
};

VideoPlayer.propTypes = {
  /**
   * URL del video a reproducir. Soporta YouTube, Vimeo y otras plataformas
   * compatibles con react-player.
   * Ejemplos:
   * - YouTube: 'https://www.youtube.com/watch?v=VIDEO_ID'
   * - Vimeo: 'https://vimeo.com/VIDEO_ID'
   */
  url: PropTypes.string.isRequired,

  /**
   * Título del video para accesibilidad y contexto.
   * Se muestra encima del reproductor y se usa en aria-labels.
   */
  title: PropTypes.string,

  /**
   * Callback llamado periódicamente durante la reproducción.
   * Recibe un objeto con:
   * - played: Fracción reproducida (0-1)
   * - playedSeconds: Segundos reproducidos
   * - loaded: Fracción cargada (0-1)
   * - loadedSeconds: Segundos cargados
   * 
   * @param {Object} state - Estado actual de reproducción
   */
  onProgress: PropTypes.func,
};

VideoPlayer.defaultProps = {
  title: '',
  onProgress: null,
};

export default VideoPlayer;

