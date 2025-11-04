import { createTheme } from '@mui/material/styles';

/**
 * VentyLab Theme - Configuración maestra del sistema de diseño
 *
 * Este archivo consolida toda la configuración de colores, tipografía,
 * spacing, shadows y component overrides en una única fuente de verdad.
 *
 * @version 2.0.0
 * @author VentyLab Team
 */

const theme = createTheme({
  // ==================== PALETTE ====================
  palette: {
    mode: 'dark',

    primary: {
      main: '#10aede',        // Cyan brillante
      light: '#00a1db',       // Azul claro
      dark: '#3d98cc',        // Azul medio
      contrastText: '#ffffff',
    },

    secondary: {
      main: '#3d98cc',        // Azul medio
      light: '#00a1db',       // Azul claro
      dark: '#0a112b',        // Azul oscuro profundo
      contrastText: '#ffffff',
    },

    background: {
      default: '#0a112b',     // Fondo principal - azul oscuro profundo
      paper: 'rgba(255, 255, 255, 0.05)', // Superficie sutil con transparencia
    },

    // Colores de superficie personalizados (no estándar MUI)
    surface: {
      main: 'rgba(255, 255, 255, 0.05)',
      elevated: 'rgba(255, 255, 255, 0.08)',
      overlay: 'rgba(10, 17, 43, 0.95)',
    },

    text: {
      primary: '#e8f4fd',     // Azul muy claro
      secondary: 'rgba(232, 244, 253, 0.7)',
      disabled: 'rgba(232, 244, 253, 0.4)',
      hint: 'rgba(232, 244, 253, 0.5)',
    },

    divider: 'rgba(255, 255, 255, 0.08)',

    action: {
      active: '#10aede',
      hover: 'rgba(255, 255, 255, 0.08)',
      selected: '#10aede',
      disabled: 'rgba(232, 244, 253, 0.4)',
      disabledBackground: 'rgba(255, 255, 255, 0.05)',
    },

    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
      contrastText: '#ffffff',
    },

    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
      contrastText: '#ffffff',
    },

    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
      contrastText: '#ffffff',
    },

    info: {
      main: '#10aede',
      light: '#00a1db',
      dark: '#3d98cc',
      contrastText: '#ffffff',
    },
  },

  // ==================== TYPOGRAPHY ====================
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',

    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
      color: '#e8f4fd',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      color: '#e8f4fd',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
      color: '#e8f4fd',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#e8f4fd',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.4,
      color: '#e8f4fd',
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.4,
      color: '#e8f4fd',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      color: '#e8f4fd',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
      color: 'rgba(232, 244, 253, 0.7)',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.66,
      color: 'rgba(232, 244, 253, 0.5)',
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 2.66,
      textTransform: 'uppercase',
      color: 'rgba(232, 244, 253, 0.7)',
    },
  },

  // ==================== SPACING ====================
  // Base: 8px (Material UI default)
  spacing: 8,

  // ==================== SHAPE ====================
  shape: {
    borderRadius: 8,
  },

  // ==================== SHADOWS ====================
  shadows: [
    'none',
    '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22)',
    '0 19px 38px rgba(0, 0, 0, 0.30), 0 15px 12px rgba(0, 0, 0, 0.22)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
  ],

  // ==================== BREAKPOINTS ====================
  // Usando los valores por defecto de Material UI:
  // xs: 0px, sm: 600px, md: 960px, lg: 1280px, xl: 1920px

  // ==================== COMPONENT OVERRIDES ====================
  components: {
    // === BUTTON ===
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          transition: 'all 0.25s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 14px rgba(16, 174, 222, 0.3)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #10aede 0%, #3d98cc 100%)',
          color: '#ffffff',
          '&:hover': {
            background: 'linear-gradient(135deg, #10aede 0%, #3d98cc 100%)',
            filter: 'brightness(1.1)',
          },
          '&:disabled': {
            background: 'rgba(16, 174, 222, 0.5)',
            color: 'rgba(232, 244, 253, 0.4)',
          },
        },
        outlined: {
          borderColor: '#10aede',
          color: '#10aede',
          '&:hover': {
            borderColor: '#10aede',
            backgroundColor: 'rgba(16, 174, 222, 0.08)',
          },
        },
        text: {
          color: '#10aede',
          '&:hover': {
            backgroundColor: 'rgba(16, 174, 222, 0.08)',
          },
        },
      },
    },

    // === PAPER ===
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
      defaultProps: {
        elevation: 2,
      },
    },

    // === CARD ===
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 12,
          transition: 'all 0.25s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
          },
        },
      },
    },

    // === CHIP ===
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          color: '#e8f4fd',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
          },
        },
        colorPrimary: {
          backgroundColor: '#10aede',
          color: '#ffffff',
          border: 'none',
        },
        colorSecondary: {
          backgroundColor: '#3d98cc',
          color: '#ffffff',
          border: 'none',
        },
        colorSuccess: {
          backgroundColor: '#4caf50',
          color: '#ffffff',
          border: 'none',
        },
        colorWarning: {
          backgroundColor: '#ff9800',
          color: '#ffffff',
          border: 'none',
        },
        colorError: {
          backgroundColor: '#f44336',
          color: '#ffffff',
          border: 'none',
        },
      },
    },

    // === LINEAR PROGRESS ===
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 4,
        },
        bar: {
          backgroundColor: '#10aede',
          borderRadius: 4,
        },
        colorPrimary: {
          backgroundColor: 'rgba(16, 174, 222, 0.2)',
        },
        barColorPrimary: {
          backgroundColor: '#10aede',
        },
      },
    },

    // === CIRCULAR PROGRESS ===
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#10aede',
        },
      },
    },

    // === TEXT FIELD ===
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.12)',
            },
            '&:hover fieldset': {
              borderColor: '#10aede',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#10aede',
              borderWidth: 2,
            },
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(232, 244, 253, 0.7)',
            '&.Mui-focused': {
              color: '#10aede',
            },
          },
        },
      },
    },

    // === TABS ===
    MuiTab: {
      styleOverrides: {
        root: {
          color: 'rgba(232, 244, 253, 0.7)',
          textTransform: 'none',
          fontWeight: 500,
          '&.Mui-selected': {
            color: '#10aede',
          },
          '&:hover': {
            color: '#10aede',
            backgroundColor: 'rgba(16, 174, 222, 0.08)',
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#10aede',
          height: 3,
        },
      },
    },

    // === APPBAR ===
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        },
      },
    },

    // === DRAWER ===
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRight: '1px solid rgba(255, 255, 255, 0.12)',
        },
      },
    },

    // === DIALOG ===
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 12,
        },
      },
    },

    // === SWITCH ===
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          color: 'rgba(255, 255, 255, 0.3)',
          '&.Mui-checked': {
            color: '#10aede',
            '& + .MuiSwitch-track': {
              backgroundColor: '#10aede',
              opacity: 0.5,
            },
          },
        },
        track: {
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          opacity: 0.38,
        },
      },
    },

    // === SLIDER ===
    MuiSlider: {
      styleOverrides: {
        root: {
          color: '#10aede',
        },
        thumb: {
          '&:hover': {
            boxShadow: '0 4px 14px rgba(16, 174, 222, 0.3)',
          },
        },
      },
    },
  },
});

export default theme;
