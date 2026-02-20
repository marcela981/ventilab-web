/**
 * =============================================================================
 * StudentCard Component - Mobile Card View
 * =============================================================================
 * Card component for displaying a student in the students list.
 * Used in the mobile view of StudentsList.
 *
 * Shows: Avatar, name, email, progress, completed lessons, last activity
 * =============================================================================
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Avatar,
  Typography,
  Chip,
  LinearProgress,
  Box,
  Button,
  Stack,
  Divider,
} from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { formatDistanceToNow, format, isAfter, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Generates a color based on string hash
 */
const stringToColor = (str) => {
  if (!str) return '#1976d2';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#1976d2', '#388e3c', '#d32f2f', '#f57c00', '#7b1fa2',
    '#0097a7', '#c2185b', '#5d4037', '#455a64', '#00897b',
  ];
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Gets initials from a name
 */
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Formats a date relatively if recent, or absolutely if older
 */
const formatRelativeDate = (date) => {
  if (!date) return 'Sin actividad';
  const dateObj = new Date(date);
  const sevenDaysAgo = subDays(new Date(), 7);

  if (isAfter(dateObj, sevenDaysAgo)) {
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: es });
  }
  return format(dateObj, "d 'de' MMMM", { locale: es });
};

/**
 * Gets progress color based on percentage
 */
const getProgressColor = (percentage) => {
  if (percentage >= 80) return 'success';
  if (percentage >= 50) return 'primary';
  if (percentage >= 25) return 'warning';
  return 'error';
};

/**
 * StudentCard Component
 */
const StudentCard = ({ student, onViewDetails }) => {
  const navigate = useNavigate();
  const { stats = {} } = student;

  const progressPercentage = stats.progressPercentage || 0;
  const completedLessons = stats.completedLessons || 0;
  const totalLessons = stats.totalLessons || 0;

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(student);
    } else {
      navigate(`/panel/students/${student.id}`);
    }
  };

  return (
    <Card elevation={2} sx={{ mb: 2 }}>
      <CardContent>
        {/* Header with Avatar and Info */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: stringToColor(student.name),
              width: 48,
              height: 48,
              fontSize: '1rem',
              fontWeight: 'bold',
              mr: 2,
            }}
            src={student.image}
          >
            {getInitials(student.name)}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {student.name || 'Sin nombre'}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {student.email}
            </Typography>
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Progreso
            </Typography>
            <Typography variant="body2" fontWeight={500}>
              {progressPercentage}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            color={getProgressColor(progressPercentage)}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Stats */}
        <Stack spacing={1} divider={<Divider />}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Lecciones completadas
            </Typography>
            <Chip
              label={`${completedLessons}/${totalLessons}`}
              size="small"
              color={completedLessons === totalLessons && totalLessons > 0 ? 'success' : 'default'}
              variant="outlined"
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Última actividad
            </Typography>
            <Typography variant="body2">
              {formatRelativeDate(stats.lastAccess)}
            </Typography>
          </Box>
        </Stack>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ViewIcon />}
          onClick={handleViewDetails}
          fullWidth
        >
          Ver detalles
        </Button>
      </CardActions>
    </Card>
  );
};

StudentCard.propTypes = {
  student: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    email: PropTypes.string.isRequired,
    image: PropTypes.string,
    stats: PropTypes.shape({
      completedLessons: PropTypes.number,
      totalLessons: PropTypes.number,
      totalTimeSpent: PropTypes.number,
      lastAccess: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      progressPercentage: PropTypes.number,
    }),
  }).isRequired,
  onViewDetails: PropTypes.func,
};

StudentCard.defaultProps = {
  onViewDetails: null,
};

export default StudentCard;
