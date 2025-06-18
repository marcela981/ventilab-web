import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const RealTimeCharts = ({ data, type }) => {
  // Preparar datos para Chart.js
  const chartData = {
    labels: data.time.map(time => new Date(time).toLocaleTimeString()),
    datasets: [
      {
        label: 'Presión (cmH₂O)',
        data: data.pressure,
        borderColor: '#00c5da',
        backgroundColor: 'rgba(0, 197, 218, 0.1)',
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'Flujo (L/min)',
        data: data.flow,
        borderColor: '#da0037',
        backgroundColor: 'rgba(218, 0, 55, 0.1)',
        tension: 0.4,
        pointRadius: 0,
      },
      {
        label: 'Volumen (ml)',
        data: data.volume,
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  // Si se pasa 'type', mostrar solo la gráfica correspondiente
  if (type === 'pressure') {
    return (
      <Box sx={{ height: 200, width: '100%' }}>
        <Line
          data={{
            labels: chartData.labels,
            datasets: [chartData.datasets[0]],
          }}
          options={{
            ...options,
            plugins: { legend: { display: false } },
          }}
        />
      </Box>
    );
  }
  if (type === 'flow') {
    return (
      <Box sx={{ height: 200, width: '100%' }}>
        <Line
          data={{
            labels: chartData.labels,
            datasets: [chartData.datasets[1]],
          }}
          options={{
            ...options,
            plugins: { legend: { display: false } },
          }}
        />
      </Box>
    );
  }
  if (type === 'volume') {
    return (
      <Box sx={{ height: 200, width: '100%' }}>
        <Line
          data={{
            labels: chartData.labels,
            datasets: [chartData.datasets[2]],
          }}
          options={{
            ...options,
            plugins: { legend: { display: false } },
          }}
        />
      </Box>
    );
  }

  // Si no se pasa 'type', mostrar las tres gráficas como antes
  return (
    <Box>
      <Grid container spacing={2}>
        {/* Gráfica Combinada */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monitoreo en Tiempo Real
              </Typography>
              <Box sx={{ height: 400 }}>
                <Line data={chartData} options={options} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Gráficas Individuales */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Presión (cmH₂O)
              </Typography>
              <Box sx={{ height: 200 }}>
                <Line 
                  data={{
                    labels: chartData.labels,
                    datasets: [chartData.datasets[0]]
                  }} 
                  options={{
                    ...options,
                    plugins: { legend: { display: false } }
                  }} 
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Flujo (L/min)
              </Typography>
              <Box sx={{ height: 200 }}>
                <Line 
                  data={{
                    labels: chartData.labels,
                    datasets: [chartData.datasets[1]]
                  }} 
                  options={{
                    ...options,
                    plugins: { legend: { display: false } }
                  }} 
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Volumen (ml)
              </Typography>
              <Box sx={{ height: 200 }}>
                <Line 
                  data={{
                    labels: chartData.labels,
                    datasets: [chartData.datasets[2]]
                  }} 
                  options={{
                    ...options,
                    plugins: { legend: { display: false } }
                  }} 
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RealTimeCharts;
