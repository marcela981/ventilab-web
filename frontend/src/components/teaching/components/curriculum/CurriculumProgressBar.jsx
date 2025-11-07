'use client';

import React from 'react';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

export default function CurriculumProgressBar({ value = 0, label }) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flex: 1 }}>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>
      <Typography variant="caption" sx={{ minWidth: 36, textAlign: 'right' }}>
        {pct}%
      </Typography>
      {label ? (
        <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
          {label}
        </Typography>
      ) : null}
    </Box>
  );
}

