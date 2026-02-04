/**
 * =============================================================================
 * StudentRow Component - Desktop Table Row
 * =============================================================================
 * Table row component for displaying a student in the students list.
 * Used in the desktop view of StudentsList.
 *
 * Shows: Avatar, name, email, progress %, completed lessons, last activity
 * =============================================================================
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
  TableRow,
  TableCell,
  Avatar,
  Typography,
  Chip,
  LinearProgress,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { formatDistanceToNow, format, isAfter, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Generates a color based on string hash
 * @param {string} str - String to hash
 * @returns {string} Hex color
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
 * @param {string} name - Full name
 * @returns {string} Initials (max 2 chars)
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
 * @param {string|Date|null} date - Date to format
 * @returns {string} Formatted date
 */
const formatRelativeDate = (date) => {
  if (!date) return 'Sin actividad';
  const dateObj = new Date(date);
  const sevenDaysAgo = subDays(new Date(), 7);

  if (isAfter(dateObj, sevenDaysAgo)) {
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: es });
  }
  return format(dateObj, "d 'de' MMMM 'de' yyyy", { locale: es });
};

/**
 * Gets progress color based on percentage
 * @param {number} percentage - Progress percentage
 * @returns {string} MUI color name
 */
const getProgressColor = (percentage) => {
  if (percentage >= 80) return 'success';
  if (percentage >= 50) return 'primary';
  if (percentage >= 25) return 'warning';
  return 'error';
};

/**
 * StudentRow Component
 */
const StudentRow = ({ student, onViewDetails }) => {
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
    <TableRow hover>
      {/* Avatar */}
      <TableCell>
        <Avatar
          sx={{
            bgcolor: stringToColor(student.name),
            width: 40,
            height: 40,
            fontSize: '0.875rem',
            fontWeight: 'bold',
          }}
          src={student.image}
        >
          {getInitials(student.name)}
        </Avatar>
      </TableCell>

      {/* Name */}
      <TableCell>
        <Typography variant="body2" fontWeight={500}>
          {student.name || 'Sin nombre'}
        </Typography>
      </TableCell>

      {/* Email */}
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {student.email}
        </Typography>
      </TableCell>

      {/* Progress */}
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
          <Box sx={{ flex: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              color={getProgressColor(progressPercentage)}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40 }}>
            {progressPercentage}%
          </Typography>
        </Box>
      </TableCell>

      {/* Completed Lessons */}
      <TableCell align="center">
        <Chip
          label={`${completedLessons}/${totalLessons}`}
          size="small"
          color={completedLessons === totalLessons && totalLessons > 0 ? 'success' : 'default'}
          variant="outlined"
        />
      </TableCell>

      {/* Last Activity */}
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {formatRelativeDate(stats.lastAccess)}
        </Typography>
      </TableCell>

      {/* Actions */}
      <TableCell align="right">
        <Tooltip title="Ver detalles">
          <IconButton
            size="small"
            color="primary"
            onClick={handleViewDetails}
          >
            <ViewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

StudentRow.propTypes = {
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

StudentRow.defaultProps = {
  onViewDetails: null,
};

export default StudentRow;
