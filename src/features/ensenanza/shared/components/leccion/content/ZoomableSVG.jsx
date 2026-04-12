import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import dynamic from 'next/dynamic';
import DOMPurify from 'dompurify';
import {
  Box,
  Paper,
  IconButton,
  Tooltip,
  Typography,
  styled,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FitScreen as FitScreenIcon,
  RotateLeft as RotateLeftIcon,
} from '@mui/icons-material';
import MediaSkeleton from './MediaSkeleton';
import MediaFallback from './MediaFallback';

// Lazy load react-svg-pan-zoom para mejor rendimiento
const ReactSVGPanZoom = dynamic(
  () => import('react-svg-pan-zoom').then((mod) => mod.UncontrolledReactSVGPanZoom),
  {
    ssr: false,
    loading: () => <MediaSkeleton variant="svg" />,
  }
);

/**
 * SVGContainer - Contenedor estilizado para el SVG
 */
const SVGContainer = styled(Paper)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  minHeight: '400px',
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
 * ZoomableSVG - Componente para visualizar SVG con funcionalidad de pan y zoom
 * 
 * Permite a los usuarios explorar diagramas SVG complejos mediante controles
 * de zoom, pan y rotación. Incluye sanitización de HTML para prevenir XSS.
 * 
 * @component
 * @example
 * ```jsx
 * // Con URL de SVG
 * <ZoomableSVG
 *   src="/diagrams/ventilator-circuit.svg"
 *   alt="Diagrama del circuito del ventilador"
 *   caption="Figura 2: Componentes del circuito respiratorio"
 * />
 * 
 * // Con SVG inline
 * <ZoomableSVG
 *   svgContent="<svg>...</svg>"
 *   alt="Diagrama interactivo"
 * />
 * ```
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} [props.src] - URL del archivo SVG
 * @param {string} [props.svgContent] - Contenido SVG como string (inline)
 * @param {string} props.alt - Texto alternativo para accesibilidad
 * @param {string} [props.caption] - Leyenda descriptiva del SVG
 * @param {number} [props.defaultZoom=1] - Nivel de zoom inicial
 * @param {Function} [props.onError] - Callback para manejar errores
 */
const ZoomableSVG = ({
  src,
  svgContent,
  alt,
  caption,
  defaultZoom = 1,
  onError,
  ...props
}) => {
  const [svgString, setSvgString] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const viewerRef = useRef(null);

  /**
   * Sanitiza el contenido SVG para prevenir XSS
   */
  const sanitizeSVG = useCallback((content) => {
    if (!content) return null;
    
    try {
      // DOMPurify sanitiza el SVG manteniendo la estructura
      const sanitized = DOMPurify.sanitize(content, {
        USE_PROFILES: { svg: true, svgFilters: true },
        ADD_TAGS: ['svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'text', 'defs', 'use'],
        ADD_ATTR: ['viewBox', 'xmlns', 'xlink:href', 'transform', 'd', 'fill', 'stroke', 'stroke-width'],
      });
      return sanitized;
    } catch (err) {
      console.error('Error al sanitizar SVG:', err);
      return null;
    }
  }, []);

  /**
   * Carga el SVG desde una URL
   */
  useEffect(() => {
    if (!src && !svgContent) {
      setError('No se proporcionó src ni svgContent');
      setIsLoading(false);
      return;
    }

    // Si hay contenido inline, usarlo directamente
    if (svgContent) {
      const sanitized = sanitizeSVG(svgContent);
      if (sanitized) {
        setSvgString(sanitized);
        setIsLoading(false);
      } else {
        setError('Error al procesar el contenido SVG');
        setIsLoading(false);
      }
      return;
    }

    // Cargar desde URL
    if (src) {
      setIsLoading(true);
      setError(null);

      fetch(src)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.text();
        })
        .then((text) => {
          const sanitized = sanitizeSVG(text);
          if (sanitized) {
            setSvgString(sanitized);
            setIsLoading(false);
          } else {
            throw new Error('Error al sanitizar el SVG');
          }
        })
        .catch((err) => {
          console.error('Error al cargar SVG:', err);
          setError(`No se pudo cargar el SVG: ${err.message}`);
          setIsLoading(false);
          if (onError) {
            onError(err);
          }
        });
    }
  }, [src, svgContent, sanitizeSVG, onError]);

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
  if (isLoading) {
    return <MediaSkeleton variant="svg" />;
  }

  // Mostrar fallback si hay error
  if (error || !svgString) {
    return (
      <MediaFallback
        variant="svg"
        message={error || 'El SVG no está disponible'}
        externalUrl={src}
      />
    );
  }

  return (
    <Box {...props}>
      <SVGContainer>
        <ReactSVGPanZoom
          ref={viewerRef}
          width={800}
          height={600}
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
          <svg
            width="800"
            height="600"
            viewBox="0 0 800 600"
            xmlns="http://www.w3.org/2000/svg"
            dangerouslySetInnerHTML={{ __html: svgString }}
            role="img"
            aria-label={alt}
          />
        </ReactSVGPanZoom>

        <ControlsContainer>
          <Tooltip title="Acercar (Zoom In)">
            <ControlButton
              onClick={handleZoomIn}
              aria-label="Acercar"
              size="small"
            >
              <ZoomInIcon />
            </ControlButton>
          </Tooltip>
          
          <Tooltip title="Alejar (Zoom Out)">
            <ControlButton
              onClick={handleZoomOut}
              aria-label="Alejar"
              size="small"
            >
              <ZoomOutIcon />
            </ControlButton>
          </Tooltip>
          
          <Tooltip title="Ajustar a la vista">
            <ControlButton
              onClick={handleFitToViewer}
              aria-label="Ajustar a la vista"
              size="small"
            >
              <FitScreenIcon />
            </ControlButton>
          </Tooltip>
          
          <Tooltip title="Resetear vista">
            <ControlButton
              onClick={handleReset}
              aria-label="Resetear vista"
              size="small"
            >
              <RotateLeftIcon />
            </ControlButton>
          </Tooltip>
        </ControlsContainer>
      </SVGContainer>

      {caption && (
        <Typography
          variant="caption"
          sx={{
            mt: 1,
            display: 'block',
            textAlign: 'center',
            color: 'text.secondary',
            fontStyle: 'italic',
          }}
          aria-label={`Descripción de SVG: ${caption}`}
        >
          {caption}
        </Typography>
      )}
    </Box>
  );
};

ZoomableSVG.propTypes = {
  /**
   * URL del archivo SVG a cargar.
   * Se prioriza sobre svgContent si ambos están presentes.
   */
  src: PropTypes.string,
  
  /**
   * Contenido SVG como string (inline).
   * Útil para SVG generados dinámicamente.
   */
  svgContent: PropTypes.string,
  
  /**
   * Texto alternativo para accesibilidad.
   * Describe el contenido del SVG para lectores de pantalla.
   */
  alt: PropTypes.string.isRequired,
  
  /**
   * Leyenda descriptiva que se muestra debajo del SVG.
   */
  caption: PropTypes.string,
  
  /**
   * Nivel de zoom inicial (1 = 100%).
   */
  defaultZoom: PropTypes.number,
  
  /**
   * Callback llamado cuando ocurre un error al cargar el SVG.
   * 
   * @param {Error} error - Objeto de error
   */
  onError: PropTypes.func,
};

ZoomableSVG.defaultProps = {
  src: null,
  svgContent: null,
  caption: null,
  defaultZoom: 1,
  onError: null,
};

export default ZoomableSVG;

