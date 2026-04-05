/**
 * RecentActivityFeed - Lista de estudiantes recientes con progreso visual.
 * Diseño glassmorphism, barras de progreso y mejor uso del espacio.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  Box, Typography, Avatar, LinearProgress, Skeleton, Button, Divider,
} from '@mui/material';
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material';

function progressColor(pct) {
  if (pct >= 70) return '#4ade80';   // verde
  if (pct >= 30) return '#fbbf24';   // amarillo
  return '#f87171';                   // rojo
}

function StudentRow({ student, onClick }) {
  const pct = Math.round(student.stats?.progressPercentage ?? 0);
  const initial = (student.name || student.email || '?')[0].toUpperCase();
  const color = progressColor(pct);

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        p: 1.25, borderRadius: 1.5, cursor: 'pointer',
        transition: 'background 0.15s ease',
        '&:hover': { background: 'rgba(255,255,255,0.06)' },
      }}
    >
      <Avatar
        sx={{
          width: 36, height: 36, fontSize: 14, fontWeight: 700,
          bgcolor: 'rgba(16, 174, 222, 0.25)',
          border: '1px solid rgba(16, 174, 222, 0.4)',
          color: '#7dd3fc', flexShrink: 0,
        }}
      >
        {initial}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{ color: '#e8eaf6', mb: 0.2 }}
          noWrap
        >
          {student.name || student.email}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              flex: 1, height: 4, borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 },
            }}
          />
          <Typography
            variant="caption"
            sx={{ color, fontWeight: 700, minWidth: 30, textAlign: 'right' }}
          >
            {pct}%
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function SkeletonRow() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25 }}>
      <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="55%" height={16} sx={{ bgcolor: 'rgba(255,255,255,0.08)', mb: 0.5 }} />
        <Skeleton variant="rounded" width="100%" height={4} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
      </Box>
    </Box>
  );
}

export default function RecentActivityFeed({ students, navigate, loading }) {
  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2.5,
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.09)',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#e8eaf6' }}>
          Estudiantes recientes
        </Typography>
        <Button
          size="small"
          endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
          onClick={() => navigate('/panel/students')}
          sx={{
            color: '#7dd3fc', fontSize: '0.75rem', fontWeight: 600,
            '&:hover': { bgcolor: 'rgba(16, 174, 222, 0.1)' },
          }}
        >
          Ver todos
        </Button>
      </Box>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.08)', mb: 1.5 }} />

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
        </Box>
      ) : !students || students.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', py: 2 }}>
          Sin estudiantes recientes
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          {students.slice(0, 5).map((s) => (
            <StudentRow
              key={s.id}
              student={s}
              onClick={() => navigate(`/panel/students/${s.id}`)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

RecentActivityFeed.propTypes = {
  students: PropTypes.array,
  navigate: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

StudentRow.propTypes = {
  student: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string,
    email: PropTypes.string,
    stats: PropTypes.shape({ progressPercentage: PropTypes.number }),
  }).isRequired,
  onClick: PropTypes.func.isRequired,
};
