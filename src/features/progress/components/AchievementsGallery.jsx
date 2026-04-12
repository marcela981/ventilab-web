/**
 * =============================================================================
 * AchievementsGallery Component
 * =============================================================================
 * Full gallery page component for displaying all user achievements.
 * Features filtering, sorting, pagination, and responsive grid layout.
 * 
 * Features:
 * - Responsive grid layout (1-4 cards per row)
 * - Filter by status (All, Unlocked, Locked)
 * - Filter by category (INICIO, PROGRESO, etc.)
 * - Global progress indicator
 * - Sorting (recent first, then by progress)
 * - Pagination or infinite scroll
 * - Empty state with motivational message
 * - Loading and error states
 * 
 * =============================================================================
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Container,
  Typography,
  Grid,
  Box,
  Tabs,
  Tab,
  Chip,
  ButtonGroup,
  Button,
  LinearProgress,
  Alert,
  CircularProgress,
  Skeleton,
  Pagination,
  Fade,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Lock as LockIcon,
  CheckCircle as UnlockedIcon,
} from '@mui/icons-material';
import useAchievements from '@/features/progress/hooks/useAchievements';
import AchievementCard from './AchievementCard';

/**
 * Tab panel component for filtering
 */
function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  value: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
};

/**
 * AchievementsGallery Component
 * 
 * Main gallery page for displaying all achievements with filtering,
 * sorting, and pagination capabilities.
 * 
 * @component
 * @example
 * <AchievementsGallery />
 */
function AchievementsGallery() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const {
    allAchievements,
    loading,
    error,
    totalAchievements,
    completionPercentage,
    fetchAllAchievements,
  } = useAchievements();

  // Filter states
  const [statusFilter, setStatusFilter] = useState(0); // 0: All, 1: Unlocked, 2: Locked
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;

  // Available categories
  const categories = [
    { value: 'ALL', label: 'Todos' },
    { value: 'INICIO', label: 'Inicio' },
    { value: 'PROGRESO', label: 'Progreso' },
    { value: 'CONSISTENCIA', label: 'Consistencia' },
    { value: 'EXCELENCIA', label: 'Excelencia' },
    { value: 'ESPECIAL', label: 'Especial' },
  ];

  // Filter and sort achievements
  const filteredAndSortedAchievements = useMemo(() => {
    if (!allAchievements || allAchievements.length === 0) return [];

    let filtered = [...allAchievements];

    // Filter by status
    if (statusFilter === 1) {
      // Unlocked only
      filtered = filtered.filter(a => a.isUnlocked);
    } else if (statusFilter === 2) {
      // Locked only
      filtered = filtered.filter(a => !a.isUnlocked);
    }

    // Filter by category
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(a => a.category === categoryFilter);
    }

    // Sort: unlocked first (by date), then locked by progress
    filtered.sort((a, b) => {
      // Unlocked achievements first, sorted by date (newest first)
      if (a.isUnlocked && !b.isUnlocked) return -1;
      if (!a.isUnlocked && b.isUnlocked) return 1;

      if (a.isUnlocked && b.isUnlocked) {
        const dateA = a.unlockedAt ? new Date(a.unlockedAt) : new Date(0);
        const dateB = b.unlockedAt ? new Date(b.unlockedAt) : new Date(0);
        return dateB - dateA; // Newest first
      }

      // Locked achievements sorted by progress (closest to completion first)
      const progressA = a.progress?.percentage || 0;
      const progressB = b.progress?.percentage || 0;
      return progressB - progressA;
    });

    return filtered;
  }, [allAchievements, statusFilter, categoryFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedAchievements.length / itemsPerPage);
  const paginatedAchievements = filteredAndSortedAchievements.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Handle status filter change
  const handleStatusFilterChange = (event, newValue) => {
    setStatusFilter(newValue);
    setPage(1); // Reset to first page
  };

  // Handle category filter change
  const handleCategoryFilterChange = (category) => {
    setCategoryFilter(category);
    setPage(1); // Reset to first page
  };

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Skeleton variant="text" width={200} height={40} />
          <Skeleton variant="text" width={300} height={24} sx={{ mt: 1 }} />
        </Box>
        <Grid container spacing={3}>
          {[...Array(8)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Skeleton variant="rectangular" height={300} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={fetchAllAchievements} variant="contained">
          Reintentar
        </Button>
      </Container>
    );
  }

  // Empty state
  if (allAchievements.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
          }}
        >
          <TrophyIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            ¡Comienza tu viaje!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Completa lecciones y módulos para desbloquear tus primeros logros.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Galería de Logros
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          {totalAchievements} de {allAchievements.length} logros conseguidos
        </Typography>

        {/* Global Progress */}
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Progreso Global
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {completionPercentage}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={completionPercentage}
            sx={{
              height: 8,
              borderRadius: 4,
            }}
          />
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        {/* Status Tabs */}
        <Tabs
          value={statusFilter}
          onChange={handleStatusFilterChange}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Todos" icon={<TrophyIcon />} iconPosition="start" />
          <Tab label="Desbloqueados" icon={<UnlockedIcon />} iconPosition="start" />
          <Tab label="Bloqueados" icon={<LockIcon />} iconPosition="start" />
        </Tabs>

        {/* Category Filter */}
        <ButtonGroup
          variant="outlined"
          size="small"
          sx={{ flexWrap: 'wrap', gap: 1 }}
        >
          {categories.map((category) => (
            <Button
              key={category.value}
              onClick={() => handleCategoryFilterChange(category.value)}
              variant={categoryFilter === category.value ? 'contained' : 'outlined'}
            >
              {category.label}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      {/* Results Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Mostrando {paginatedAchievements.length} de {filteredAndSortedAchievements.length} logros
      </Typography>

      {/* Empty Filter State */}
      {filteredAndSortedAchievements.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <TrophyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No se encontraron logros
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Intenta ajustar los filtros
          </Typography>
        </Box>
      )}

      {/* Achievement Grid */}
      <Grid container spacing={3}>
        {paginatedAchievements.map((achievement, index) => (
          <Grid
            item
            xs={12}
            sm={6}
            md={4}
            lg={3}
            key={achievement.type || index}
          >
            <Fade in timeout={300 + index * 50}>
              <div>
                <AchievementCard
                  achievement={achievement}
                  isLocked={!achievement.isUnlocked}
                  progress={achievement.progress}
                />
              </div>
            </Fade>
          </Grid>
        ))}
      </Grid>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(event, value) => setPage(value)}
            color="primary"
            size={isMobile ? 'small' : 'medium'}
          />
        </Box>
      )}
    </Container>
  );
}

export default AchievementsGallery;

