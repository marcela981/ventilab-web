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
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RefreshIcon from '@mui/icons-material/Refresh';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

const LoopCharts = ({ data, type, isConnected = true }) => {
  const chartRef = useRef(null);
  const [isPaused, setIsPaused] = React.useState(false);

  // Configuración según el tipo de bucle cerrado
  const chartConfigs = {
    'volume-pressure': {
      title: 'Bucle Volumen vs Presión',
      xLabel: 'Volumen (mL)',
      yLabel: 'Presión (cmH₂O)',
      xKey: 'volume',
      yKey: 'pressure',
      color: '#ffff00',
      backgroundColor: 'rgba(255, 255, 0, 0.1)',
      xAxis: { min: 0, max: 1000, ticks: { stepSize: 200 } },
      yAxis: { min: 0, max: 50, ticks: { stepSize: 10 } },
    },
    'flow-volume': {
      title: 'Bucle Flujo vs Volumen',
      xLabel: 'Volumen (mL)',
      yLabel: 'Flujo (L/min)',
      xKey: 'volume',
      yKey: 'flow',
      color: '#00ff00',
      backgroundColor: 'rgba(0, 255, 0, 0.1)',
      xAxis: { min: 0, max: 1000, ticks: { stepSize: 200 } },
      yAxis: { min: -20, max: 100, ticks: { stepSize: 20 } },
    },
  };

  const config = chartConfigs[type] || chartConfigs['volume-pressure'];

  const processedData = useMemo(() => {
    if (!data || !data[config.xKey] || !data[config.yKey] || 
        !Array.isArray(data[config.xKey]) || !Array.isArray(data[config.yKey])) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const totalPoints = data[config.xKey].length;
    const startIndex = Math.max(0, totalPoints - 150);
    
    const xData = data[config.xKey].slice(startIndex);
    const yData = data[config.yKey].slice(startIndex, startIndex + xData.length);

    // Verificar que ambos arrays tengan la misma longitud
    const minLength = Math.min(xData.length, yData.length);
    const finalXData = xData.slice(0, minLength);
    const finalYData = yData.slice(0, minLength);

    // Crear puntos para el bucle cerrado
    const loopData = finalXData.map((x, index) => ({
      x: x,
      y: finalYData[index]
    }));

    return {
      datasets: [{
        label: config.title,
        data: loopData,
        borderColor: config.color,
        backgroundColor: config.backgroundColor,
        fill: false,
        tension: 0.1,
        pointRadius: 1,
        pointHoverRadius: 4,
        borderWidth: 2,
        showLine: true,
      }],
    };
  }, [data, config, isPaused]);

  // Opciones para la gráfica de bucle cerrado
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: isPaused ? 0 : 200,
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
          title: () => config.title,
          label: (context) => {
            if (context && context.parsed) {
              return `${config.xLabel}: ${context.parsed.x.toFixed(1)}, ${config.yLabel}: ${context.parsed.y.toFixed(1)}`;
            }
            return '';
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: config.xLabel,
          color: '#fff',
        },
        ...config.xAxis,
        ticks: {
          ...config.xAxis.ticks,
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
        type: 'linear',
        title: {
          display: true,
          text: config.yLabel,
          color: '#fff',
        },
        ...config.yAxis,
        ticks: {
          ...config.yAxis.ticks,
          color: '#b0b0b0',
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
      mode: 'nearest',
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

  // Función para limpiar bucle
  const clearLoop = () => {
    // Implementar lógica para limpiar el bucle si es necesario
    if (chartRef.current) {
      chartRef.current.clear();
    }
  };

  // Calcular estadísticas del bucle
  const loopStatistics = useMemo(() => {
    if (!data || !data[config.xKey] || !data[config.yKey]) {
      return { area: 0, points: 0 };
    }

    const points = processedData.datasets[0]?.data?.length || 0;
    
    // Calcular área aproximada del bucle (útil para análisis clínico)
    let area = 0;
    const loopData = processedData.datasets[0]?.data || [];
    if (loopData.length > 2) {
      for (let i = 1; i < loopData.length; i++) {
        const dx = loopData[i].x - loopData[i-1].x;
        const avgY = (loopData[i].y + loopData[i-1].y) / 2;
        area += dx * avgY;
      }
    }

    return {
      area: Math.abs(area).toFixed(1),
      points: points,
    };
  }, [data, config, processedData]);

  // Si no hay conexión, mostrar mensaje
  if (!isConnected) {
    return (
      <Box sx={{ height: 200, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="warning" sx={{ width: '100%' }}>
          No hay conexión con el ventilador. Los bucles cerrados requieren datos en tiempo real.
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
        <Tooltip title="Limpiar bucle">
          <IconButton size="small" onClick={clearLoop} sx={{ color: '#fff' }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Estadísticas del bucle */}
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
          label={`Puntos: ${loopStatistics.points}`}
          size="small"
          variant="outlined"
          sx={{ 
            borderColor: 'rgba(255, 255, 255, 0.3)', 
            color: '#fff',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          }}
        />
        <Chip 
          label={`Área: ${loopStatistics.area}`}
          size="small"
          variant="outlined"
          sx={{ 
            borderColor: 'rgba(255, 255, 255, 0.3)', 
            color: '#fff',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          }}
        />
      </Box>

      {/* Título del bucle */}
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 5,
        pointerEvents: 'none',
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'rgba(255, 255, 255, 0.3)',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          {config.title}
        </Typography>
      </Box>

      {/* Gráfica principal del bucle */}
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
        backgroundColor: isConnected ? config.color : '#f44336',
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

export default LoopCharts; 