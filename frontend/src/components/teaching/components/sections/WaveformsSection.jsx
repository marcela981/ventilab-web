import React from 'react';
import {
  Box,
  Typography,
  Paper,
} from '@mui/material';
import { WaveformVisualization } from '../content';

/**
 * WaveformsSection - Componente para renderizar visualizaciones de waveforms
 */
const WaveformsSection = ({ data }) => {
  const wfDirect = data?.content?.waveforms;
  // Compatibilidad: algunas lecciones pueden venir con sections: [{ type: 'waveforms', waveformData: {...} }]
  const wfFromSections = Array.isArray(data?.content?.sections)
    ? data.content.sections.filter(s => String(s.type).toLowerCase() === 'waveforms')
    : [];

  if (!wfDirect && wfFromSections.length === 0) return null;

  const items = [];
  if (wfDirect) items.push({ waveformData: wfDirect.waveformData || wfDirect });
  wfFromSections.forEach(s => items.push({ waveformData: s.waveformData || s.data || {} }));

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
        Curvas Ventilatorias Interactivas
      </Typography>
      {items.map((item, idx) => (
        <Paper key={idx} elevation={2} sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
          <WaveformVisualization waveformData={item.waveformData} />
        </Paper>
      ))}
    </Box>
  );
};

export default WaveformsSection;

