import { createTheme } from '@mui/material/styles';

/**
 * Material UI Theme Overrides
 * Integra la nueva paleta de colores con Material UI
 */

export const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#10aede',      // Cyan brillante
      light: '#00a1db',     // Azul claro
      dark: '#3d98cc',      // Azul medio
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#3d98cc',      // Azul medio
      light: '#00a1db',     // Azul claro
      dark: '#0a112b',      // Azul oscuro profundo
      contrastText: '#ffffff',
    },
    background: {
      default: '#0a112b',   // Fondo principal
      paper: 'rgba(255, 255, 255, 0.05)', // Superficie sutil
    },
    surface: {
      main: 'rgba(255, 255, 255, 0.05)',
      elevated: 'rgba(255, 255, 255, 0.08)',
    },
    text: {
      primary: '#e8f4fd',   // Azul muy claro
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
  
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
      color: 'var(--text-primary)',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      color: 'var(--text-primary)',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
      color: 'var(--text-primary)',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: 'var(--text-primary)',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.4,
      color: 'var(--text-primary)',
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      lineHeight: 1.4,
      color: 'var(--text-primary)',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      color: 'var(--text-primary)',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
      color: 'var(--text-secondary)',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.66,
      color: 'var(--text-hint)',
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 2.66,
      textTransform: 'uppercase',
      color: 'var(--text-secondary)',
    },
  },
  
  shape: {
    borderRadius: 'var(--radius-md)',
  },
  
  spacing: 8, // Base spacing unit
  
  shadows: [
    'none',
    'var(--shadow-sm)',
    'var(--shadow-sm)',
    'var(--shadow-md)',
    'var(--shadow-md)',
    'var(--shadow-md)',
    'var(--shadow-lg)',
    'var(--shadow-lg)',
    'var(--shadow-lg)',
    'var(--shadow-lg)',
    'var(--shadow-lg)',
    'var(--shadow-lg)',
    'var(--shadow-lg)',
    'var(--shadow-lg)',
    'var(--shadow-lg)',
    'var(--shadow-lg)',
    'var(--shadow-lg)',
    'var(--shadow-lg)',
    'var(--shadow-lg)',
    'var(--shadow-lg)',
    'var(--shadow-lg)',
    'var(--shadow-lg)',
    'var(--shadow-lg)',
    'var(--shadow-lg)',
    'var(--shadow-lg)',
  ],
  
  components: {
    // === BUTTON OVERRIDES ===
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
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
    
    // === CARD OVERRIDES ===
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
          '&:hover': {
            boxShadow: '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
            transform: 'translateY(-2px)',
            transition: 'all 0.25s ease',
          },
        },
      },
    },
    
    // === PAPER OVERRIDES ===
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        },
        elevation2: {
          boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
        },
        elevation3: {
          boxShadow: '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
        },
      },
    },
    
    // === TEXT FIELD OVERRIDES ===
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.12)',
            },
            '&:hover fieldset': {
              borderColor: '#10aede',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#10aede',
              borderWidth: '2px',
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
    
    // === CHIP OVERRIDES ===
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          color: '#e8f4fd',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            filter: 'brightness(1.1)',
          },
        },
        colorPrimary: {
          backgroundColor: '#10aede',
          color: '#ffffff',
        },
        colorSecondary: {
          backgroundColor: '#3d98cc',
          color: '#ffffff',
        },
      },
    },
    
    // === APPBAR OVERRIDES ===
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        },
      },
    },
    
    // === DRAWER OVERRIDES ===
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRight: '1px solid rgba(255, 255, 255, 0.12)',
        },
      },
    },
    
    // === DIALOG OVERRIDES ===
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
        },
        backdrop: {
          backgroundColor: 'rgba(10, 17, 43, 0.95)',
        },
      },
    },
    
    // === TAB OVERRIDES ===
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
        },
      },
    },
    
    // === SWITCH OVERRIDES ===
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          color: 'rgba(255, 255, 255, 0.12)',
          '&.Mui-checked': {
            color: '#10aede',
            '& + .MuiSwitch-track': {
              backgroundColor: '#10aede',
            },
          },
        },
        track: {
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
        },
      },
    },
    
    // === SLIDER OVERRIDES ===
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
    
    // === PROGRESS OVERRIDES ===
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
        },
        bar: {
          backgroundColor: '#10aede',
        },
      },
    },
    
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#10aede',
        },
      },
    },
  },
});

export default muiTheme;
