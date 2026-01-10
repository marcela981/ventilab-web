"use client";

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Skeleton, styled } from '@mui/material';

/**
 * MediaSkeletonContainer - Contenedor estilizado para el skeleton
 */
const MediaSkeletonContainer = styled(Box)(({ theme, variant }) => {
  const baseStyles = {
    width: '100%',
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
  };

  // Variantes de skeleton según el tipo de media
  const variants = {
    video: {
      ...baseStyles,
      paddingTop: '56.25%', // 16:9 aspect ratio
      position: 'relative',
      backgroundColor: theme.palette.grey[900],
    },
    image: {
      ...baseStyles,
      minHeight: '300px',
      backgroundColor: theme.palette.grey[100],
    },
    svg: {
      ...baseStyles,
      minHeight: '400px',
      backgroundColor: theme.palette.grey[50],
      border: `1px solid ${theme.palette.divider}`,
    },
    audio: {
      ...baseStyles,
      height: '80px',
      backgroundColor: theme.palette.grey[100],
      padding: theme.spacing(2),
    },
    default: {
      ...baseStyles,
      minHeight: '200px',
      backgroundColor: theme.palette.grey[100],
    },
  };

  return variants[variant] || variants.default;
});

/**
 * MediaSkeleton - Componente reutilizable de skeleton para carga de recursos multimedia
 * 
 * Proporciona un placeholder animado mientras se carga el contenido multimedia,
 * manteniendo la consistencia visual y mejorando la experiencia de usuario.
 * 
 * @component
 * @example
 * ```jsx
 * // Para video
 * <MediaSkeleton variant="video" />
 * 
 * // Para imagen
 * <MediaSkeleton variant="image" height={400} />
 * 
 * // Para SVG
 * <MediaSkeleton variant="svg" />
 * ```
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} [props.variant='default'] - Tipo de media: 'video', 'image', 'svg', 'audio', 'default'
 * @param {number|string} [props.height] - Altura personalizada (opcional)
 * @param {number|string} [props.width] - Ancho personalizado (opcional)
 * @param {string} [props.animation='wave'] - Tipo de animación: 'pulse', 'wave', false
 */
const MediaSkeleton = ({ 
  variant = 'default', 
  height, 
  width, 
  animation = 'wave',
  ...props 
}) => {
  return (
    <MediaSkeletonContainer variant={variant} {...props}>
      <Skeleton
        variant="rectangular"
        width={width || '100%'}
        height={height || '100%'}
        animation={animation}
        sx={{
          position: variant === 'video' ? 'absolute' : 'relative',
          top: variant === 'video' ? 0 : 'auto',
          left: variant === 'video' ? 0 : 'auto',
          borderRadius: 1,
        }}
        aria-label={`Cargando ${variant}`}
        role="status"
      />
    </MediaSkeletonContainer>
  );
};

MediaSkeleton.propTypes = {
  /**
   * Tipo de media para el cual se muestra el skeleton.
   * Determina las dimensiones y estilos apropiados.
   */
  variant: PropTypes.oneOf(['video', 'image', 'svg', 'audio', 'default']),
  
  /**
   * Altura personalizada del skeleton.
   * Puede ser un número (px) o string CSS válido.
   */
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  
  /**
   * Ancho personalizado del skeleton.
   * Puede ser un número (px) o string CSS válido.
   */
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  
  /**
   * Tipo de animación del skeleton.
   * 'wave' es la animación por defecto más suave.
   */
  animation: PropTypes.oneOfType([
    PropTypes.oneOf(['pulse', 'wave', false]),
    PropTypes.bool,
  ]),
};

MediaSkeleton.defaultProps = {
  variant: 'default',
  animation: 'wave',
};

export default MediaSkeleton;

