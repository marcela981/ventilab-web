import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Fade,
  useTheme
} from '@mui/material';

/**
 * ModuleInfoPanel - Panel informativo minimalista
 *
 * Componente discreto que proporciona información contextual sobre el módulo
 * sin competir visualmente con los elementos principales de la interfaz.
 * Diseñado para ser funcional pero no prominente.
 *
 * Características:
 * - Diseño minimalista con colores sutiles del theme
 * - Borde izquierdo sutil como único elemento decorativo
 * - Animación fade-in suave al aparecer
 * - Modo compacto opcional para espacios limitados
 * - Totalmente responsive con ajustes automáticos en móviles
 *
 * @component
 * @param {string} title - Título del panel (sin emoji por defecto)
 * @param {string} description - Descripción o contenido informativo
 * @param {string} subtitle - Subtítulo opcional para información adicional
 * @param {boolean} showEmoji - Si true, muestra el emoji en el título
 * @param {string} emoji - Emoji personalizado (por defecto '💡')
 * @param {boolean} compact - Si true, reduce padding y tamaños de fuente
 * @param {number} fadeDelay - Retraso en ms para la animación fade-in (por defecto 200)
 * @returns {JSX.Element} Panel informativo minimalista
 *
 * @example
 * // Uso básico
 * <ModuleInfoPanel
 *   title="Sobre este módulo"
 *   description="Descripción del módulo..."
 * />
 *
 * @example
 * // Con todas las opciones
 * <ModuleInfoPanel
 *   title="Información"
 *   subtitle="Metodología de aprendizaje"
 *   description="Contenido detallado..."
 *   showEmoji={true}
 *   emoji="📚"
 *   compact={true}
 * />
 */
const ModuleInfoPanel = ({
  title = "Sobre este módulo",
  description = "Este módulo está diseñado para proporcionar una comprensión integral de la ventilación mecánica, desde los fundamentos fisiológicos hasta la aplicación clínica práctica.",
  subtitle = null,
  showEmoji = false,
  emoji = "💡",
  compact = false,
  fadeDelay = 200
}) => {
  const theme = useTheme();

  /**
   * Calcula el padding según el modo compact
   * @returns {number} Valor de padding en unidades del theme
   */
  const getPadding = () => compact ? 1.5 : 2;

  /**
   * Calcula el margin top según el modo compact
   * @returns {number} Valor de margin en unidades del theme
   */
  const getMarginTop = () => compact ? 2 : 3;

  /**
   * Calcula el tamaño de fuente para el título según el modo compact
   * @returns {string} Tamaño de fuente en rem
   */
  const getTitleFontSize = () => compact ? '0.95rem' : '1.1rem';

  /**
   * Calcula el tamaño de fuente para la descripción según el modo compact
   * @returns {string} Tamaño de fuente en rem
   */
  const getDescriptionFontSize = () => compact ? '0.85rem' : '0.95rem';

  return (
    <Fade in={true} timeout={fadeDelay}>
      <Box
        sx={{
          mt: getMarginTop(),
          mb: { xs: 1, sm: 2 }, // Menos espacio vertical en móviles
          p: getPadding(),
          // Fondo sutil apenas perceptible
          backgroundColor: `${theme.palette.background.default}05`,
          // Borde izquierdo discreto como único elemento decorativo
          borderLeft: `2px solid ${theme.palette.primary.main}`,
          borderRadius: 1,
          // Transiciones suaves para cambios de estado
          transition: 'all 0.3s ease',
          // Hover sutil para dar feedback visual
          '&:hover': {
            backgroundColor: `${theme.palette.background.default}10`,
            borderLeftColor: theme.palette.primary.dark
          }
        }}
      >
        {/* Header del panel */}
        <Box sx={{ mb: subtitle ? 0.5 : 1 }}>
          <Typography
            variant="h6"
            sx={{
              color: 'text.primary',
              fontWeight: 600,
              fontSize: getTitleFontSize(),
              lineHeight: 1.3,
              display: 'flex',
              alignItems: 'center',
              gap: showEmoji ? 1 : 0
            }}
          >
            {/* Emoji opcional - solo se muestra si showEmoji es true */}
            {showEmoji && (
              <Box
                component="span"
                sx={{
                  fontSize: compact ? '1rem' : '1.2rem',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {emoji}
              </Box>
            )}
            {title}
          </Typography>

          {/* Subtítulo opcional */}
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: compact ? '0.7rem' : '0.75rem',
                fontWeight: 500,
                display: 'block',
                mt: 0.5,
                lineHeight: 1.4
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* Descripción/Contenido principal */}
        <Typography
          variant="body1"
          sx={{
            color: 'text.secondary',
            fontSize: getDescriptionFontSize(),
            lineHeight: 1.7,
            // Mejor legibilidad en párrafos largos
            textAlign: 'justify',
            // Responsive: ajustar line-height en móviles
            [theme.breakpoints.down('sm')]: {
              lineHeight: 1.6,
              textAlign: 'left'
            }
          }}
        >
          {description}
        </Typography>
      </Box>
    </Fade>
  );
};

// PropTypes con validación completa
ModuleInfoPanel.propTypes = {
  /** Título principal del panel */
  title: PropTypes.string,

  /** Contenido descriptivo o informativo */
  description: PropTypes.string,

  /** Subtítulo opcional para contexto adicional */
  subtitle: PropTypes.string,

  /** Controla si se muestra el emoji en el título */
  showEmoji: PropTypes.bool,

  /** Emoji personalizado a mostrar (requiere showEmoji: true) */
  emoji: PropTypes.string,

  /** Modo compacto con padding y fuentes reducidas */
  compact: PropTypes.bool,

  /** Duración en ms del retraso para la animación fade-in */
  fadeDelay: PropTypes.number
};

export default ModuleInfoPanel;
