import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Alert,
  Button,
  Typography,
  styled,
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  BrokenImage as BrokenImageIcon,
  VideoLibrary as VideoLibraryIcon,
  Image as ImageIcon,
  Code as CodeIcon,
} from '@mui/icons-material';

/**
 * FallbackContainer - Contenedor estilizado para el mensaje de fallback
 */
const FallbackContainer = styled(Box)(({ theme, variant }) => {
  const baseStyles = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(4),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    textAlign: 'center',
  };

  const variants = {
    video: {
      ...baseStyles,
      minHeight: '300px',
    },
    image: {
      ...baseStyles,
      minHeight: '250px',
    },
    svg: {
      ...baseStyles,
      minHeight: '300px',
    },
    audio: {
      ...baseStyles,
      minHeight: '150px',
    },
    default: {
      ...baseStyles,
      minHeight: '200px',
    },
  };

  return variants[variant] || variants.default;
});

/**
 * IconWrapper - Wrapper para el icono con estilos
 */
const IconWrapper = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  color: theme.palette.text.disabled,
  
  '& .MuiSvgIcon-root': {
    fontSize: '4rem',
  },
}));

/**
 * getIconForVariant - Retorna el icono apropiado según el tipo de media
 */
const getIconForVariant = (variant) => {
  const icons = {
    video: VideoLibraryIcon,
    image: BrokenImageIcon,
    svg: CodeIcon,
    audio: VideoLibraryIcon,
    default: ImageIcon,
  };
  return icons[variant] || icons.default;
};

/**
 * MediaFallback - Componente reutilizable para mostrar mensajes de fallback
 * cuando un recurso multimedia no está disponible
 * 
 * Proporciona una interfaz consistente y accesible para informar al usuario
 * sobre recursos no disponibles, con opción de abrir en nueva pestaña si hay URL.
 * 
 * @component
 * @example
 * ```jsx
 * // Sin URL externa
 * <MediaFallback 
 *   variant="video"
 *   message="El video no está disponible en este momento"
 * />
 * 
 * // Con URL para abrir en nueva pestaña
 * <MediaFallback 
 *   variant="image"
 *   message="La imagen no se pudo cargar"
 *   externalUrl="https://example.com/image.jpg"
 * />
 * ```
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} [props.variant='default'] - Tipo de media: 'video', 'image', 'svg', 'audio', 'default'
 * @param {string} props.message - Mensaje principal a mostrar
 * @param {string} [props.externalUrl] - URL opcional para abrir en nueva pestaña
 * @param {string} [props.buttonText] - Texto personalizado para el botón
 */
const MediaFallback = ({ 
  variant = 'default',
  message,
  externalUrl,
  buttonText,
  ...props 
}) => {
  const IconComponent = getIconForVariant(variant);
  
  const handleOpenExternal = () => {
    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const defaultButtonText = externalUrl 
    ? 'Abrir en nueva pestaña' 
    : null;

  return (
    <FallbackContainer variant={variant} {...props}>
      <IconWrapper>
        <IconComponent />
      </IconWrapper>
      
      <Alert 
        severity="warning" 
        sx={{ 
          width: '100%', 
          maxWidth: '500px',
          mb: externalUrl ? 2 : 0,
        }}
      >
        <Typography variant="body1" component="p" gutterBottom>
          {message || 'El recurso no está disponible en este momento'}
        </Typography>
      </Alert>

      {externalUrl && (
        <Button
          variant="outlined"
          color="primary"
          startIcon={<OpenInNewIcon />}
          onClick={handleOpenExternal}
          sx={{ mt: 2 }}
          aria-label={`Abrir ${variant} en nueva pestaña`}
        >
          {buttonText || defaultButtonText}
        </Button>
      )}
    </FallbackContainer>
  );
};

MediaFallback.propTypes = {
  /**
   * Tipo de media para el cual se muestra el fallback.
   * Determina el icono y estilos apropiados.
   */
  variant: PropTypes.oneOf(['video', 'image', 'svg', 'audio', 'default']),
  
  /**
   * Mensaje principal a mostrar al usuario.
   * Debe ser claro y descriptivo del problema.
   */
  message: PropTypes.string.isRequired,
  
  /**
   * URL externa opcional para abrir el recurso en una nueva pestaña.
   * Si se proporciona, se mostrará un botón para abrirla.
   */
  externalUrl: PropTypes.string,
  
  /**
   * Texto personalizado para el botón de abrir en nueva pestaña.
   * Si no se proporciona, se usa el texto por defecto.
   */
  buttonText: PropTypes.string,
};

MediaFallback.defaultProps = {
  variant: 'default',
  externalUrl: null,
  buttonText: null,
};

export default MediaFallback;

