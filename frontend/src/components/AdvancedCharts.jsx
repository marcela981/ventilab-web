import React, { useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
  TimeScale,
  Decimation,
  RadialLinearScale,
  ArcElement,
  BarElement
} from 'chart.js';
import { 
  Line, 
  Bar, 
  Radar, 
  Doughnut 
} from 'react-chartjs-2';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import RadarIcon from '@mui/icons-material/Radar';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
  TimeScale,
  Decimation,
  RadialLinearScale,
  ArcElement,
  BarElement
);

const AdvancedCharts = ({ data, type = 'line', isConnected = true }) => {
  const chartRef = useRef(null);
  const [chartType, setChartType] = React.useState(type);
  const [isPaused, setIsPaused] = React.useState(false);

  // Configuración de las series
  const seriesConfig = {
    pressure: {
      label: 'Presión',
      unit: 'cmH₂O',
      color: '#00c5da',
      backgroundColor: 'rgba(0, 197, 218, 0.2)',
      borderColor: '#00c5da',
    },
    flow: {
      label: 'Flujo',
      unit: 'L/min',
      color: '#da0037',
      backgroundColor: 'rgba(218, 0, 55, 0.2)',
      borderColor: '#da0037',
    },
    volume: {
      label: 'Volumen',
      unit: 'mL',
      color: '#4caf50',
      backgroundColor: 'rgba(76, 175, 80, 0.2)',
      borderColor: '#4caf50',
    },
  };

  // Procesar datos según el tipo de gráfica
  const processedData = useMemo(() => {
    if (!data || !data.pressure || !Array.isArray(data.pressure)) {
      return { labels: [], datasets: [] };
    }

    const maxPoints = chartType === 'line' ? 100 : 20;
    const recentData = {
      pressure: data.pressure.slice(-maxPoints),
      flow: data.flow ? data.flow.slice(-maxPoints) : [],
      volume: data.volume ? data.volume.slice(-maxPoints) : [],
      time: data.time ? data.time.slice(-maxPoints) : [],
    };

    if (chartType === 'line') {
      // Gráfica de líneas - tiempo real
      const labels = recentData.time.length > 0
        ? recentData.time.map(time => new Date(time).toLocaleTimeString())
        : recentData.pressure.map((_, index) => `${index}s`);

      const datasets = Object.entries(seriesConfig).map(([key, config]) => ({
        label: `${config.label} (${config.unit})`,
        data: recentData[key] || [],
        borderColor: config.borderColor,
        backgroundColor: config.backgroundColor,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        borderWidth: 2,
      }));

      return { labels, datasets };
    } else if (chartType === 'bar') {
      // Gráfica de barras - valores promedio
      const avgData = Object.entries(seriesConfig).map(([key, config]) => {
        const values = recentData[key] || [];
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      });

      return {
        labels: Object.values(seriesConfig).map(config => config.label),
        datasets: [{
          label: 'Valores Promedio',
          data: avgData,
          backgroundColor: Object.values(seriesConfig).map(config => config.backgroundColor),
          borderColor: Object.values(seriesConfig).map(config => config.borderColor),
          borderWidth: 2,
        }],
      };
    } else if (chartType === 'radar') {
      // Gráfica radar - valores actuales normalizados
      const currentData = Object.entries(seriesConfig).map(([key, config]) => {
        const values = recentData[key] || [];
        const current = values[values.length - 1] || 0;
        // Normalizar a escala 0-100
        const maxValues = { pressure: 50, flow: 100, volume: 1000 };
        return (current / maxValues[key]) * 100;
      });

      return {
        labels: Object.values(seriesConfig).map(config => config.label),
        datasets: [{
          label: 'Valores Actuales (%)',
          data: currentData,
          backgroundColor: 'rgba(222, 11, 36, 0.2)',
          borderColor: '#de0b24',
          borderWidth: 2,
          pointBackgroundColor: '#de0b24',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#de0b24',
        }],
      };
    } else if (chartType === 'doughnut') {
      // Gráfica de dona - distribución de valores
      const avgData = Object.entries(seriesConfig).map(([key, config]) => {
        const values = recentData[key] || [];
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      });

      return {
        labels: Object.values(seriesConfig).map(config => config.label),
        datasets: [{
          label: 'Distribución',
          data: avgData,
          backgroundColor: Object.values(seriesConfig).map(config => config.backgroundColor),
          borderColor: Object.values(seriesConfig).map(config => config.borderColor),
          borderWidth: 2,
          hoverOffset: 4,
        }],
      };
    }

    return { labels: [], datasets: [] };
  }, [data, chartType]);

  // Opciones específicas por tipo de gráfica
  const chartOptions = useMemo(() => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: isPaused ? 0 : 300,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#fff',
            usePointStyle: true,
            padding: 20,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#de0b24',
          borderWidth: 1,
          cornerRadius: 8,
        },
      },
    };

    if (chartType === 'line') {
      return {
        ...baseOptions,
        scales: {
          x: {
            ticks: { color: '#b0b0b0', maxTicksLimit: 8 },
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            border: { color: 'rgba(255, 255, 255, 0.2)' }
          },
          y: {
            ticks: { color: '#b0b0b0' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            border: { color: 'rgba(255, 255, 255, 0.2)' }
          }
        },
        interaction: {
          intersect: false,
          mode: 'nearest'
        }
      };
    } else if (chartType === 'bar') {
      return {
        ...baseOptions,
        scales: {
          x: {
            ticks: { color: '#b0b0b0' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            border: { color: 'rgba(255, 255, 255, 0.2)' }
          },
          y: {
            ticks: { color: '#b0b0b0' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' },
            border: { color: 'rgba(255, 255, 255, 0.2)' }
          }
        }
      };
    } else if (chartType === 'radar') {
      return {
        ...baseOptions,
        scales: {
          r: {
            angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
            grid: { color: 'rgba(255, 255, 255, 0.2)' },
            pointLabels: { color: '#fff' },
            ticks: { color: '#b0b0b0', backdropColor: 'transparent' }
          }
        }
      };
    } else if (chartType === 'doughnut') {
      return {
        ...baseOptions,
        cutout: '60%',
      };
    }

    return baseOptions;
  }, [chartType, isPaused]);

  // Funciones de control
  const handleChartTypeChange = (event, newType) => {
    if (newType !== null) {
      setChartType(newType);
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // Calcular estadísticas
  const statistics = useMemo(() => {
    const stats = {};
    
    Object.entries(seriesConfig).forEach(([key, config]) => {
      if (data && data[key] && Array.isArray(data[key])) {
        const values = data[key];
        const current = values[values.length - 1] || 0;
        const max = Math.max(...values) || 0;
        const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

        stats[key] = {
          current: current.toFixed(1),
          max: max.toFixed(1),
          avg: avg.toFixed(1),
        };
      }
    });

    return stats;
  }, [data]);

  // Renderizar el componente de gráfica apropiado
  const renderChart = () => {
    const props = {
      ref: chartRef,
      data: processedData,
      options: chartOptions,
      redraw: isPaused
    };

    switch (chartType) {
      case 'line':
        return <Line {...props} />;
      case 'bar':
        return <Bar {...props} />;
      case 'radar':
        return <Radar {...props} />;
      case 'doughnut':
        return <Doughnut {...props} />;
      default:
        return <Line {...props} />;
    }
  };

  if (!isConnected) {
    return (
      <Box sx={{ height: 400, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="warning" sx={{ width: '100%' }}>
          No hay conexión con el ventilador. Los datos mostrados pueden no estar actualizados.
        </Alert>
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2, backgroundColor: 'rgba(31, 31, 31, 0.2)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
          Gráficas Avanzadas
        </Typography>
        
        {/* Selector de tipo de gráfica */}
        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={handleChartTypeChange}
          aria-label="chart type"
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              color: '#fff',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              '&.Mui-selected': {
                backgroundColor: '#de0b24',
                color: '#fff',
              },
            },
          }}
        >
          <ToggleButton value="line" aria-label="line chart">
            <Tooltip title="Gráfica de líneas">
              <ShowChartIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="bar" aria-label="bar chart">
            <Tooltip title="Gráfica de barras">
              <BarChartIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="radar" aria-label="radar chart">
            <Tooltip title="Gráfica radar">
              <RadarIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="doughnut" aria-label="doughnut chart">
            <Tooltip title="Gráfica de dona">
              <DonutLargeIcon />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      <Box sx={{ height: 250, width: '100%', position: 'relative' }}>
        {/* Estadísticas */}
        <Box sx={{ 
          position: 'absolute', 
          top: 8, 
          left: 8, 
          zIndex: 10,
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap',
        }}>
          {Object.entries(statistics).map(([key, stats]) => (
            <Chip 
              key={key}
              label={`${seriesConfig[key].label}: ${stats.current} ${seriesConfig[key].unit}`}
              size="small"
              variant="outlined"
              sx={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.7)', 
                color: '#fff',
                borderColor: seriesConfig[key].color,
              }}
            />
          ))}
        </Box>

        {/* Gráfica principal */}
        {renderChart()}

        {/* Indicador de estado de conexión */}
        <Box sx={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: isConnected ? '#4caf50' : '#f44336',
          animation: isConnected ? 'pulse 2s infinite' : 'none',
          '@keyframes pulse': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.5 },
            '100%': { opacity: 1 },
          },
        }} />
      </Box>
    </Paper>
  );
};

export default AdvancedCharts; 