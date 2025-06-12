export const colors = {
    // Gradiente principal del fondo
    background: {
      gradient: 'linear-gradient(180deg, #5B0002 0%, rgba(48, 21, 21, 0.8) 50%, rgba(47, 46, 46, 0.5) 100%)',
      dark: '#040431',  // Fondo de gráficas
      panel: 'rgba(0, 0, 0, 0.2)',  // Paneles transparentes
    },
  
    // Colores principales de la interfaz
    primary: {
      red: '#da0037',        // Color principal rojo
      darkRed: '#852221',    // Rojo oscuro para elementos activos
      orange: '#5B0002',     // Rojo-naranja del gradiente
    },
  
    // Colores de texto
    text: {
      primary: '#FFFFFF',    // Texto principal blanco
      secondary: '#FFFAFA',  // Texto ligeramente off-white
      muted: '#A0A0A0',      // Texto deshabilitado
    },
  
    // Colores de controles
    controls: {
      background: 'rgba(30, 30, 30, 0.2)',
      border: 'rgba(23, 21, 21, 0.5)',
      shadow: 'inset 0px 4px 4px rgba(0, 0, 0, 0.25)',
    },
  
    // Colores para gráficas (del Python)
    charts: {
      pressure: '#da0037',     // Rojo para presión
      flow: '#00c5da',         // Cyan para flujo
      volume: '#6eda00',       // Verde para volumen
      yellow: '#ffff00',       // Amarillo para bucles
      green: '#00ff00',        // Verde claro
    },
  
    // Estados
    states: {
      error: '#F9DEDC',
      warning: '#852221',
      success: '#6eda00',
    }
  };
  
  // Función helper para aplicar transparencia
  export const withOpacity = (color, opacity) => {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  };
  
  export default colors;