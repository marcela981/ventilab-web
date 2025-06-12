import { createTheme } from '@mui/material/styles';

// Colores extraídos del diseño Figma
const colors = {
  primary: {
    main: '#B22222',      // Rojo principal
    dark: '#5B0002',      // Rojo oscuro
    light: '#DC3545',     // Rojo claro para hover
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#601410',      // Rojo muy oscuro para iconos
    light: '#79747E',     // Gris para elementos secundarios
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#FFFAFA',   // Fondo principal
    paper: '#F7F1F1',     // Fondo de tarjetas
  },
  text: {
    primary: '#1E1E1E',   // Texto principal
    secondary: '#A0A0A0', // Texto placeholder/secundario
  },
  grey: {
    100: '#F7F1F1',
    200: '#EAE5E5',       // Fondo de inputs
    300: '#D0CFCF',       // Bordes
    400: '#A0A0A0',       // Texto secundario
    500: '#79747E',       // Iconos outline
  },
  success: {
    main: '#4CAF50',
    light: '#81C784',
  },
  warning: {
    main: '#FF9800',
    light: '#FFB74D',
  },
  error: {
    main: '#f44336',
    light: '#e57373',
  },
};

// Gradientes del diseño
const gradients = {
  primary: 'linear-gradient(90deg, #B22222 0%, #5B0002 100%)',
  header: 'linear-gradient(90deg, #B22222 0%, #5B0002 100%)',
};

// Sombras personalizadas del diseño Figma
const shadows = {
  card: '2px 3px 8px 1px rgba(0, 0, 0, 0.25)',
  input: 'inset 3px 6px 10px 2px rgba(0, 0, 0, 0.25)',
  button: '2px 3px 8px 1px rgba(0, 0, 0, 0.25)',
  icon: '3px 6px 10px rgba(0, 0, 0, 0.24)',
  text: '2px 4px 8px rgba(0, 0, 0, 0.25)',
  step: 'inset 3px 6px 8px 10px rgba(0, 0, 0, 0.25)',
};

const theme = createTheme({
  palette: {
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    text: colors.text,
    grey: colors.grey,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
  },
  
  // Propiedades custom integradas directamente
  custom: {
    gradients,
    shadows,
  },
  
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '4rem',        // 64px - Título principal
      fontWeight: 700,
      lineHeight: 1.42,
      color: colors.text.primary,
    },
    h2: {
      fontSize: '2rem',        // 32px - Subtítulos
      fontWeight: 500,
      lineHeight: 1.41,
      color: colors.text.primary,
    },
    h3: {
      fontSize: '1.5rem',      // 24px - Secciones
      fontWeight: 400,
      lineHeight: 1.42,
      color: colors.primary.main,
    },
    h4: {
      fontSize: '1.25rem',     // 20px - Labels principales
      fontWeight: 300,
      lineHeight: 1.4,
      color: colors.text.primary,
    },
    body1: {
      fontSize: '1rem',        // 16px - Texto general
      fontWeight: 400,
      lineHeight: 1.44,
      color: colors.text.primary,
    },
    body2: {
      fontSize: '0.875rem',    // 14px - Texto secundario
      fontWeight: 300,
      lineHeight: 1.43,
      color: colors.text.secondary,
    },
    caption: {
      fontSize: '0.75rem',     // 12px - Ayudas/hints
      fontWeight: 300,
      lineHeight: 1.33,
      color: colors.text.secondary,
    },
  },

  components: {
    // Tarjetas del sistema
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: colors.background.paper,
          borderRadius: 25,
          boxShadow: 'none',
          border: 'none',
        },
      },
    },

    // Campos de entrada personalizados
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: colors.grey[200],
            borderRadius: 15,
            border: `1px solid ${colors.grey[300]}`,
            boxShadow: shadows.input,
            '& fieldset': {
              border: 'none',
            },
            '&:hover fieldset': {
              border: 'none',
            },
            '&.Mui-focused fieldset': {
              border: `2px solid ${colors.primary.main}`,
              boxShadow: `0 0 0 1px ${colors.primary.light}`,
            },
          },
          '& .MuiInputLabel-root': {
            color: colors.text.primary,
            fontWeight: 300,
            fontSize: '1.25rem',
            '&.Mui-focused': {
              color: colors.primary.main,
            },
          },
          '& .MuiOutlinedInput-input': {
            color: colors.text.primary,
            fontSize: '1.25rem',
            fontWeight: 300,
            '&::placeholder': {
              color: colors.text.secondary,
              opacity: 1,
            },
          },
        },
      },
    },

    // Select desplegables
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: colors.grey[200],
          borderRadius: 15,
          boxShadow: shadows.input,
          '& .MuiOutlinedInput-notchedOutline': {
            border: `1px solid ${colors.grey[300]}`,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            border: `1px solid ${colors.primary.light}`,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            border: `2px solid ${colors.primary.main}`,
          },
        },
        icon: {
          color: colors.grey[500],
          filter: `drop-shadow(${shadows.icon})`,
        },
      },
    },

    // Botones del sistema
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 15,
          textTransform: 'none',
          fontSize: '1rem',
          fontWeight: 400,
          padding: '12px 24px',
          boxShadow: shadows.button,
          '&:hover': {
            boxShadow: '2px 4px 12px 2px rgba(0, 0, 0, 0.3)',
          },
        },
        contained: {
          background: gradients.primary,
          color: colors.primary.contrastText,
          '&:hover': {
            background: `linear-gradient(90deg, ${colors.primary.light} 0%, ${colors.primary.main} 100%)`,
          },
          '&:disabled': {
            backgroundColor: colors.grey[200],
            color: colors.text.secondary,
          },
        },
        outlined: {
          backgroundColor: colors.grey[200],
          border: `1px solid ${colors.grey[300]}`,
          color: colors.text.secondary,
          '&:hover': {
            backgroundColor: colors.grey[100],
            border: `1px solid ${colors.primary.main}`,
            color: colors.primary.main,
          },
        },
      },
    },

    // Chips para categorías
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: colors.background.paper,
          color: colors.primary.main,
          fontWeight: 400,
          fontSize: '1.5rem',
          border: `1px solid ${colors.primary.main}`,
          '&:hover': {
            backgroundColor: colors.primary.main,
            color: colors.primary.contrastText,
          },
        },
      },
    },

    // Iconos del sistema
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          filter: `drop-shadow(${shadows.icon})`,
        },
      },
    },

    // Contenedor principal
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: 24,
          paddingRight: 24,
        },
      },
    },

    // Grid system
    MuiGrid: {
      styleOverrides: {
        root: {
          '&.section-spacing': {
            marginBottom: 32,
          },
        },
      },
    },
  },

  // Breakpoints para responsive
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1440, // Ancho del diseño Figma
    },
  },

  // Espaciado consistente
  spacing: 8,

  // Z-index para layers
  zIndex: {
    drawer: 1200,
    appBar: 1100,
    modal: 1300,
  },
});

// Extensiones personalizadas del tema
declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      gradients: typeof gradients;
      shadows: typeof shadows;
    };
  }
  interface ThemeOptions {
    custom?: {
      gradients?: typeof gradients;
      shadows?: typeof shadows;
    };
  }
}

export default theme;