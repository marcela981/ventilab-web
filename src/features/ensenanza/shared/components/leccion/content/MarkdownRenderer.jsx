import React from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Box, Typography, Divider, styled, Link as MuiLink } from '@mui/material';
import MedicalCodeBlock from './MedicalCodeBlock';
import StyledTable from './StyledTable';
import ZoomableImage from './ZoomableImage';

// Importar estilos CSS de KaTeX
import 'katex/dist/katex.min.css';

/**
 * MarkdownContainer - Contenedor principal con estilos globales para el contenido Markdown
 */
const MarkdownContainer = styled(Box)(({ theme }) => ({
  fontFamily: theme.typography.fontFamily,
  fontSize: '1rem',
  lineHeight: 1.8,
  color: theme.palette.text.primary,
  maxWidth: '100%',
  wordWrap: 'break-word',
  
  // Estilos para párrafos
  '& p': {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    lineHeight: 1.8,
  },

  // Estilos para encabezados - Textos importantes en azul
  '& h1': {
    ...theme.typography.h3,
    fontWeight: 700,
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(2),
    color: '#0BBAF4',
    borderBottom: `3px solid #0BBAF4`,
    paddingBottom: theme.spacing(1),
  },

  '& h2': {
    ...theme.typography.h4,
    fontWeight: 600,
    marginTop: theme.spacing(3.5),
    marginBottom: theme.spacing(1.5),
    color: '#0BBAF4',
    borderBottom: `2px solid #0BBAF4`,
    paddingBottom: theme.spacing(0.75),
  },

  '& h3': {
    ...theme.typography.h5,
    fontWeight: 600,
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(1.5),
    color: '#0BBAF4',
  },

  '& h4': {
    ...theme.typography.h6,
    fontWeight: 600,
    marginTop: theme.spacing(2.5),
    marginBottom: theme.spacing(1),
    color: '#BBECFC',
  },

  '& h5': {
    ...theme.typography.subtitle1,
    fontWeight: 600,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    color: '#BBECFC',
  },

  '& h6': {
    ...theme.typography.subtitle2,
    fontWeight: 600,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    color: '#BBECFC',
  },

  // Estilos para listas - Texto en blanco
  '& ul, & ol': {
    marginTop: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5),
    paddingLeft: theme.spacing(4),
    color: '#ffffff',
  },

  '& li': {
    marginTop: theme.spacing(0.75),
    marginBottom: theme.spacing(0.75),
    lineHeight: 1.7,
    color: '#ffffff',
  },

  '& li > p': {
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5),
    color: '#ffffff',
  },

  // Estilos para citas - Texto en blanco con fondo azul claro
  '& blockquote': {
    borderLeft: `4px solid #0BBAF4`,
    paddingLeft: theme.spacing(2),
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    marginLeft: 0,
    marginRight: 0,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    backgroundColor: 'rgba(11, 186, 244, 0.1)',
    borderRadius: theme.shape.borderRadius,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.9)',
  },

  '& blockquote p': {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Estilos para líneas horizontales
  '& hr': {
    border: 'none',
    borderTop: `2px solid ${theme.palette.divider}`,
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },

  // Estilos para enlaces - Texto importante en azul
  '& a': {
    color: '#0BBAF4',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'color 0.2s ease',
    '&:hover': {
      color: '#BBECFC',
      textDecoration: 'underline',
    },
  },

  // Estilos para texto en negrita y cursiva
  '& strong': {
    fontWeight: 700,
    color: '#BBECFC',
  },

  '& em': {
    fontStyle: 'italic',
  },

  // Estilos para fórmulas matemáticas
  '& .katex': {
    fontSize: '1.1em',
  },

  '& .katex-display': {
    margin: `${theme.spacing(2)} 0`,
    overflow: 'auto',
    padding: theme.spacing(2),
    backgroundColor: theme.palette.action.hover,
    borderRadius: theme.shape.borderRadius,
  },

  // Estilos para términos médicos destacados
  '& .medical-term': {
    fontWeight: 600,
    color: theme.palette.secondary.main,
  },
}));

/**
 * Componentes personalizados para react-markdown
 */
const components = {
  // Encabezados - Textos importantes en azul
  h1: ({ node, ...props }) => (
    <Typography variant="h3" component="h1" sx={{ color: '#0BBAF4' }} {...props} />
  ),
  h2: ({ node, ...props }) => (
    <Typography variant="h4" component="h2" sx={{ color: '#0BBAF4' }} {...props} />
  ),
  h3: ({ node, ...props }) => (
    <Typography variant="h5" component="h3" sx={{ color: '#0BBAF4' }} {...props} />
  ),
  h4: ({ node, ...props }) => (
    <Typography variant="h6" component="h4" sx={{ color: '#BBECFC' }} {...props} />
  ),
  h5: ({ node, ...props }) => (
    <Typography variant="subtitle1" component="h5" sx={{ color: '#BBECFC' }} {...props} />
  ),
  h6: ({ node, ...props }) => (
    <Typography variant="subtitle2" component="h6" sx={{ color: '#BBECFC' }} {...props} />
  ),

  // Párrafos - Texto normal en blanco
  p: ({ node, ...props }) => (
    <Typography variant="body1" component="p" paragraph sx={{ color: '#ffffff' }} {...props} />
  ),

  // Enlaces
  a: ({ node, href, children, ...props }) => (
    <MuiLink
      href={href}
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      {...props}
    >
      {children}
    </MuiLink>
  ),

  // Bloques de código y código inline
  code: MedicalCodeBlock,

  // Tablas
  table: StyledTable,

  // Imágenes
  img: ({ node, src, alt, title, ...props }) => (
    <ZoomableImage
      src={src}
      alt={alt || 'Imagen'}
      title={title}
      caption={title || alt}
      {...props}
    />
  ),

  // Líneas horizontales
  hr: ({ node, ...props }) => (
    <Divider sx={{ my: 3 }} {...props} />
  ),

  // Citas
  blockquote: ({ node, children, ...props }) => (
    <Box
      component="blockquote"
      sx={{
        borderLeft: 4,
        borderColor: '#0BBAF4',
        pl: 2,
        py: 1,
        my: 2,
        backgroundColor: 'rgba(11, 186, 244, 0.1)',
        borderRadius: 1,
        fontStyle: 'italic',
        color: 'rgba(255, 255, 255, 0.9)',
      }}
      {...props}
    >
      {children}
    </Box>
  ),

  // Listas
  ul: ({ node, ...props }) => (
    <Box component="ul" sx={{ pl: 4, my: 1.5 }} {...props} />
  ),
  ol: ({ node, ...props }) => (
    <Box component="ol" sx={{ pl: 4, my: 1.5 }} {...props} />
  ),
  li: ({ node, ...props }) => (
    <Box component="li" sx={{ my: 0.75 }} {...props} />
  ),
};

/**
 * MarkdownRenderer - Componente principal para renderizar contenido Markdown
 * con soporte para sintaxis médica especializada, fórmulas matemáticas, tablas,
 * imágenes con zoom y bloques de código con resaltado.
 * 
 * Este componente está optimizado para contenido educativo médico y científico,
 * proporcionando una experiencia de lectura profesional y agradable.
 * 
 * @component
 * @example
 * ```jsx
 * const markdownContent = `
 * # Ventilación Mecánica
 * 
 * ## Parámetros Básicos
 * 
 * Los parámetros fundamentales incluyen:
 * - **PEEP**: Presión positiva al final de la espiración
 * - **FiO₂**: Fracción inspirada de oxígeno
 * 
 * ### Fórmula de Compliance
 * 
 * La compliance pulmonar se calcula como:
 * 
 * $$C = \\frac{\\Delta V}{\\Delta P}$$
 * 
 * | Parámetro | Valor Normal | Unidad |
 * |-----------|--------------|--------|
 * | PEEP      | 5-10         | cmH₂O  |
 * | FiO₂      | 0.21-1.0     | -      |
 * `;
 * 
 * <MarkdownRenderer content={markdownContent} />
 * ```
 * 
 * @param {Object} props - Propiedades del componente
 * @param {string} props.content - Contenido Markdown a renderizar
 * @param {string} [props.className] - Clase CSS adicional para el contenedor
 * @param {Object} [props.sx] - Estilos adicionales usando el sistema sx de Material UI
 */
const MarkdownRenderer = ({ content, className, sx, ...props }) => {
  // Validar que se proporcione contenido
  if (!content || typeof content !== 'string') {
    return (
      <Box sx={{ p: 2, ...sx }}>
        <Typography color="text.secondary" variant="body2">
          No hay contenido para mostrar.
        </Typography>
      </Box>
    );
  }

  return (
    <MarkdownContainer className={className} sx={sx} {...props}>
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,      // Soporte para GitHub Flavored Markdown (tablas, listas de tareas, etc.)
          remarkMath,     // Soporte para notación matemática
        ]}
        rehypePlugins={[
          rehypeKatex,    // Renderizado de fórmulas matemáticas con KaTeX
        ]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </MarkdownContainer>
  );
};

MarkdownRenderer.propTypes = {
  /** 
   * Contenido Markdown a renderizar. Debe ser un string válido.
   * Soporta GitHub Flavored Markdown, fórmulas matemáticas con LaTeX,
   * tablas, imágenes, bloques de código y más.
   */
  content: PropTypes.string.isRequired,
  
  /** Clase CSS adicional para el contenedor principal */
  className: PropTypes.string,
  
  /** 
   * Estilos adicionales usando el sistema sx de Material UI.
   * Se pueden pasar propiedades como padding, margin, etc.
   */
  sx: PropTypes.object,
};

MarkdownRenderer.defaultProps = {
  className: '',
  sx: {},
};

export default MarkdownRenderer;

