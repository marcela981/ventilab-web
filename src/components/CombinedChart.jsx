import React, { useMemo, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  Paper,
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
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RefreshIcon from '@mui/icons-material/Refresh';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

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

const CombinedChart = ({ data, isConnected = true }) => {
  const chartRef = useRef(null);
  const [isPaused, setIsPaused] = React.useState(false);
  const [autoScroll, setAutoScroll] = React.useState(true);
  const [visibleSeries, setVisibleSeries] = React.useState({
    pressure: true,
    flow: true,
    volume: true,
  });

  // Configuración de las series
  const seriesConfig = {
    pressure: {
      label: 'Presión',
      unit: 'cmH₂O',
      color: '#00c5da',
      backgroundColor: 'rgba(0, 197, 218, 0.1)',
      borderColor: '#00c5da',
      yAxisID: 'y-pressure',
      tension: 0.4,
      thresholds: { warning: 35, danger: 45 },
    },
    flow: {
      label: 'Flujo',
      unit: 'L/min',
      color: '#da0037',
      backgroundColor: 'rgba(218, 0, 55, 0.1)',
      borderColor: '#da0037',
      yAxisID: 'y-flow',
      tension: 0.4,
      thresholds: { warning: 80, danger: 120 },
    },
    volume: {
      label: 'Volumen',
      unit: 'mL',
      color: '#4caf50',
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
      borderColor: '#4caf50',
      yAxisID: 'y-volume',
      tension: 0.4,
      thresholds: { warning: 800, danger: 1200 },
    },
  };

  // Procesar datos para la gráfica
  const processedData = useMemo(() => {
    if (!data || !data.pressure || !Array.isArray(data.pressure)) {
      return { labels: [], datasets: [] };
    }

    // Limitar a los últimos 100 puntos
    const maxPoints = 100;
    const recentData = {
      pressure: data.pressure.slice(-maxPoints),
      flow: data.flow ? data.flow.slice(-maxPoints) : [],
      volume: data.volume ? data.volume.slice(-maxPoints) : [],
      time: data.time ? data.time.slice(-maxPoints) : [],
    };

    // Crear etiquetas de tiempo simples
    const labels = recentData.time.length > 0
      ? recentData.time.map(time => new Date(time).toLocaleTimeString())
      : recentData.pressure.map((_, index) => `${index}s`);

    const datasets = [];

    // Agregar series visibles
    Object.entries(seriesConfig).forEach(([key, config]) => {
      if (visibleSeries[key] && recentData[key] && recentData[key].length > 0) {
        datasets.push({
          label: `${config.label} (${config.unit})`,
          data: recentData[key],
          borderColor: config.borderColor,
          backgroundColor: config.backgroundColor,
          fill: false,
          tension: config.tension,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: config.color,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          borderWidth: 2,
          yAxisID: config.yAxisID,
          // Detectar valores anómalos
          pointBackgroundColor: recentData[key].map(value => {
            if (value >= config.thresholds.danger) return '#f44336';
            if (value >= config.thresholds.warning) return '#ff9800';
            return config.color;
          }),
          pointBorderColor: recentData[key].map(value => {
            if (value >= config.thresholds.warning) return config.color;
            return 'transparent';
          }),
          pointRadius: recentData[key].map(value => 
            value >= config.thresholds.warning ? 3 : 0
          ),
        });
      }
    });

    return { labels, datasets };
  }, [data, visibleSeries]);

  // Opciones para la gráfica
  const chartOptions = useMemo(() => ({
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
          filter: (legendItem) => {
            return visibleSeries[legendItem.text.split(' ')[0].toLowerCase()] !== false;
          },
        },
      },
      tooltip: {
        mode: 'nearest',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#de0b24',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: (context) => {
            if (context && context[0] && context[0].label) {
              return context[0].label;
            }
            return '';
          },
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`;
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
      'y-pressure': {
        type: 'linear',
        display: visibleSeries.pressure,
        position: 'left',
        min: 0,
        max: 50,
        ticks: {
          stepSize: 10,
          color: '#00c5da',
          callback: (value) => `${value} cmH₂O`,
        },
        grid: {
          color: 'rgba(0, 197, 218, 0.2)',
        },
        border: {
          color: '#00c5da',
        },
      },
      'y-flow': {
        type: 'linear',
        display: visibleSeries.flow,
        position: 'right',
        min: -20,
        max: 100,
        ticks: {
          stepSize: 20,
          color: '#da0037',
          callback: (value) => `${value} L/min`,
        },
        grid: {
          color: 'rgba(218, 0, 55, 0.2)',
        },
        border: {
          color: '#da0037',
        },
      },
      'y-volume': {
        type: 'linear',
        display: visibleSeries.volume,
        position: 'right',
        min: 0,
        max: 1000,
        ticks: {
          stepSize: 200,
          color: '#4caf50',
          callback: (value) => `${value} mL`,
        },
        grid: {
          color: 'rgba(76, 175, 80, 0.2)',
        },
        border: {
          color: '#4caf50',
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
  }), [visibleSeries, isPaused]);

  // Funciones de control
  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const toggleAutoScroll = () => {
    setAutoScroll(!autoScroll);
  };

  const toggleSeries = (seriesKey) => {
    setVisibleSeries(prev => ({
      ...prev,
      [seriesKey]: !prev[seriesKey],
    }));
  };

  // Calcular estadísticas combinadas
  const statistics = useMemo(() => {
    const stats = {};
    
    Object.entries(seriesConfig).forEach(([key, config]) => {
      if (data && data[key] && Array.isArray(data[key])) {
        const values = data[key];
        const current = values[values.length - 1] || 0;
        const max = Math.max(...values) || 0;
        const min = Math.min(...values) || 0;
        const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

        stats[key] = {
          current: current.toFixed(1),
          max: max.toFixed(1),
          min: min.toFixed(1),
          avg: avg.toFixed(1),
          status: current >= config.thresholds.danger ? 'error' : 
                  current >= config.thresholds.warning ? 'warning' : 'success',
        };
      }
    });

    return stats;
  }, [data]);

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
      <Typography variant="h6" sx={{ mb: 2, color: '#fff', fontWeight: 600 }}>
        Monitoreo Combinado en Tiempo Real
      </Typography>
      
      <Box sx={{ height: 400, width: '100%', position: 'relative' }}>
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

        {/* Controles de visibilidad de series */}
        <Box sx={{ 
          position: 'absolute', 
          top: 8, 
          left: 8, 
          zIndex: 10,
          display: 'flex',
          gap: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: 1,
          padding: 0.5,
        }}>
          {Object.entries(seriesConfig).map(([key, config]) => (
            <Tooltip key={key} title={`${visibleSeries[key] ? 'Ocultar' : 'Mostrar'} ${config.label}`}>
              <IconButton 
                size="small" 
                onClick={() => toggleSeries(key)} 
                sx={{ 
                  color: visibleSeries[key] ? config.color : '#666',
                  '&:hover': { color: config.color }
                }}
              >
                {visibleSeries[key] ? <VisibilityIcon /> : <VisibilityOffIcon />}
              </IconButton>
            </Tooltip>
          ))}
        </Box>

        {/* Estadísticas en tiempo real */}
        <Box sx={{ 
          position: 'absolute', 
          bottom: 8, 
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
              color={stats.status}
              variant="filled"
              sx={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.7)', 
                color: '#fff',
                border: `1px solid ${seriesConfig[key].color}`,
              }}
            />
          ))}
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

export default CombinedChart; 