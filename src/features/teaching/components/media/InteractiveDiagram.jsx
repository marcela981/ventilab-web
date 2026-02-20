import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import dynamic from 'next/dynamic';
import DOMPurify from 'dompurify';
import {
  Box,
  Paper,
  IconButton,
  Tooltip as MUITooltip,
  Typography,
  styled,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FitScreen as FitScreenIcon,
  RotateLeft as RotateLeftIcon,
  ErrorOutline as ErrorIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import MediaSkeleton from '../content/MediaSkeleton';
import MediaFallback from '../content/MediaFallback';

// Lazy load react-svg-pan-zoom para mejor rendimiento
const ReactSVGPanZoom = dynamic(
  () => import('react-svg-pan-zoom').then((mod) => mod.UncontrolledReactSVGPanZoom),
  {
    ssr: false,
    loading: () => <MediaSkeleton variant="svg" />,
  }
);

/**
 * DiagramContainer - Contenedor estilizado para el diagrama SVG
 */
const DiagramContainer = styled(Paper)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
}));

/**
 * ControlsContainer - Contenedor para los controles de zoom/pan
 */
const ControlsContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  zIndex: 10,
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(0.5),
  boxShadow: theme.shadows[2],
}));

/**
 * ControlButton - Botón estilizado para controles
 */
const ControlButton = styled(IconButton)(({ theme }) => ({
  padding: theme.spacing(1),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

/**
 * ErrorContainer - Contenedor para estado de error
 */
const ErrorContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  minHeight: '300px',
  textAlign: 'center',
  color: theme.palette.text.secondary,
  
  '& .MuiSvgIcon-root': {
    fontSize: '3rem',
    marginBottom: theme.spacing(2),
    color: theme.palette.error.main,
  },
}));

/**
 * InteractiveDiagram - Componente para visualizar diagramas SVG interactivos
 * 
 * Características:
 * - Pan y zoom con controles visibles
 * - Sanitización de SVG con DOMPurify (prevención XSS)
 * - Tooltips para nodos SVG con data-tip o <title>
 * - Lazy loading con IntersectionObserver
 * - Accesibilidad completa
 * - Fallback robusto
 * 
 * @component
 * @example
 * ```jsx
 * // Con URL de SVG
 * <InteractiveDiagram
 *   svgSrc="/diagrams/pressure-volume-curve.svg"
 *   height={600}
 *   width={800}
 *   initialScale={1.2}
 *   aria-label="Diagrama interactivo de curva presión-volumen"
 * />
 * ```
 * 
 * @example
 * // Con SVG inline
 * <InteractiveDiagram
 *   svgString="<svg>...</svg>"
 *   height={500}
 *   aria-label="Diagrama del sistema respiratorio"
 * />
 * ```
 * 
 * @example
 * // Ejemplo de uso: Curva presión-volumen
 * // El SVG puede tener nodos con data-tip="Presión inspiratoria máxima"
 * // o <title>Presión inspiratoria máxima</title> para mostrar tooltips
 * <InteractiveDiagram
 *   svgSrc="/diagrams/pv-curve.svg"
 *   height={600}
 *   initialScale={1}
 *   onLoad={() => console.log('Diagrama cargado')}
 *   onError={(error) => console.error('Error:', error)}
 *   aria-label="Curva presión-volumen interactiva"
 * />
 */
const InteractiveDiagram = ({
  svgSrc,
  svgString,
  height = 500,
  width = '100%',
  initialScale = 1,
  onLoad,
  onError,
  'aria-label': ariaLabel = 'Diagrama interactivo',
  ...props
}) => {
  const [sanitizedSvg, setSanitizedSvg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInViewport, setIsInViewport] = useState(false);
  const [tooltipState, setTooltipState] = useState({ text: '', open: false, x: 0, y: 0 });
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const viewerRef = useRef(null);

  /**
   * IntersectionObserver para detectar cuando el componente entra en viewport
   * Esto pospone el innerHTML hasta que el componente sea visible
   */
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInViewport(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  /**
   * Sanitiza el contenido SVG para prevenir XSS
   */
  const sanitizeSVG = useCallback((content) => {
    if (!content) return null;
    
    try {
      // DOMPurify sanitiza el SVG manteniendo la estructura
      const sanitized = DOMPurify.sanitize(content, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: [
          'svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
          'text', 'defs', 'use', 'title', 'desc', 'clipPath', 'mask',
        ],
        ADD_ATTR: [
          'viewBox', 'xmlns', 'xlink:href', 'transform', 'd', 'fill', 'stroke',
          'stroke-width', 'data-tip', 'class', 'id',
        ],
      });
      return sanitized;
    } catch (err) {
      console.error('Error al sanitizar SVG:', err);
      return null;
    }
  }, []);

  /**
   * Carga el SVG desde una URL o usa el string proporcionado
   */
  useEffect(() => {
    // Si no hay svgSrc ni svgString, no hacer nada
    if (!svgSrc && !svgString) {
      setError('No se proporcionó svgSrc ni svgString');
      setIsLoading(false);
      return;
    }

    // Priorizar svgString sobre svgSrc
    if (svgString) {
      setIsLoading(true);
      setError(null);
      
      const sanitized = sanitizeSVG(svgString);
      if (sanitized) {
        setSanitizedSvg(sanitized);
        setIsLoading(false);
        if (onLoad) onLoad();
      } else {
        const err = new Error('Error al sanitizar el SVG');
        setError('No se pudo procesar el contenido SVG');
        setIsLoading(false);
        if (onError) onError(err);
      }
      return;
    }

    // Cargar desde URL solo cuando esté en viewport
    if (svgSrc && isInViewport) {
      setIsLoading(true);
      setError(null);

      fetch(svgSrc)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
        })
        .then((text) => {
          const sanitized = sanitizeSVG(text);
          if (sanitized) {
            setSanitizedSvg(sanitized);
            setIsLoading(false);
            if (onLoad) onLoad();
          } else {
            throw new Error('Error al sanitizar el SVG');
          }
        })
        .catch((err) => {
          console.error('Error al cargar SVG:', err);
          setError(`No se pudo cargar el diagrama: ${err.message}`);
          setIsLoading(false);
          if (onError) onError(err);
        });
    }
  }, [svgSrc, svgString, isInViewport, sanitizeSVG, onLoad, onError]);

  /**
   * Configura tooltips para nodos SVG con data-tip o <title>
   */
  useEffect(() => {
    if (!svgRef.current || !sanitizedSvg || !isInViewport) return;

    const svgElement = svgRef.current.querySelector('svg');
    if (!svgElement) return;

    const handleMouseMove = (event) => {
      const target = event.target;
      
      // Buscar data-tip o <title>
      let tipText = target.getAttribute('data-tip');
      
      if (!tipText) {
        const titleElement = target.querySelector('title');
        if (titleElement) {
          tipText = titleElement.textContent;
        } else if (target.closest('[data-tip]')) {
          tipText = target.closest('[data-tip]').getAttribute('data-tip');
        } else {
          const parentWithTitle = target.closest('[title]');
          if (parentWithTitle) {
            const parentTitle = parentWithTitle.querySelector('title');
            if (parentTitle) {
              tipText = parentTitle.textContent;
            }
          }
        }
      }

      if (tipText) {
        setTooltipState({
          text: tipText,
          open: true,
          x: event.clientX,
          y: event.clientY,
        });
      } else {
        setTooltipState((prev) => ({ ...prev, open: false }));
      }
    };

    const handleMouseLeave = () => {
      setTooltipState((prev) => ({ ...prev, open: false }));
    };

    // Agregar listeners al SVG completo
    svgElement.addEventListener('mousemove', handleMouseMove);
    svgElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      svgElement.removeEventListener('mousemove', handleMouseMove);
      svgElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [sanitizedSvg, isInViewport]);

  /**
   * Maneja el zoom in
   */
  const handleZoomIn = useCallback(() => {
    if (viewerRef.current) {
      viewerRef.current.zoomOnViewerCenter(1.5);
    }
  }, []);

  /**
   * Maneja el zoom out
   */
  const handleZoomOut = useCallback(() => {
    if (viewerRef.current) {
      viewerRef.current.zoomOnViewerCenter(0.75);
    }
  }, []);

  /**
   * Ajusta el SVG para que quepa en la vista
   */
  const handleFitToViewer = useCallback(() => {
    if (viewerRef.current) {
      viewerRef.current.fitToViewer();
    }
  }, []);

  /**
   * Resetea la vista
   */
  const handleReset = useCallback(() => {
    if (viewerRef.current) {
      viewerRef.current.reset();
    }
  }, []);

  // Mostrar skeleton mientras carga
  if (isLoading || (!isInViewport && svgSrc)) {
    return (
      <DiagramContainer ref={containerRef} {...props}>
        <Box sx={{ height, width }}>
          <MediaSkeleton variant="svg" />
        </Box>
      </DiagramContainer>
    );
  }

  // Mostrar fallback si hay error
  if (error || !sanitizedSvg) {
    return (
      <DiagramContainer ref={containerRef} {...props}>
        <ErrorContainer>
          <ErrorIcon />
          <Typography variant="body1" gutterBottom>
            No se pudo cargar el diagrama
          </Typography>
          {error && (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          {svgSrc && (
            <MUITooltip title="Abrir en nueva pestaña">
              <IconButton
                onClick={() => window.open(svgSrc, '_blank', 'noopener,noreferrer')}
                color="primary"
                aria-label="Abrir diagrama en nueva pestaña"
              >
                <OpenInNewIcon />
              </IconButton>
            </MUITooltip>
          )}
        </ErrorContainer>
      </DiagramContainer>
    );
  }

  return (
    <DiagramContainer ref={containerRef} {...props}>
      <Box
        sx={{
          height,
          width,
          position: 'relative',
        }}
        role="img"
        aria-label={ariaLabel}
      >
        {isInViewport && (
          <>
            <ReactSVGPanZoom
              ref={viewerRef}
              width={typeof width === 'number' ? width : 800}
              height={typeof height === 'number' ? height : 500}
              tool="pan"
              SVGBackground="transparent"
              background="#ffffff"
              detectAutoPan={false}
              miniatureProps={{
                position: 'none',
              }}
              toolbarProps={{
                position: 'none',
              }}
            >
              <Box
                ref={svgRef}
                dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
                sx={{
                  width: '100%',
                  height: '100%',
                  '& svg': {
                    width: '100%',
                    height: '100%',
                  },
                }}
              />
            </ReactSVGPanZoom>

            <ControlsContainer>
              <MUITooltip title="Acercar (Zoom In)">
                <ControlButton
                  onClick={handleZoomIn}
                  aria-label="Acercar"
                  size="small"
                >
                  <ZoomInIcon />
                </ControlButton>
              </MUITooltip>
              
              <MUITooltip title="Alejar (Zoom Out)">
                <ControlButton
                  onClick={handleZoomOut}
                  aria-label="Alejar"
                  size="small"
                >
                  <ZoomOutIcon />
                </ControlButton>
              </MUITooltip>
              
              <MUITooltip title="Ajustar a la vista">
                <ControlButton
                  onClick={handleFitToViewer}
                  aria-label="Ajustar a la vista"
                  size="small"
                >
                  <FitScreenIcon />
                </ControlButton>
              </MUITooltip>
              
              <MUITooltip title="Resetear vista">
                <ControlButton
                  onClick={handleReset}
                  aria-label="Resetear vista"
                  size="small"
                >
                  <RotateLeftIcon />
                </ControlButton>
              </MUITooltip>
            </ControlsContainer>

            {/* Tooltip para nodos SVG */}
            {tooltipState.open && tooltipState.text && (
              <MUITooltip
                open={tooltipState.open}
                title={tooltipState.text}
                placement="top"
                arrow
                PopperProps={{
                  anchorEl: {
                    getBoundingClientRect: () => ({
                      top: tooltipState.y,
                      left: tooltipState.x,
                      bottom: tooltipState.y,
                      right: tooltipState.x,
                      width: 0,
                      height: 0,
                    }),
                  },
                }}
              >
                <Box
                  sx={{
                    position: 'fixed',
                    pointerEvents: 'none',
                    top: tooltipState.y,
                    left: tooltipState.x,
                    width: 1,
                    height: 1,
                  }}
                />
              </MUITooltip>
            )}
          </>
        )}
      </Box>
    </DiagramContainer>
  );
};

InteractiveDiagram.propTypes = {
  /**
   * URL del archivo SVG a cargar.
   * Se prioriza svgString si ambos están presentes.
   */
  svgSrc: PropTypes.string,
  
  /**
   * Contenido SVG como string (inline).
   * Tiene prioridad sobre svgSrc si ambos están presentes.
   */
  svgString: PropTypes.string,
  
  /**
   * Altura del diagrama.
   * Puede ser un número (px) o string CSS válido.
   * 
   * @default 500
   */
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  
  /**
   * Ancho del diagrama.
   * Puede ser un número (px) o string CSS válido.
   * 
   * @default '100%'
   */
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  
  /**
   * Escala inicial del zoom.
   * 
   * @default 1
   */
  initialScale: PropTypes.number,
  
  /**
   * Callback llamado cuando el diagrama se carga exitosamente.
   */
  onLoad: PropTypes.func,
  
  /**
   * Callback llamado cuando ocurre un error al cargar o procesar el diagrama.
   * 
   * @param {Error} error - Objeto de error
   */
  onError: PropTypes.func,
  
  /**
   * Label de accesibilidad para el diagrama.
   * Describe el contenido del diagrama para lectores de pantalla.
   * 
   * @default 'Diagrama interactivo'
   */
  'aria-label': PropTypes.string,
};

InteractiveDiagram.defaultProps = {
  svgSrc: null,
  svgString: null,
  height: 500,
  width: '100%',
  initialScale: 1,
  onLoad: null,
  onError: null,
  'aria-label': 'Diagrama interactivo',
};

export default InteractiveDiagram;

