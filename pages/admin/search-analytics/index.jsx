/**
 * =============================================================================
 * Search Analytics Dashboard - VentiLab Admin
 * =============================================================================
 * Dashboard de analíticas de búsqueda para administradores y profesores
 * Muestra estadísticas sobre comportamiento de búsqueda de usuarios
 * =============================================================================
 */

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Button,
  Divider,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  ErrorOutline as ErrorOutlineIcon,
  AccessTime as AccessTimeIcon,
  Timeline as TimelineIcon,
  Refresh as RefreshIcon,
  DateRange as DateRangeIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useAuth } from '@/shared/contexts/AuthContext';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

/**
 * API Base URL
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Helper to get auth token
 */
const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

/**
 * Stats Card Component
 */
const StatsCard = ({ title, value, icon: Icon, color = 'primary', subtitle }) => {
  const theme = useTheme();
  
  return (
    <Card elevation={2}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: alpha(theme.palette[color].main, 0.1),
            }}
          >
            <Icon sx={{ fontSize: 32, color: `${color}.main` }} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={600}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

/**
 * Main Search Analytics Page
 */
export default function SearchAnalyticsPage() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Check authorization
   */
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'ADMIN' && user.role !== 'TEACHER') {
      router.push('/');
      return;
    }
  }, [user, router]);

  /**
   * Fetch analytics data
   */
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        throw new Error('No autorizado');
      }

      const response = await fetch(`${API_BASE_URL}/admin/search-analytics`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al cargar las analíticas');
      }

      const data = await response.json();
      setAnalytics(data.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Error al cargar las analíticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'TEACHER')) {
      fetchAnalytics();
    }
  }, [user]);

  /**
   * Prepare chart data for searches by hour
   */
  const getSearchesByHourChartData = () => {
    if (!analytics?.searchesByHour) return null;

    return {
      labels: analytics.searchesByHour.map((item) => `${item.hour}:00`),
      datasets: [
        {
          label: 'Búsquedas',
          data: analytics.searchesByHour.map((item) => item.count),
          borderColor: theme.palette.primary.main,
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          fill: true,
          tension: 0.4,
        },
      ],
    };
  };

  /**
   * Prepare chart data for search trends
   */
  const getSearchTrendsChartData = () => {
    if (!analytics?.searchTrends) return null;

    return {
      labels: analytics.searchTrends.map((item) => item.date),
      datasets: [
        {
          label: 'Búsquedas',
          data: analytics.searchTrends.map((item) => item.count),
          borderColor: theme.palette.secondary.main,
          backgroundColor: alpha(theme.palette.secondary.main, 0.5),
          tension: 0.4,
        },
      ],
    };
  };

  /**
   * Chart options
   */
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchAnalytics}>
          Reintentar
        </Button>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Analíticas de Búsqueda | VentiLab Admin</title>
        <meta name="description" content="Dashboard de analíticas de búsqueda para administradores" />
      </Head>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Analíticas de Búsqueda
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Insights sobre el comportamiento de búsqueda de usuarios
            </Typography>
          </Box>
          <Tooltip title="Actualizar datos">
            <IconButton onClick={fetchAnalytics} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Date Range Info */}
        {analytics?.dateRange && (
          <Alert severity="info" icon={<DateRangeIcon />} sx={{ mb: 3 }}>
            Datos del período: {new Date(analytics.dateRange.startDate).toLocaleDateString()} - {new Date(analytics.dateRange.endDate).toLocaleDateString()}
          </Alert>
        )}

        {/* Stats Overview */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Total de Búsquedas"
              value={analytics?.totalSearches?.toLocaleString() || '0'}
              icon={SearchIcon}
              color="primary"
              subtitle="Últimos 30 días"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Búsquedas Sin Resultados"
              value={analytics?.searchesWithNoResults?.length || '0'}
              icon={ErrorOutlineIcon}
              color="error"
              subtitle="Posibles gaps de contenido"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Tiempo de Respuesta Promedio"
              value={`${analytics?.performanceMetrics?.avgResponseTime || 0}ms`}
              icon={AccessTimeIcon}
              color="warning"
              subtitle={`${analytics?.performanceMetrics?.slowSearches || 0} búsquedas lentas`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard
              title="Términos Únicos"
              value={analytics?.topSearches?.length || '0'}
              icon={TrendingUpIcon}
              color="success"
              subtitle="Top 10 búsquedas"
            />
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Searches by Hour */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Búsquedas por Hora del Día
                </Typography>
                <Box sx={{ height: 300, mt: 2 }}>
                  {getSearchesByHourChartData() ? (
                    <Line data={getSearchesByHourChartData()} options={chartOptions} />
                  ) : (
                    <Typography color="text.secondary">No hay datos disponibles</Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Search Trends */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Tendencias de Búsqueda
                </Typography>
                <Box sx={{ height: 300, mt: 2 }}>
                  {getSearchTrendsChartData() ? (
                    <Bar data={getSearchTrendsChartData()} options={chartOptions} />
                  ) : (
                    <Typography color="text.secondary">No hay datos disponibles</Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Top Searches */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
                  Términos Más Buscados
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Término</strong></TableCell>
                        <TableCell align="right"><strong>Búsquedas</strong></TableCell>
                        <TableCell align="right"><strong>Resultados Promedio</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics?.topSearches?.length > 0 ? (
                        analytics.topSearches.map((item, index) => (
                          <TableRow key={index} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {item.query}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip label={item.count} size="small" color="primary" />
                            </TableCell>
                            <TableCell align="right">{item.avgResults}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            <Typography color="text.secondary">No hay datos disponibles</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Searches with No Results */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight={600}>
                    Búsquedas Sin Resultados
                  </Typography>
                  <Tooltip title="Estos términos indican posibles gaps de contenido que deberían ser cubiertos">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Término</strong></TableCell>
                        <TableCell align="right"><strong>Intentos</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics?.searchesWithNoResults?.length > 0 ? (
                        analytics.searchesWithNoResults.map((item, index) => (
                          <TableRow key={index} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {item.query}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip label={item.count} size="small" color="error" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} align="center">
                            <Typography color="text.secondary">
                              ¡Excelente! No hay búsquedas sin resultados
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Low Click Rate Searches */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight={600}>
                    Búsquedas con Baja Tasa de Clicks
                  </Typography>
                  <Tooltip title="Estas búsquedas tienen resultados pero los usuarios no hacen click, indicando baja relevancia">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Término</strong></TableCell>
                        <TableCell align="right"><strong>Búsquedas</strong></TableCell>
                        <TableCell align="right"><strong>Clicks</strong></TableCell>
                        <TableCell align="right"><strong>Tasa de Click</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics?.lowClickRateSearches?.length > 0 ? (
                        analytics.lowClickRateSearches.map((item, index) => (
                          <TableRow key={index} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {item.query}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{item.searches}</TableCell>
                            <TableCell align="right">{item.clicks}</TableCell>
                            <TableCell align="right">
                              <Chip
                                label={`${item.clickRate}%`}
                                size="small"
                                color={item.clickRate < 20 ? 'error' : item.clickRate < 50 ? 'warning' : 'success'}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography color="text.secondary">No hay datos disponibles</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

