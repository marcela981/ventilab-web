/**
 * =============================================================================
 * Search Results Page - VentiLab
 * =============================================================================
 * Página completa de resultados de búsqueda con filtros avanzados,
 * paginación, y vista responsive
 * 
 * Route: /search?q={query}
 * =============================================================================
 */

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Skeleton,
  Pagination,
  Drawer,
  IconButton,
  Fab,
  Divider,
  alpha,
  useTheme,
  useMediaQuery,
  Paper,
  Stack,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  FormGroup,
  FormControlLabel,
  RadioGroup,
  Radio,
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Close as CloseIcon,
  MenuBook as MenuBookIcon,
  Folder as FolderIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Autorenew as AutorenewIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  LightbulbOutlined as LightbulbIcon,
} from '@mui/icons-material';
import { useSearch } from '@/hooks/useSearch';
import SearchFilters, { ActiveFiltersChips } from '@/components/search/SearchFilters';
import { highlightMarkedText } from '@/utils/highlightText';

/**
 * Get difficulty color and label
 */
const getDifficultyConfig = (difficulty) => {
  const configs = {
    BEGINNER: { color: 'success', label: 'Principiante' },
    INTERMEDIATE: { color: 'warning', label: 'Intermedio' },
    ADVANCED: { color: 'error', label: 'Avanzado' },
  };
  return configs[difficulty] || { color: 'default', label: difficulty };
};

/**
 * Get completion status config
 */
const getCompletionConfig = (status) => {
  const configs = {
    completed: {
      icon: CheckCircleIcon,
      label: 'Completado',
      color: 'success',
    },
    in_progress: {
      icon: AutorenewIcon,
      label: 'En Progreso',
      color: 'info',
    },
    not_started: {
      icon: RadioButtonUncheckedIcon,
      label: 'No Iniciado',
      color: 'default',
    },
  };
  return configs[status] || null;
};

/**
 * Format category name
 */
const formatCategory = (category) => {
  const map = {
    FUNDAMENTALS: 'Fundamentos',
    VENTILATION_PRINCIPLES: 'Principios de Ventilación',
    CLINICAL_APPLICATIONS: 'Aplicaciones Clínicas',
    ADVANCED_TECHNIQUES: 'Técnicas Avanzadas',
    TROUBLESHOOTING: 'Solución de Problemas',
    PATIENT_SAFETY: 'Seguridad del Paciente',
  };
  return map[category] || category;
};

/**
 * Result Card Component
 */
const ResultCard = ({ result, query, onResultClick }) => {
  const router = useRouter();
  const theme = useTheme();

  const difficultyConfig = getDifficultyConfig(result.difficulty);
  const completionConfig = result.completedStatus
    ? getCompletionConfig(result.completedStatus)
    : null;

  const handleViewClick = () => {
    // Log the click for analytics
    if (onResultClick) {
      onResultClick(result.id, result.type, query);
    }
    
    // Navigate to the result
    const path = result.type === 'module'
      ? `/modules/${result.id}`
      : `/lessons/${result.id}`;
    router.push(path);
  };

  const CompletionIcon = completionConfig?.icon;

  return (
    <Card
      elevation={1}
      sx={{
        mb: 2,
        transition: 'all 0.2s',
        '&:hover': {
          elevation: 4,
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          {/* Icon */}
          <Box
            sx={{
              p: 1,
              borderRadius: 1,
              backgroundColor: result.type === 'module'
                ? alpha(theme.palette.primary.main, 0.1)
                : alpha(theme.palette.secondary.main, 0.1),
            }}
          >
            {result.type === 'module' ? (
              <FolderIcon
                sx={{
                  color: 'primary.main',
                  fontSize: 28,
                }}
              />
            ) : (
              <MenuBookIcon
                sx={{
                  color: 'secondary.main',
                  fontSize: 28,
                }}
              />
            )}
          </Box>

          {/* Content */}
          <Box sx={{ flexGrow: 1 }}>
            {/* Title with highlighting */}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                mb: 1,
                color: 'text.primary',
                lineHeight: 1.4,
              }}
            >
              {highlightMarkedText(result.title)}
            </Typography>

            {/* Metadata chips */}
            <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              <Chip
                label={result.type === 'module' ? 'Módulo' : 'Lección'}
                size="small"
                variant="outlined"
                sx={{ height: 24 }}
              />
              <Chip
                label={difficultyConfig.label}
                size="small"
                color={difficultyConfig.color}
                sx={{ height: 24 }}
              />
              <Chip
                icon={<ScheduleIcon sx={{ fontSize: 16 }} />}
                label={`${result.estimatedTime} min`}
                size="small"
                variant="outlined"
                sx={{ height: 24 }}
              />
              {completionConfig && CompletionIcon && (
                <Chip
                  icon={<CompletionIcon sx={{ fontSize: 16 }} />}
                  label={completionConfig.label}
                  size="small"
                  color={completionConfig.color}
                  sx={{ height: 24 }}
                />
              )}
            </Stack>

            {/* Snippet */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                lineHeight: 1.6,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {highlightMarkedText(result.snippet)}
            </Typography>

            {/* Parent module info for lessons */}
            {result.parentModule && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <FolderIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {result.parentModule.title}
                </Typography>
                <Chip
                  label={formatCategory(result.parentModule.category)}
                  size="small"
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              </Box>
            )}

            {/* Category for modules */}
            {result.type === 'module' && result.category && (
              <Box sx={{ mt: 1 }}>
                <Chip
                  label={formatCategory(result.category)}
                  size="small"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              </Box>
            )}
          </Box>

          {/* Relevance score (optional, can be hidden) */}
          <Chip
            label={`${result.score}%`}
            size="small"
            color="primary"
            sx={{
              height: 24,
              fontWeight: 600,
              display: { xs: 'none', sm: 'flex' },
            }}
          />
        </Box>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          variant="contained"
          size="medium"
          onClick={handleViewClick}
          sx={{ textTransform: 'none' }}
        >
          Ver {result.type === 'module' ? 'Módulo' : 'Lección'}
        </Button>
      </CardActions>
    </Card>
  );
};

/**
 * Empty State Component
 */
const EmptyState = ({ query }) => {
  return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <SearchIcon
        sx={{
          fontSize: 120,
          color: 'text.disabled',
          mb: 3,
        }}
      />
      
      <Typography variant="h4" gutterBottom fontWeight={600}>
        No encontramos resultados para "{query}"
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
        No te preocupes, aquí hay algunas sugerencias para mejorar tu búsqueda:
      </Typography>

      <Stack spacing={2} sx={{ maxWidth: 500, mx: 'auto', mb: 4 }}>
        <Paper sx={{ p: 2, textAlign: 'left' }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <LightbulbIcon color="primary" />
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Verifica la ortografía
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Asegúrate de que las palabras estén escritas correctamente
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2, textAlign: 'left' }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <LightbulbIcon color="primary" />
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Usa términos más generales
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Prueba con palabras clave más amplias o sinónimos
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2, textAlign: 'left' }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <LightbulbIcon color="primary" />
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Prueba palabras clave diferentes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Intenta describir lo que buscas de otra manera
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Stack>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h6" gutterBottom fontWeight={600}>
        Lecciones Populares
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Mientras tanto, explora estos temas populares
      </Typography>

      <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" gap={1}>
        <Chip
          icon={<TrendingUpIcon />}
          label="Fundamentos de Ventilación"
          clickable
          color="primary"
        />
        <Chip
          icon={<TrendingUpIcon />}
          label="PEEP y Compliance"
          clickable
          color="primary"
        />
        <Chip
          icon={<TrendingUpIcon />}
          label="Modos Ventilatorios"
          clickable
          color="primary"
        />
        <Chip
          icon={<TrendingUpIcon />}
          label="Seguridad del Paciente"
          clickable
          color="primary"
        />
      </Stack>
    </Box>
  );
};

/**
 * Skeleton Loader Component
 */
const ResultSkeleton = () => (
  <Card elevation={1} sx={{ mb: 2 }}>
    <CardContent>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Skeleton variant="rectangular" width={56} height={56} sx={{ borderRadius: 1 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Skeleton variant="text" width="60%" height={32} />
          <Stack direction="row" spacing={1} sx={{ my: 1 }}>
            <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" width={70} height={24} sx={{ borderRadius: 2 }} />
          </Stack>
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="80%" />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

/**
 * Main Search Page Component
 */
export default function SearchPage() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Get query from URL
  const urlQuery = router.query.q || '';

  // Search hook
  const {
    query,
    results,
    isSearching,
    error,
    filters,
    setFilter,
    clearFilters,
    sortBy,
    setSortBy,
    pagination,
    performSearch,
    goToPage,
    logResultClick,
  } = useSearch();

  /**
   * Perform search when URL query changes
   */
  useEffect(() => {
    if (urlQuery && urlQuery.length >= 2) {
      performSearch(urlQuery);
    }
  }, [urlQuery]);

  /**
   * Handle page change
   */
  const handlePageChange = (event, value) => {
    goToPage(value);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Handle sort change
   */
  const handleSortChange = (event) => {
    setSortBy(event.target.value);
  };

  return (
    <>
      <Head>
        <title>
          {urlQuery
            ? `Resultados de búsqueda: ${urlQuery} | VentiLab`
            : 'Búsqueda | VentiLab'}
        </title>
        <meta
          name="description"
          content={`Resultados de búsqueda para "${urlQuery}" en VentiLab - Plataforma de educación en ventilación mecánica`}
        />
      </Head>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Filters Sidebar - Desktop */}
          {!isMobile && (
            <Grid item xs={12} md={3}>
              <SearchFilters
                filters={filters}
                setFilter={setFilter}
                clearFilters={clearFilters}
                totalResults={pagination.total}
                isSearching={isSearching}
                autoApply={true}
              />
            </Grid>
          )}

          {/* Results Area */}
          <Grid item xs={12} md={isMobile ? 12 : 9}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Resultados de búsqueda
              </Typography>
              
              {urlQuery && (
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Mostrando resultados para: <strong>"{urlQuery}"</strong>
                </Typography>
              )}

              {!isSearching && results.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  {pagination.total} resultado{pagination.total !== 1 ? 's' : ''} encontrado{pagination.total !== 1 ? 's' : ''}
                </Typography>
              )}
            </Box>

            {/* Sort and Filter Controls */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              {/* Sort Selector */}
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Ordenar por</InputLabel>
                <Select
                  value={sortBy}
                  label="Ordenar por"
                  onChange={handleSortChange}
                >
                  <MenuItem value="relevance">Relevancia</MenuItem>
                  <MenuItem value="date">Más reciente</MenuItem>
                  <MenuItem value="popularity">Popularidad</MenuItem>
                  <MenuItem value="duration">Duración</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Active Filters Chips */}
            <ActiveFiltersChips filters={filters} setFilter={setFilter} />

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Results */}
            {isSearching ? (
              // Loading skeletons
              <Box>
                {[1, 2, 3, 4, 5].map((i) => (
                  <ResultSkeleton key={i} />
                ))}
              </Box>
            ) : results.length > 0 ? (
              // Results list
              <Box>
                {results.map((result) => (
                  <ResultCard
                    key={`${result.type}-${result.id}`}
                    result={result}
                    query={urlQuery}
                    onResultClick={logResultClick}
                  />
                ))}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Pagination
                      count={pagination.totalPages}
                      page={pagination.page}
                      onChange={handlePageChange}
                      color="primary"
                      size={isMobile ? 'small' : 'medium'}
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </Box>
            ) : urlQuery && !isSearching ? (
              // Empty state
              <EmptyState query={urlQuery} />
            ) : (
              // Initial state (no search performed)
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <SearchIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Ingresa un término de búsqueda
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Usa la barra de búsqueda arriba o presiona Ctrl+K
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

