import React, { useMemo, useState } from 'react';
import { Box } from '@mui/material';
// Chart.js registration — ensures scales are available
import '@/features/simulator/charts/ChartRegistry';
import { Line } from 'react-chartjs-2';

const LoopChart = ({ data, type, isConnected }) => {
  const [isPaused, setIsPaused] = useState(false);
  
  const chartConfigs = {
    'volume-pressure': {
      title: 'Bucle Volumen vs Presión',
      xKey: 'volume',
      yKey: 'pressure',
      color: '#ffff00',
      xAxis: { min: 0, max: 1000 },
      yAxis: { min: 0, max: 50 },
    },
    'flow-volume': {
      title: 'Bucle Flujo vs Volumen',
      xKey: 'volume',
      yKey: 'flow',
      color: '#00ff00', 
      xAxis: { min: 0, max: 1000 },
      yAxis: { min: -20, max: 100 },
    },
  };

  const config = chartConfigs[type] || chartConfigs['volume-pressure'];

  const processedData = useMemo(() => {
    if (!data || !data[config.xKey] || !data[config.yKey]) {
      return { datasets: [] };
    }

    const totalPoints = data[config.xKey].length;
    const startIndex = Math.max(0, totalPoints - 150);
    
    const xData = data[config.xKey].slice(startIndex);
    const yData = data[config.yKey].slice(startIndex, startIndex + xData.length);

    const minLength = Math.min(xData.length, yData.length);
    const loopData = xData.slice(0, minLength).map((x, index) => ({
      x: x,
      y: yData[index]
    }));

    return {
      datasets: [{
        label: config.title,
        data: loopData,
        borderColor: config.color,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 3,
        borderWidth: 2,
        showLine: true,
      }],
    };
  }, [data, config, isPaused]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: { legend: { display: false } },
    scales: {
      x: {
        type: 'linear',
        ...config.xAxis,
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#b0b0b0' },
      },
      y: {
        type: 'linear',
        ...config.yAxis,
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#b0b0b0' },
      },
    },
  };

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
      <Line data={processedData} options={chartOptions} />
    </Box>
  );
};

export default LoopChart;
