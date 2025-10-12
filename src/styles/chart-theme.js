/**
 * Chart.js Theme Configuration
 * Configuración de colores para gráficas usando la nueva paleta
 */

export const chartTheme = {
  // Colores principales de la paleta
  colors: {
    primary: '#10aede',      // Cyan brillante
    secondary: '#3d98cc',    // Azul medio
    accent: '#00a1db',       // Azul claro
    success: '#4caf50',      // Verde éxito
    warning: '#ff9800',      // Naranja advertencia
    error: '#f44336',        // Rojo error
    info: '#10aede',         // Info usa primario
  },

  // Gradientes para gráficas
  gradients: {
    primary: 'linear-gradient(135deg, #10aede 0%, #3d98cc 100%)',
    secondary: 'linear-gradient(135deg, #3d98cc 0%, #00a1db 100%)',
    accent: 'linear-gradient(135deg, #00a1db 0%, #10aede 100%)',
    success: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
    warning: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
    error: 'linear-gradient(135deg, #f44336 0%, #e57373 100%)',
  },

  // Configuración de Chart.js
  chartConfig: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#e8f4fd',        // Texto principal
          font: {
            family: 'Roboto, sans-serif',
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#0a112b',     // Fondo principal
        bodyColor: '#0a112b',
        borderColor: '#10aede',
        borderWidth: 1,
        cornerRadius: 8,
        titleFont: {
          family: 'Roboto, sans-serif',
          size: 13,
          weight: 'bold',
        },
        bodyFont: {
          family: 'Roboto, sans-serif',
          size: 12,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.08)',  // Divisor
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(232, 244, 253, 0.7)',   // Texto secundario
          font: {
            family: 'Roboto, sans-serif',
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.08)',  // Divisor
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(232, 244, 253, 0.7)',   // Texto secundario
          font: {
            family: 'Roboto, sans-serif',
            size: 11,
          },
        },
      },
    },
  },

  // Paletas de colores para diferentes tipos de gráficas
  palettes: {
    // Para gráficas de líneas múltiples
    line: [
      '#10aede',  // Primario
      '#3d98cc',  // Secundario
      '#00a1db',  // Acento
      '#4caf50',  // Éxito
      '#ff9800',  // Advertencia
      '#f44336',  // Error
      '#9c27b0',  // Púrpura
      '#ff5722',  // Rojo naranja
      '#607d8b',  // Azul gris
      '#795548',  // Marrón
    ],

    // Para gráficas de barras
    bar: [
      '#10aede',
      '#3d98cc',
      '#00a1db',
      '#4caf50',
      '#ff9800',
      '#f44336',
    ],

    // Para gráficas de pie/donut
    pie: [
      '#10aede',
      '#3d98cc',
      '#00a1db',
      '#4caf50',
      '#ff9800',
      '#f44336',
      '#9c27b0',
      '#ff5722',
    ],

    // Para gráficas de área
    area: [
      'rgba(16, 174, 222, 0.8)',   // Primario con transparencia
      'rgba(61, 152, 204, 0.8)',   // Secundario con transparencia
      'rgba(0, 161, 219, 0.8)',    // Acento con transparencia
      'rgba(76, 175, 80, 0.8)',    // Éxito con transparencia
    ],
  },

  // Configuraciones específicas para diferentes tipos de gráficas
  chartTypes: {
    line: {
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.4,
      fill: false,
    },
    bar: {
      borderWidth: 0,
      borderRadius: 4,
      borderSkipped: false,
    },
    pie: {
      borderWidth: 2,
      borderColor: '#0a112b',
    },
    doughnut: {
      borderWidth: 2,
      borderColor: '#0a112b',
      cutout: '50%',
    },
    area: {
      borderWidth: 2,
      fill: true,
      tension: 0.4,
    },
  },
};

// Función helper para crear datasets con la paleta
export const createDataset = (type, data, label, options = {}) => {
  const baseConfig = chartTheme.chartTypes[type] || {};
  const palette = chartTheme.palettes[type] || chartTheme.palettes.line;
  
  return {
    label,
    data,
    ...baseConfig,
    ...options,
  };
};

// Función helper para obtener colores de la paleta
export const getChartColor = (palette = 'line', index = 0) => {
  return chartTheme.palettes[palette][index % chartTheme.palettes[palette].length];
};

// Función helper para crear gradientes en Chart.js
export const createGradient = (ctx, color1, color2, direction = 'vertical') => {
  const gradient = direction === 'vertical' 
    ? ctx.createLinearGradient(0, 0, 0, 400)
    : ctx.createLinearGradient(0, 0, 400, 0);
  
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  
  return gradient;
};

export default chartTheme;
