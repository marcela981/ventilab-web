import { createTheme } from '@mui/material/styles';

/**
 * VentyLab Theme - Sistema de Diseño Moderno
 *
 * Paleta de colores profesional y moderna diseñada para fondos claros
 * con excelente contraste y legibilidad. Incluye colores específicos para
 * los niveles del curriculum con variaciones de opacidad para diferentes casos de uso.
 *
 * Filosofía de diseño:
 * - Colores vibrantes pero no saturados
 * - Excelente contraste para accesibilidad WCAG AA
 * - Consistencia en toda la aplicación
 * - Fácil de mantener y extender
 *
 * @version 3.0.0
 * @author VentyLab Team
 */

// ==================== COLORES BASE ====================

/**
 * Colores principales de la aplicación
 * Estos colores se usan en navegación, botones principales y elementos destacados
 */
const colors = {
  // Colores principales
  primary: '#10aede',      // Cyan moderno y vibrante - Botones, enlaces, elementos interactivos
  secondary: '#3d98cc',    // Azul profundo - Complementa al primary, usado en headers y accents
  accent: '#00a1db',       // Azul claro - Para highlights y hover states

  // Colores de niveles del curriculum
  // Estos colores representan la progresión del aprendizaje
  beginner: '#4CAF50',     // Verde suave - Nivel principiante, representa crecimiento
  intermediate: '#FF9800', // Naranja cálido - Nivel intermedio, representa progreso
  advanced: '#F44336',     // Rojo elegante - Nivel avanzado, representa maestría

  // Colores de estado
  // Usados para feedback al usuario (éxito, advertencias, errores)
  success: '#4CAF50',      // Verde - Operaciones exitosas, completado
  warning: '#FF9800',      // Naranja - Advertencias, atención requerida
  error: '#F44336',        // Rojo - Errores, acciones destructivas
  info: '#10aede',         // Cyan - Información, tips, ayuda

  // Colores de texto
  // Optimizados para legibilidad en fondos claros
  textPrimary: '#0a112b',      // Gris oscuro casi negro - Texto principal, títulos
  textSecondary: '#6c757d',    // Gris medio - Texto secundario, descripciones
  textDisabled: '#9e9e9e',     // Gris claro - Texto deshabilitado, placeholder
  textHint: '#bdbdbd',         // Gris muy claro - Hints, texto opcional

  // Colores de fondo
  // Fondos neutros que permiten destacar el contenido
  backgroundDefault: '#ffffff',    // Blanco puro - Fondo principal de la app
  backgroundPaper: '#fafafa',      // Blanco grisáceo - Superficies elevadas, cards
  backgroundContrast: '#0a112b',   // Azul oscuro - Para secciones de contraste

  // Colores de bordes
  // Bordes sutiles para definir áreas sin dominar visualmente
  borderLight: '#e9ecef',      // Gris muy claro - Bordes sutiles, divisores suaves
  borderMedium: '#dee2e6',     // Gris claro - Bordes más prominentes
  borderDark: '#ced4da',       // Gris - Bordes enfatizados

  // Colores adicionales para casos especiales
  overlay: 'rgba(10, 17, 43, 0.5)',    // Overlay oscuro para modals
  shadow: 'rgba(0, 0, 0, 0.08)',       // Sombra sutil para depth
  hover: 'rgba(16, 174, 222, 0.08)',   // Hover background transparente
};

// ==================== VARIACIONES DE OPACIDAD ====================

/**
 * Genera variaciones de un color con diferentes opacidades
 * Útil para backgrounds sutiles, overlays y efectos de hover
 *
 * @param {string} color - Color hexadecimal (ej: '#4CAF50')
 * @returns {Object} Objeto con variaciones de opacidad
 */
const createColorVariations = (color) => {
  // Convertir hex a RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return {
    main: color,                            // Color original
    light: `rgba(${r}, ${g}, ${b}, 0.7)`,  // Versión más clara
    dark: `rgba(${r}, ${g}, ${b}, 0.9)`,   // Versión más oscura
    opacity05: `rgba(${r}, ${g}, ${b}, 0.05)`,  // Fondo muy sutil
    opacity10: `rgba(${r}, ${g}, ${b}, 0.1)`,   // Fondo sutil
    opacity20: `rgba(${r}, ${g}, ${b}, 0.2)`,   // Fondo visible
    opacity40: `rgba(${r}, ${g}, ${b}, 0.4)`,   // Overlay ligero
    opacity60: `rgba(${r}, ${g}, ${b}, 0.6)`,   // Overlay medio
    opacity80: `rgba(${r}, ${g}, ${b}, 0.8)`,   // Overlay fuerte
  };
};

/**
 * Colores de niveles con variaciones de opacidad
 * Permite usar el mismo color con diferentes intensidades para crear jerarquía visual
 */
const levelColors = {
  beginner: createColorVariations(colors.beginner),
  intermediate: createColorVariations(colors.intermediate),
  advanced: createColorVariations(colors.advanced),
};

// ==================== FUNCIONES HELPER ====================

/**
 * Obtiene un color con una opacidad específica
 *
 * @param {string} hexColor - Color en formato hexadecimal (ej: '#10aede')
 * @param {number} opacity - Opacidad de 0 a 1 (ej: 0.5 para 50%)
 * @returns {string} Color en formato rgba
 *
 * @example
 * getColorWithOpacity('#10aede', 0.5) // 'rgba(16, 174, 222, 0.5)'
 */
export const getColorWithOpacity = (hexColor, opacity) => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Obtiene el color de un nivel específico
 *
 * @param {string} level - Nivel del curriculum ('beginner', 'intermediate', 'advanced')
 * @param {string} variant - Variación del color ('main', 'opacity05', 'opacity10', etc.)
 * @returns {string} Color del nivel en el formato solicitado
 *
 * @example
 * getLevelColor('beginner', 'opacity10') // Color verde con 10% opacidad
 */
export const getLevelColor = (level, variant = 'main') => {
  return levelColors[level]?.[variant] || colors[level];
};

/**
 * Obtiene el color apropiado para un estado
 *
 * @param {string} status - Estado ('success', 'warning', 'error', 'info')
 * @returns {string} Color del estado
 *
 * @example
 * getStatusColor('success') // '#4CAF50'
 */
export const getStatusColor = (status) => {
  return colors[status] || colors.info;
};

// ==================== THEME CONFIGURATION ====================

const theme = createTheme({
  // ==================== PALETTE ====================
  palette: {
    mode: 'light',

    // Colores principales
    primary: {
      main: colors.primary,        // #10aede - Cyan brillante
      light: colors.accent,        // #00a1db - Más claro para hover
      dark: colors.secondary,      // #3d98cc - Más oscuro para contraste
      contrastText: '#ffffff',     // Blanco para texto sobre primary
    },

    secondary: {
      main: colors.secondary,      // #3d98cc - Azul profundo
      light: colors.accent,        // #00a1db - Variación más clara
      dark: '#0a112b',            // Azul muy oscuro
      contrastText: '#ffffff',     // Blanco para texto sobre secondary
    },

    // Colores de estado
    success: {
      main: colors.success,        // #4CAF50 - Verde
      light: '#81c784',           // Verde claro
      dark: '#388e3c',            // Verde oscuro
      contrastText: '#ffffff',
    },

    warning: {
      main: colors.warning,        // #FF9800 - Naranja
      light: '#ffb74d',           // Naranja claro
      dark: '#f57c00',            // Naranja oscuro
      contrastText: '#ffffff',
    },

    error: {
      main: colors.error,          // #F44336 - Rojo
      light: '#e57373',           // Rojo claro
      dark: '#d32f2f',            // Rojo oscuro
      contrastText: '#ffffff',
    },

    info: {
      main: colors.info,           // #10aede - Cyan (mismo que primary)
      light: colors.accent,        // #00a1db
      dark: colors.secondary,      // #3d98cc
      contrastText: '#ffffff',
    },

    // Colores de fondo
    background: {
      default: colors.backgroundDefault,    // #ffffff - Fondo principal
      paper: colors.backgroundPaper,        // #fafafa - Superficies elevadas
      contrast: colors.backgroundContrast,  // #0a112b - Contraste
    },

    // Colores de texto
    text: {
      primary: colors.textPrimary,      // #0a112b - Texto principal
      secondary: colors.textSecondary,  // #6c757d - Texto secundario
      disabled: colors.textDisabled,    // #9e9e9e - Texto deshabilitado
      hint: colors.textHint,           // #bdbdbd - Hints
    },

    // Divisores y bordes
    divider: colors.borderLight,        // #e9ecef - Divisores sutiles

    // Estados de acción
    action: {
      active: colors.primary,                      // Elemento activo
      hover: getColorWithOpacity(colors.primary, 0.08),    // Hover background
      selected: getColorWithOpacity(colors.primary, 0.12), // Elemento seleccionado
      disabled: colors.textDisabled,               // Acción deshabilitada
      disabledBackground: colors.borderLight,      // Background de deshabilitado
      focus: getColorWithOpacity(colors.primary, 0.12),    // Focus outline
    },

    // Colores personalizados del curriculum
    // No son estándar de MUI pero los agregamos para fácil acceso
    curriculum: {
      beginner: levelColors.beginner,
      intermediate: levelColors.intermediate,
      advanced: levelColors.advanced,
    },
  },

  // ==================== TYPOGRAPHY ====================
  typography: {
    // Fuente base
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',

    // Pesos disponibles: 300 (light), 400 (regular), 500 (medium), 600 (semi-bold), 700 (bold)
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,

    // Títulos principales (H1-H6)
    h1: {
      fontSize: '2.5rem',          // 40px
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.5px',     // Kerning negativo para títulos grandes
      color: colors.textPrimary,
    },
    h2: {
      fontSize: '2rem',            // 32px
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.5px',
      color: colors.textPrimary,
    },
    h3: {
      fontSize: '1.75rem',         // 28px
      fontWeight: 600,
      lineHeight: 1.3,
      color: colors.textPrimary,
    },
    h4: {
      fontSize: '1.5rem',          // 24px
      fontWeight: 600,
      lineHeight: 1.4,
      color: colors.textPrimary,
    },
    h5: {
      fontSize: '1.25rem',         // 20px
      fontWeight: 600,
      lineHeight: 1.4,
      color: colors.textPrimary,
    },
    h6: {
      fontSize: '1.125rem',        // 18px
      fontWeight: 600,
      lineHeight: 1.4,
      color: colors.textPrimary,
    },

    // Texto de cuerpo
    body1: {
      fontSize: '1rem',            // 16px - Tamaño base
      fontWeight: 400,
      lineHeight: 1.5,             // Óptimo para legibilidad
      color: colors.textPrimary,
    },
    body2: {
      fontSize: '0.875rem',        // 14px - Para texto secundario
      fontWeight: 400,
      lineHeight: 1.6,
      color: colors.textSecondary,
    },

    // Texto de botones
    button: {
      fontSize: '0.875rem',        // 14px
      fontWeight: 600,             // Semi-bold para destacar
      lineHeight: 1.75,
      textTransform: 'none',       // Sin uppercase (más moderno)
      letterSpacing: '0.02em',     // Ligero espaciado
    },

    // Texto pequeño
    caption: {
      fontSize: '0.75rem',         // 12px
      fontWeight: 400,
      lineHeight: 1.66,
      color: colors.textSecondary,
    },

    // Overline (etiquetas, categorías)
    overline: {
      fontSize: '0.75rem',         // 12px
      fontWeight: 600,
      lineHeight: 2.66,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',     // Más espaciado para mayúsculas
      color: colors.textSecondary,
    },

    // Subtítulos
    subtitle1: {
      fontSize: '1rem',            // 16px
      fontWeight: 500,
      lineHeight: 1.75,
      color: colors.textPrimary,
    },
    subtitle2: {
      fontSize: '0.875rem',        // 14px
      fontWeight: 600,
      lineHeight: 1.57,
      color: colors.textPrimary,
    },
  },

  // ==================== SPACING ====================
  // Base: 8px (Material UI default)
  // Uso: theme.spacing(1) = 8px, theme.spacing(2) = 16px, etc.
  spacing: 8,

  // ==================== SHAPE ====================
  shape: {
    borderRadius: 8,  // Border radius por defecto más moderno (8px)
  },

  // ==================== BREAKPOINTS ====================
  // Puntos de quiebre para responsive design
  breakpoints: {
    values: {
      xs: 0,        // Móvil pequeño
      sm: 600,      // Móvil grande / Tablet pequeña
      md: 960,      // Tablet
      lg: 1280,     // Desktop
      xl: 1920,     // Desktop grande
    },
  },

  // ==================== TRANSITIONS ====================
  // Configuración global de transiciones
  transitions: {
    // Duración por defecto: 0.3s para consistencia
    duration: {
      shortest: 150,      // 0.15s - Micro-interacciones
      shorter: 200,       // 0.2s - Cambios pequeños
      short: 250,         // 0.25s - Estándar para la mayoría de transiciones
      standard: 300,      // 0.3s - Transiciones normales
      complex: 375,       // 0.375s - Animaciones complejas
      enteringScreen: 225,
      leavingScreen: 195,
    },
    // Curva de animación
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',      // Suave
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',        // Acelera al final
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',           // Decelera al final
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',          // Más dramático
    },
  },

  // ==================== SHADOWS ====================
  // Sombras sutiles para depth sin ser dramáticas
  shadows: [
    'none',
    '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',      // Nivel 1 - Muy sutil
    '0 2px 6px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)',      // Nivel 2 - Sutil
    '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.06)',     // Nivel 3 - Moderado
    '0 8px 20px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.06)',     // Nivel 4 - Elevado
    '0 12px 28px rgba(0, 0, 0, 0.10), 0 6px 12px rgba(0, 0, 0, 0.08)',   // Nivel 5 - Muy elevado
    // Repetir nivel 3 para el resto (MUI requiere 25 niveles)
    ...Array(19).fill('0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.06)'),
  ],

  // ==================== COMPONENT OVERRIDES ====================
  components: {
    // === BUTTON ===
    MuiButton: {
      defaultProps: {
        disableElevation: true,  // Flat design por defecto
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 20px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(16, 174, 222, 0.3)',
          },
        },
        outlined: {
          borderWidth: '1px',
          '&:hover': {
            borderWidth: '1px',
          },
        },
      },
    },

    // === CARD ===
    MuiCard: {
      defaultProps: {
        elevation: 0,  // Sin sombra por defecto (flat)
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${colors.borderLight}`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },

    // === PAPER ===
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: 8,
        },
      },
    },

    // === CHIP ===
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },

    // === LINEAR PROGRESS ===
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: getColorWithOpacity(colors.textDisabled, 0.1),
        },
        bar: {
          borderRadius: 4,
        },
      },
    },

    // === TEXT FIELD ===
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        },
      },
    },

    // === TABS ===
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },

    // === TOOLTIP ===
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.backgroundContrast,
          fontSize: '0.75rem',
          borderRadius: 6,
          padding: '8px 12px',
        },
        arrow: {
          color: colors.backgroundContrast,
        },
      },
    },
  },
});

// ==================== EXPORTS ====================

// Exportar theme como default
export default theme;

// Exportar colores para uso directo
export { colors, levelColors };

// Exportar funciones helper
export { getColorWithOpacity, getLevelColor, getStatusColor };

/**
 * Guía de uso:
 *
 * 1. Importar el theme:
 *    import theme from './theme/theme';
 *
 * 2. Usar colores del theme:
 *    sx={{ color: 'primary.main' }}
 *    sx={{ backgroundColor: 'background.paper' }}
 *
 * 3. Usar colores de niveles:
 *    import { getLevelColor } from './theme/theme';
 *    sx={{ backgroundColor: getLevelColor('beginner', 'opacity10') }}
 *
 * 4. Usar colores con opacidad personalizada:
 *    import { getColorWithOpacity } from './theme/theme';
 *    sx={{ backgroundColor: getColorWithOpacity('#10aede', 0.5) }}
 *
 * 5. Acceder a transiciones:
 *    sx={{ transition: theme.transitions.create(['all']) }}
 *
 * 6. Usar breakpoints:
 *    sx={{ [theme.breakpoints.down('sm')]: { padding: 2 } }}
 */
