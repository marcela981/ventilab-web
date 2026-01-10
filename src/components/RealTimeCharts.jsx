import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { chartTheme, getChartColor } from '../styles/chart-theme';
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
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RefreshIcon from '@mui/icons-material/Refresh';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

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
  Decimation
);

const RealTimeCharts = ({ data, type, isConnected = true }) => {
  const chartRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // Configuración de colores y estilos para cada tipo de gráfica
  const chartConfigs = {
    pressure: {
      label: 'Presión',
      unit: 'cmH₂O',
      color: chartTheme.colors.primary,
      backgroundColor: 'rgba(16, 174, 222, 0.1)',
      borderColor: chartTheme.colors.primary,
      fillColor: 'rgba(0, 197, 218, 0.05)',
      yAxis: {
        min: 0,
        max: 50, 
        ticks: {
          stepSize: 10,
        },
      },
      thresholds: {
        warning: 35,
        danger: 45,
      },
    },
    flow: {
      label: 'Flujo',
      unit: 'L/min',
      color: chartTheme.colors.secondary,
      backgroundColor: 'rgba(61, 152, 204, 0.1)',
      borderColor: chartTheme.colors.secondary,
      fillColor: 'rgba(218, 0, 55, 0.05)',
      yAxis: {
        min: -20,
        max: 100,
        ticks: {
          stepSize: 20,
        },
      },
      thresholds: {
        warning: 80,
        danger: 120,
      },
    },
    volume: {
      label: 'Volumen',
      unit: 'mL',
      color: '#6eda00', 
      backgroundColor: 'rgba(110, 218, 0, 0.1)',
      borderColor: '#6eda00',
      fillColor: 'rgba(76, 175, 80, 0.05)',
      yAxis: {
        min: 0,
        max: 1000,
        ticks: {
          stepSize: 200,
        },
      },
      thresholds: {
        warning: 800,
        danger: 1200,
      },
    },
  };

  // Obtener configuración según el tipo
  const config = chartConfigs[type] || chartConfigs.pressure;

  // Procesar datos para la gráfica
  const processedData = useMemo(() => {
    if (!data || !data[type] || !Array.isArray(data[type])) {
      return {
        labels: [],
        datasets: [],
      };
    }

    // Limitar a los últimos 100 puntos para mejor rendimiento
    const recentData = data[type].slice(-100);
    const timeLabels = data.time ? data.time.slice(-100) : [];

    // Crear etiquetas de tiempo simples
    const labels = timeLabels.length > 0 
      ? timeLabels.map(time => new Date(time).toLocaleTimeString())
      : recentData.map((_, index) => `${index}s`);

    // Detectar valores anómalos para colorear
    const getPointColor = (value) => {
      if (value >= config.thresholds.danger) return '#f44336';
      if (value >= config.thresholds.warning) return '#ff9800';
      return config.color;
    };

    // Crear datasets base
    const datasets = [
      {
        label: `${config.label} (${config.unit})`,
        data: recentData,
        borderColor: config.borderColor,
        backgroundColor: config.fillColor,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: config.color,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
        borderWidth: 2,
        pointBackgroundColor: recentData.map(value => getPointColor(value)),
        pointBorderColor: recentData.map(value => getPointColor(value)),
        pointRadius: recentData.map(value => 
          value >= config.thresholds.warning ? 3 : 0
        ),
      }
    ];

    if (type === 'pressure' && recentData.length > 0) {
      const average = recentData.reduce((a, b) => a + b, 0) / recentData.length;
      const averageData = new Array(recentData.length).fill(average);
      
      datasets.push({
        label: `Media: ${average.toFixed(1)} ${config.unit}`,
        data: averageData,
        borderColor: '#00bfff',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        borderWidth: 2,
        borderDash: [5, 5], // Línea punteada para diferenciar
      });
    }

    return {
      labels,
      datasets,
    };
  }, [data, type, config]);

  // Opciones para la gráfica
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: isPaused ? 0 : 300,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'nearest',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: config.color,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context) => {
            if (context && context[0] && context[0].label) {
              return context[0].label;
            }
            return '';
          },
          label: (context) => {
            if (context && context.parsed !== undefined) {
              return `${config.label}: ${context.parsed.y.toFixed(1)} ${config.unit}`;
            }
            return '';
          },
        },
      },
      decimation: {
        enabled: true,
        algorithm: 'min-max',
      },
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 8,
          color: '#b0b0b0',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        border: {
          color: 'rgba(255, 255, 255, 0.2)',
        },
      },
      y: {
        ...config.yAxis,
        ticks: {
          ...config.yAxis.ticks,
          color: '#b0b0b0',
          callback: (value) => `${value} ${config.unit}`,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        border: {
          color: 'rgba(255, 255, 255, 0.2)',
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    elements: {
      point: {
        hoverRadius: 6,
      },
    },
  }), [config, isPaused]);

  // Función para alternar pausa
  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // Función para alternar auto-scroll
  const toggleAutoScroll = () => {
    setAutoScroll(!autoScroll);
  };

  // Calcular estadísticas en tiempo real
  const statistics = useMemo(() => {
    if (!data || !data[type] || !Array.isArray(data[type])) {
      return { current: 0, max: 0, min: 0, avg: 0 };
    }

    const values = data[type];
    const current = values[values.length - 1] || 0;
    const max = Math.max(...values) || 0;
    const min = Math.min(...values) || 0;
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

    return {
      current: current.toFixed(1),
      max: max.toFixed(1),
      min: min.toFixed(1),
      avg: avg.toFixed(1),
    };
  }, [data, type]);

  // Determinar el estado de alerta
  const getAlertStatus = () => {
    const current = parseFloat(statistics.current);
    if (current >= config.thresholds.danger) return 'error';
    if (current >= config.thresholds.warning) return 'warning';
    return 'success';
  };

  const alertStatus = getAlertStatus();

  // Si no hay conexión, mostrar mensaje
  if (!isConnected) {
    return (
      <Box sx={{ height: 200, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="warning" sx={{ width: '100%' }}>
          No hay conexión con el ventilador. Los datos mostrados pueden no estar actualizados.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 200, width: '100%', position: 'relative' }}>
      {/* Controles de la gráfica */}
      <Box sx={{ 
        position: 'absolute', 
        top: 8, 
        right: 8, 
        zIndex: 10,
        display: 'flex',
        gap: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 1,
        padding: 0.5,
      }}>
        <Tooltip title={isPaused ? "Reanudar" : "Pausar"}>
          <IconButton size="small" onClick={togglePause} sx={{ color: '#fff' }}>
            {isPaused ? <PlayArrowIcon /> : <PauseIcon />}
          </IconButton>
        </Tooltip>
        <Tooltip title={autoScroll ? "Desactivar auto-scroll" : "Activar auto-scroll"}>
          <IconButton size="small" onClick={toggleAutoScroll} sx={{ color: autoScroll ? '#4caf50' : '#fff' }}>
            {autoScroll ? <ZoomOutIcon /> : <ZoomInIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Estadísticas en tiempo real */}
      <Box sx={{ 
        position: 'absolute', 
        top: 8, 
        left: 8, 
        zIndex: 10,
        display: 'flex',
        gap: 1,
        flexWrap: 'wrap',
      }}>
        <Chip 
          label={`Actual: ${statistics.current} ${config.unit}`}
          size="small"
          color={alertStatus}
          variant="filled"
          sx={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', color: '#fff' }}
        />
        <Chip 
          label={`Máx: ${statistics.max} ${config.unit}`}
          size="small"
          variant="outlined"
          sx={{ 
            borderColor: 'rgba(255, 255, 255, 0.3)', 
            color: '#fff',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          }}
        />
        <Chip 
          label={`Prom: ${statistics.avg} ${config.unit}`}
          size="small"
          variant="outlined"
          sx={{ 
            borderColor: 'rgba(255, 255, 255, 0.3)', 
            color: '#fff',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          }}
        />
      </Box>

      {/* Gráfica principal */}
      <Line
        ref={chartRef}
        data={processedData}
        options={chartOptions}
        redraw={isPaused}
      />

      {/* Indicador de estado de conexión */}
      <Box sx={{
        position: 'absolute',
        bottom: 8,
        left: 8,
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
  );
};

export default RealTimeCharts;
