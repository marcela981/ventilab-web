import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Image from 'next/image';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import {
  Box,
  Typography,
  Skeleton,
  styled,
} from '@mui/material';
import {
  BrokenImage as BrokenImageIcon,
} from '@mui/icons-material';

/**
 * ImageWrapper - Contenedor principal para la imagen
 */
const ImageWrapper = styled(Box)(({ theme, maxwidth }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  maxWidth: maxwidth || '100%',
  margin: `${theme.spacing(3)} auto`,
  padding: theme.spacing(1),
}));

/**
 * ImageContainer - Contenedor para la imagen con estilos de borde y sombra
 */
const ImageContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  boxShadow: theme.shadows[3],
  backgroundColor: theme.palette.background.paper,
  transition: 'box-shadow 0.3s ease, transform 0.3s ease',
  cursor: 'zoom-in',
  
  '&:hover': {
    boxShadow: theme.shadows[6],
    transform: 'translateY(-2px)',
  },

  '& img': {
    display: 'block',
    width: '100%',
    height: 'auto',
    objectFit: 'contain',
  },

  // Estilos para react-medium-image-zoom
  '& [data-rmiz-wrap="visible"]': {
    cursor: 'zoom-in',
  },

  '& [data-rmiz-wrap="hidden"]': {
    display: 'none',
  },
}));

/**
 * CaptionText - Texto de leyenda estilizado
 */
const CaptionText = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(1.5),
  fontSize: '0.875rem',
  color: theme.palette.text.secondary,
  fontStyle: 'italic',
  textAlign: 'center',
  lineHeight: 1.6,
  maxWidth: '100%',
  padding: `0 ${theme.spacing(2)}`,
}));

/**
 * ErrorPlaceholder - Placeholder para cuando la imagen no carga
 */
const ErrorPlaceholder = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '200px',
  backgroundColor: theme.palette.grey[100],
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  color: theme.palette.text.secondary,
  
  '& .MuiSvgIcon-root': {
    fontSize: '4rem',
    marginBottom: theme.spacing(2),
    color: theme.palette.grey[400],
  },
}));

/**
 * ZoomableImage - Componente de imagen optimizado que permite zoom interactivo
 * para mejorar la visualización de diagramas médicos y gráficos complejos.
 * 
 * Utiliza Next.js Image para optimización automática y react-medium-image-zoom
 * para la funcionalidad de zoom suave y profesional. Incluye estados de carga,
 * manejo de errores y accesibilidad completa.
 * 
 * @component
 * @example
 * ```jsx
 * <ZoomableImage
 *   src="/images/ventilator-diagram.png"
 *   alt="Diagrama del ventilador mecánico"
 *   caption="Figura 1: Componentes principales del sistema de ventilación"
 *   maxWidth="800px"
 * />
 * ```
 * 
 * @example
 * ```jsx
 * // Con imagen externa
 * <ZoomableImage
 *   src="https://example.com/medical-chart.jpg"
 *   alt="Gráfico de presión-volumen"
 *   caption="Curva característica en pacientes con SDRA"
 * />
 * ```
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} props.src - URL de la imagen (puede ser local o externa)
 * @param {string} props.alt - Texto alternativo para accesibilidad (requerido)
 * @param {string} [props.caption] - Texto descriptivo mostrado debajo de la imagen
 * @param {string} [props.maxWidth='800px'] - Ancho máximo de la imagen en vista normal
 * @param {string} [props.className] - Clase CSS adicional
 */
const ZoomableImage = ({ 
  src, 
  alt, 
  caption, 
  maxWidth = '800px',
  className,
  ...props 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  /**
   * Maneja el evento de carga exitosa de la imagen
   * @param {Object} event - Evento de carga de la imagen
   */
  const handleImageLoad = (event) => {
    setIsLoading(false);
    setHasError(false);
    
    // Obtener dimensiones reales de la imagen
    if (event.target) {
      setImageDimensions({
        width: event.target.naturalWidth,
        height: event.target.naturalHeight,
      });
    }
  };

  /**
   * Maneja el evento de error al cargar la imagen
   * @param {Object} error - Objeto de error
   */
  const handleImageError = (error) => {
    console.error('Error al cargar la imagen:', error);
    setIsLoading(false);
    setHasError(true);
  };

  /**
   * Determina si la URL es externa
   * @returns {boolean} - True si es URL externa
   */
  const isExternalUrl = src?.startsWith('http://') || src?.startsWith('https://');

  // Renderizar placeholder de error
  if (hasError) {
    return (
      <ImageWrapper maxwidth={maxWidth} className={className}>
        <ErrorPlaceholder>
          <BrokenImageIcon />
          <Typography variant="body2" color="text.secondary" align="center">
            No se pudo cargar la imagen
          </Typography>
          <Typography variant="caption" color="text.disabled" align="center" sx={{ mt: 1 }}>
            {src}
          </Typography>
        </ErrorPlaceholder>
        {caption && (
          <CaptionText variant="caption">
            {caption}
          </CaptionText>
        )}
      </ImageWrapper>
    );
  }

  return (
    <ImageWrapper maxwidth={maxWidth} className={className}>
      <ImageContainer>
        {isLoading && (
          <Skeleton
            variant="rectangular"
            width="100%"
            height={300}
            animation="wave"
            sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              borderRadius: 1,
            }}
          />
        )}
        
        <Zoom
          zoomMargin={40}
          overlayBgColorEnd="rgba(0, 0, 0, 0.95)"
          transitionDuration={300}
        >
          {isExternalUrl ? (
            // Para imágenes externas, usar img estándar
            <img
              src={src}
              alt={alt}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{
                display: isLoading ? 'none' : 'block',
                width: '100%',
                height: 'auto',
              }}
              loading="lazy"
              aria-label={alt}
              role="img"
              {...props}
            />
          ) : (
            // Para imágenes locales, usar Next.js Image
            <Image
              src={src}
              alt={alt}
              width={imageDimensions.width || 800}
              height={imageDimensions.height || 600}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{
                display: isLoading ? 'none' : 'block',
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
              }}
              quality={90}
              priority={false}
              loading="lazy"
              aria-label={alt}
              role="img"
              {...props}
            />
          )}
        </Zoom>
      </ImageContainer>

      {caption && (
        <CaptionText variant="caption" aria-label={`Descripción de imagen: ${caption}`}>
          {caption}
        </CaptionText>
      )}
    </ImageWrapper>
  );
};

ZoomableImage.propTypes = {
  /**
   * URL de la imagen. Puede ser una ruta local (ej: '/images/diagram.png')
   * o una URL externa (ej: 'https://example.com/image.jpg')
   */
  src: PropTypes.string.isRequired,
  
  /**
   * Texto alternativo para accesibilidad. Describe el contenido de la imagen
   * para usuarios con lectores de pantalla.
   */
  alt: PropTypes.string.isRequired,
  
  /**
   * Texto de leyenda o descripción que se muestra debajo de la imagen.
   * Útil para figuras numeradas o descripciones adicionales.
   */
  caption: PropTypes.string,
  
  /**
   * Ancho máximo de la imagen en la vista normal (antes del zoom).
   * Acepta cualquier unidad CSS válida (px, %, rem, etc.)
   */
  maxWidth: PropTypes.string,
  
  /**
   * Clase CSS adicional para personalización de estilos
   */
  className: PropTypes.string,
};

ZoomableImage.defaultProps = {
  caption: '',
  maxWidth: '800px',
  className: '',
};

export default ZoomableImage;

