import { createTheme, alpha } from '@mui/material/styles';

export const teachingModuleTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0288d1',        // Azul profesional
      light: '#03a9f4',       // Azul claro
      dark: '#01579b',        // Azul oscuro
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#00acc1',        // Cyan para énfasis secundario
      light: '#26c6da',       // Cyan claro
      dark: '#00838f',        // Cyan oscuro
      contrastText: '#ffffff',
    },
    teaching: {
      paperBg: alpha('#BBECFC', 0.05),  // Fondo suave azul para papers
      accent: '#BBECFC',                 // Color de acento
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
    success: {
      main: '#4caf50',
    },
    warning: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
    info: {
      main: '#2196f3',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
        filledPrimary: {
          backgroundColor: '#0288d1',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#01579b',
          },
        },
        filledSecondary: {
          backgroundColor: '#00acc1',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#00838f',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});
