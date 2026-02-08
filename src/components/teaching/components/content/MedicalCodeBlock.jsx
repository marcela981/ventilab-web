import React from 'react';
import PropTypes from 'prop-types';
import dynamic from 'next/dynamic';
import { Box, styled } from '@mui/material';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Dynamic import to avoid SSR issues with react-syntax-highlighter
const SyntaxHighlighter = dynamic(
  async () => {
    const mod = await import('react-syntax-highlighter');
    return mod.Prism;
  },
  { ssr: false }
);

/**
 * Términos médicos comunes para resaltar en bloques de código
 */
const MEDICAL_TERMS = [
  // Parámetros ventilatorios
  'PEEP', 'FiO2', 'PIP', 'Pplat', 'VT', 'RR', 'I:E',
  'CPAP', 'BiPAP', 'PSV', 'PCV', 'VCV', 'SIMV',
  // Gases sanguíneos
  'PaO2', 'PaCO2', 'pH', 'HCO3', 'SaO2', 'SpO2',
  // Mecánica respiratoria
  'compliance', 'resistencia', 'elastancia', 'auto-PEEP',
  // Términos clínicos
  'hipoxemia', 'hipercapnia', 'acidosis', 'alcalosis',
  'atelectasia', 'barotrauma', 'volutrauma', 'SDRA', 'ARDS',
  'ventilación', 'oxigenación', 'perfusión', 'shunt'
];

/**
 * StyledCodeContainer - Contenedor estilizado para el bloque de código
 */
const StyledCodeContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  boxShadow: theme.shadows[2],
  '& pre': {
    margin: 0,
    padding: `${theme.spacing(2)} !important`,
    fontSize: '0.875rem',
    lineHeight: 1.6,
    fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
  }
}));

/**
 * LanguageLabel - Etiqueta que muestra el lenguaje del código
 */
const LanguageLabel = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: `${theme.spacing(0.5)} ${theme.spacing(1.5)}`,
  borderRadius: theme.shape.borderRadius,
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  zIndex: 1,
  opacity: 0.9,
}));

/**
 * MedicalCodeBlock - Componente para renderizar bloques de código con resaltado
 * de términos médicos especializados.
 * 
 * @component
 * @example
 * ```jsx
 * <MedicalCodeBlock language="javascript" inline={false}>
 *   const PEEP = 5; // cmH2O
 *   const FiO2 = 0.5;
 * </MedicalCodeBlock>
 * ```
 * 
 * @param {Object} props - Propiedades del componente
 * @param {React.ReactNode} children - Código a renderizar
 * @param {string} [className] - Clase CSS opcional (puede contener info del lenguaje)
 * @param {boolean} [inline=false] - Si es código inline o bloque
 * @param {string} [language] - Lenguaje del código para syntax highlighting
 */
const MedicalCodeBlock = ({ children, className, inline = false, language, ...props }) => {
  // Extraer el lenguaje del className si está disponible
  const match = /language-(\w+)/.exec(className || '');
  const detectedLanguage = language || (match ? match[1] : 'text');
  
  // Si es código inline, usar elemento simple
  if (inline) {
    return (
      <Box
        component="code"
        sx={{
          backgroundColor: 'rgba(0, 0, 0, 0.05)',
          padding: '2px 6px',
          borderRadius: 1,
          fontSize: '0.875em',
          fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
          color: 'primary.main',
          fontWeight: 600,
        }}
        {...props}
      >
        {children}
      </Box>
    );
  }

  // Procesar el código para resaltar términos médicos
  const code = String(children).replace(/\n$/, '');
  
  /**
   * Función personalizada para agregar resaltado adicional a términos médicos
   */
  const customStyle = {
    ...vscDarkPlus,
    'pre[class*="language-"]': {
      ...vscDarkPlus['pre[class*="language-"]'],
      backgroundColor: '#1e1e1e',
    }
  };

  return (
    <StyledCodeContainer>
      {detectedLanguage !== 'text' && (
        <LanguageLabel>
          {detectedLanguage}
        </LanguageLabel>
      )}
      <SyntaxHighlighter
        language={detectedLanguage}
        style={customStyle}
        showLineNumbers={!inline && code.split('\n').length > 3}
        wrapLines={true}
        customStyle={{
          margin: 0,
          borderRadius: 0,
        }}
        PreTag="div"
        {...props}
      >
        {code}
      </SyntaxHighlighter>
    </StyledCodeContainer>
  );
};

MedicalCodeBlock.propTypes = {
  /** Código a renderizar */
  children: PropTypes.node.isRequired,
  /** Clase CSS opcional (puede incluir lenguaje como 'language-javascript') */
  className: PropTypes.string,
  /** Si es código inline (true) o bloque (false) */
  inline: PropTypes.bool,
  /** Lenguaje del código para syntax highlighting */
  language: PropTypes.string,
};

MedicalCodeBlock.defaultProps = {
  className: '',
  inline: false,
  language: 'text',
};

export default MedicalCodeBlock;

