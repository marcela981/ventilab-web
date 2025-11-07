"use client";

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import {
  Box,
  ImageList,
  ImageListItem,
  Typography,
  useTheme,
  useMediaQuery,
  styled,
} from '@mui/material';
import {
  Image as ImageIcon,
  BrokenImage as BrokenImageIcon,
} from '@mui/icons-material';

/**
 * GalleryContainer - Contenedor principal de la galería
 */
const GalleryContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  margin: `${theme.spacing(2)} 0`,
}));

/**
 * EmptyStateContainer - Contenedor para estado vacío
 */
const EmptyStateContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(6),
  textAlign: 'center',
  color: theme.palette.text.secondary,
  
  '& .MuiSvgIcon-root': {
    fontSize: '4rem',
    marginBottom: theme.spacing(2),
    color: theme.palette.text.disabled,
  },
}));

/**
 * ImageItemContainer - Contenedor para cada item de imagen
 */
const ImageItemContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.grey[100],
  cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
  
  '& img': {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
}));

/**
 * ErrorPlaceholder - Placeholder para imágenes que fallan al cargar
 */
const ErrorPlaceholder = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.palette.grey[200],
  color: theme.palette.text.secondary,
  padding: theme.spacing(2),
  minHeight: '200px',
  
  '& .MuiSvgIcon-root': {
    fontSize: '3rem',
    marginBottom: theme.spacing(1),
    color: theme.palette.grey[400],
  },
}));

/**
 * CaptionText - Texto de caption con truncado elegante
 */
const CaptionText = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(1),
  fontSize: '0.875rem',
  color: theme.palette.text.secondary,
  lineHeight: 1.5,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  wordBreak: 'break-word',
}));

/**
 * ImageGallery - Componente de galería de imágenes con zoom y captions
 * 
 * Características:
 * - Galería responsive (2 columnas móvil, 3 tablet, 4 desktop)
 * - Zoom accesible con react-medium-image-zoom
 * - Lazy loading nativo de imágenes
 * - Captions con truncado elegante
 * - Manejo robusto de errores
 * - Estado vacío cuando no hay imágenes
 * 
 * @component
 * @example
 * ```jsx
 * const images = [
 *   {
 *     src: '/images/diagram-1.jpg',
 *     alt: 'Diagrama del sistema respiratorio',
 *     caption: 'Figura 1: Estructura básica del sistema respiratorio humano'
 *   },
 *   {
 *     src: '/images/diagram-2.jpg',
 *     alt: 'Ventilador mecánico',
 *     caption: 'Figura 2: Componentes principales del ventilador'
 *   }
 * ];
 * 
 * <ImageGallery images={images} />
 * ```
 */
const ImageGallery = ({
  images,
  columns,
  onImageError,
  ...props
}) => {
  const theme = useTheme();
  const [imageErrors, setImageErrors] = useState({});
  
  // Responsive columns usando useMediaQuery
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  
  // Determinar número de columnas
  const getColumns = () => {
    if (columns) return columns;
    if (isMobile) return 2;
    if (isTablet) return 3;
    return 4; // lg y superior
  };

  /**
   * Maneja errores al cargar una imagen específica
   */
  const handleImageError = useCallback(
    (index, imageSrc) => {
      setImageErrors((prev) => ({
        ...prev,
        [index]: true,
      }));

      // Llamar callback si existe
      if (onImageError && typeof onImageError === 'function') {
        onImageError(index, imageSrc);
      }
    },
    [onImageError]
  );

  /**
   * Genera un alt text seguro si no se proporciona
   */
  const getAltText = useCallback((image, index) => {
    if (image.alt && image.alt.trim()) {
      return image.alt;
    }
    return `Imagen ${index + 1} de la galería`;
  }, []);

  // Estado vacío si no hay imágenes
  if (!images || !Array.isArray(images) || images.length === 0) {
    return (
      <GalleryContainer {...props}>
        <EmptyStateContainer>
          <ImageIcon />
          <Typography variant="body1" color="text.secondary">
            No hay imágenes disponibles
          </Typography>
        </EmptyStateContainer>
      </GalleryContainer>
    );
  }

  return (
    <GalleryContainer {...props}>
      <ImageList
        cols={getColumns()}
        gap={16}
        sx={{
          margin: 0,
          padding: 0,
        }}
      >
        {images.map((image, index) => {
          const hasError = imageErrors[index];
          const altText = getAltText(image, index);

          return (
            <ImageListItem key={index} sx={{ overflow: 'hidden' }}>
              <ImageItemContainer>
                {hasError ? (
                  <ErrorPlaceholder>
                    <BrokenImageIcon />
                    <Typography variant="caption" align="center">
                      No disponible
                    </Typography>
                    {image.caption && (
                      <Typography
                        variant="caption"
                        align="center"
                        sx={{ mt: 1, fontSize: '0.75rem' }}
                      >
                        {image.caption}
                      </Typography>
                    )}
                  </ErrorPlaceholder>
                ) : (
                  <Zoom
                    zoomMargin={40}
                    overlayBgColorEnd="rgba(0, 0, 0, 0.95)"
                    transitionDuration={300}
                  >
                    <img
                      src={image.src}
                      alt={altText}
                      loading="lazy"
                      decoding="async"
                      onError={() => handleImageError(index, image.src)}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      aria-label={altText}
                    />
                  </Zoom>
                )}
              </ImageItemContainer>

              {/* Caption */}
              {image.caption && (
                <CaptionText
                  variant="caption"
                  title={image.caption}
                  aria-label={`Descripción: ${image.caption}`}
                >
                  {image.caption}
                </CaptionText>
              )}
            </ImageListItem>
          );
        })}
      </ImageList>
    </GalleryContainer>
  );
};

ImageGallery.propTypes = {
  /**
   * Array de objetos de imagen.
   * Cada objeto debe tener:
   * - src (string, requerido): URL de la imagen
   * - alt (string, opcional): Texto alternativo para accesibilidad
   * - caption (string, opcional): Descripción que se muestra bajo la imagen
   * 
   * @required
   */
  images: PropTypes.arrayOf(
    PropTypes.shape({
      src: PropTypes.string.isRequired,
      alt: PropTypes.string,
      caption: PropTypes.string,
    })
  ).isRequired,

  /**
   * Número de columnas fijo (opcional).
   * Si no se proporciona, se calcula automáticamente según el breakpoint:
   * - Móvil (< md): 2 columnas
   * - Tablet (md-lg): 3 columnas
   * - Desktop (>= lg): 4 columnas
   */
  columns: PropTypes.number,

  /**
   * Callback llamado cuando una imagen falla al cargar.
   * 
   * @param {number} index - Índice de la imagen que falló
   * @param {string} src - URL de la imagen que falló
   */
  onImageError: PropTypes.func,
};

ImageGallery.defaultProps = {
  columns: null, // Se calcula automáticamente
  onImageError: null,
};

export default ImageGallery;

