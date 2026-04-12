/**
 * WaveformVisualization.jsx
 *
 * Componente para visualizar curvas ventilatorias (Presión, Flujo, Volumen) usando Chart.js.
 * Proporciona animación tipo "tiempo real" (play/pause), control de velocidad
 * y selección de modalidad (VCV, PCV, PSV, SIMV-VC, SIMV-PC, CPAP, BiPAP) para mostrar
 * patrones característicos de las curvas.
 *
 * Diseño: tres gráficas apiladas verticalmente (Presión vs Tiempo, Flujo vs Tiempo, Volumen vs Tiempo)
 * con ejes y rangos típicos, responsivas y con tooltips.
 *
 * Notas de implementación:
 * - Se generan series sintéticas con una frecuencia de muestreo fija sobre una ventana de 10 s.
 * - La animación agrega puntos progresivamente hasta completar la ventana, reiniciando en bucle.
 * - Los patrones se aproximan de forma determinista para docencia. No son datos clínicos reales.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Line } from 'react-chartjs-2';
import {
  Chart,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
} from 'chart.js';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, Slider, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

const WINDOW_SECONDS = 10; // ventana visible
const SAMPLE_RATE = 20; // Hz (20 puntos/seg)
const TOTAL_POINTS = WINDOW_SECONDS * SAMPLE_RATE; // 200

/**
 * Genera arrays de tiempo (eje X) en segundos para la ventana.
 */
function generateTimeArray() {
  return Array.from({ length: TOTAL_POINTS }, (_, i) => (i / SAMPLE_RATE).toFixed(2));
}

/**
 * Generador de ciclo respiratorio paramétrico básico.
 * Devuelve funciones que, dado un índice de muestra (0..TOTAL_POINTS-1), producen valores de presión (cmH2O),
 * flujo (L/min) y volumen (mL) para la modalidad seleccionada.
 *
 * Parámetros relevantes:
 * - modality: 'VCV' | 'PCV' | 'PSV' | 'SIMV-VC' | 'SIMV-PC' | 'CPAP' | 'BiPAP'
 * - vt: volumen tidal (mL)
 * - f: frecuencia respiratoria (rpm)
 * - peep: cmH2O
 * - pinsp: presión inspiratoria objetivo (PCV/PSV) cmH2O (sobre PEEP en práctica; aquí simplificado)
 */
function buildWaveformGenerators({ modality = 'VCV', vt = 500, f = 15, peep = 5, pinsp = 18 }) {
  // Duración del ciclo (s) y muestras por ciclo
  const cycleSeconds = 60 / Math.max(f, 1);
  const samplesPerCycle = Math.max(1, Math.round(cycleSeconds * SAMPLE_RATE));
  // Tiempos relativos dentro del ciclo
  // Inspiración 33% y espiración 67% como base; se ajusta por modalidad
  let inspFrac = 0.33; // proporción del ciclo
  if (modality === 'PCV' || modality === 'PSV' || modality === 'SIMV-PC') inspFrac = 0.35;
  if (modality === 'EPOC') inspFrac = 0.25; // no usada aquí, referencia
  const expFrac = 1 - inspFrac;
  const inspSamples = Math.max(1, Math.round(samplesPerCycle * inspFrac));
  const expSamples = Math.max(1, samplesPerCycle - inspSamples);

  // Escalas de referencia
  const vtTarget = vt; // mL
  const pPlateau = peep + pinsp; // simplificación para PCV/PSV

  /**
   * Cálculo del índice dentro del ciclo (0..samplesPerCycle-1)
   */
  const cycleIndexOf = (globalIndex) => globalIndex % samplesPerCycle;

  /**
   * Presión cmH2O por muestra
   */
  function pressureAt(globalIndex) {
    const i = cycleIndexOf(globalIndex);
    // VCV: presión variable (rampa) hasta pico, luego cae a PEEP
    if (modality === 'VCV' || modality === 'SIMV-VC') {
      if (i < inspSamples) {
        // Rampa lineal desde peep hasta pico ~ peep + 0.03*vt
        const pPeak = peep + Math.min(40, 0.03 * vtTarget);
        return peep + (pPeak - peep) * (i / inspSamples);
      }
      // Espiración: decaimiento exponencial hacia peep
      const t = (i - inspSamples) / Math.max(1, expSamples);
      return peep + (0.1 * (pPlateau - peep)) * Math.exp(-5 * t);
    }
    // PCV/PSV/SIMV-PC: presión rápida a plateau y mantenimiento
    if (modality === 'PCV' || modality === 'PSV' || modality === 'SIMV-PC') {
      if (i < inspSamples) {
        // subida rápida (10% del Ti) y plateau
        const rampEnd = Math.max(1, Math.round(inspSamples * 0.1));
        if (i < rampEnd) {
          return peep + (pPlateau - peep) * (i / rampEnd);
        }
        return pPlateau;
      }
      const t = (i - inspSamples) / Math.max(1, expSamples);
      return peep + (0.1 * (pPlateau - peep)) * Math.exp(-5 * t);
    }
    // CPAP/BiPAP: presión base constante (BiPAP alterna EPAP/IPAP al inicio de inspiración)
    if (modality === 'CPAP') {
      return peep;
    }
    if (modality === 'BiPAP') {
      return i < inspSamples ? peep + pinsp : peep; // IPAP/EPAP simplificado
    }
    return peep;
  }

  /**
   * Flujo L/min por muestra
   */
  function flowAt(globalIndex) {
    const i = cycleIndexOf(globalIndex);
    if (modality === 'VCV' || modality === 'SIMV-VC') {
      // Flujo cuadrado en inspiración, espiración negativa exponencial
      if (i < inspSamples) return 60; // 60 L/min constante
      const t = (i - inspSamples) / Math.max(1, expSamples);
      return -80 * Math.exp(-2 * t); // pico negativo que decae
    }
    if (modality === 'PCV' || modality === 'PSV' || modality === 'SIMV-PC') {
      // Flujo desacelerado: pico alto y decaimiento durante inspiración
      if (i < inspSamples) {
        const t = i / Math.max(1, inspSamples);
        return 90 * Math.exp(-2.5 * t); // desacelerado
      }
      const t = (i - inspSamples) / Math.max(1, expSamples);
      return -70 * Math.exp(-2 * t);
    }
    if (modality === 'CPAP') {
      // Oscilaciones pequeñas alrededor de 0
      return 10 * Math.sin((2 * Math.PI * i) / samplesPerCycle);
    }
    if (modality === 'BiPAP') {
      if (i < inspSamples) {
        const t = i / Math.max(1, inspSamples);
        return 80 * Math.exp(-2 * t);
      }
      const t = (i - inspSamples) / Math.max(1, expSamples);
      return -60 * Math.exp(-2 * t);
    }
    return 0;
  }

  /**
   * Volumen mL por muestra (integral discreta del flujo, re-cero al fin de espiración)
   */
  function volumeAt(globalIndex) {
    const i = cycleIndexOf(globalIndex);
    if (i < inspSamples) {
      // Inspiración: incremento hasta vtTarget con forma dependiente del flujo
      if (modality === 'VCV' || modality === 'SIMV-VC') {
        return vtTarget * (i / inspSamples);
      }
      // PCV/PSV: rápida subida y luego meseta suave
      const t = i / Math.max(1, inspSamples);
      const fast = 1 - Math.exp(-4 * t);
      return Math.min(vtTarget, vtTarget * fast);
    }
    // Espiración: retorno hacia 0 exponencial
    const t = (i - inspSamples) / Math.max(1, expSamples);
    return vtTarget * Math.exp(-3 * t);
  }

  return { pressureAt, flowAt, volumeAt, samplesPerCycle };
}

/**
 * Construye dataset de Chart.js a partir de funciones de generación y un índice actual.
 */
function buildDatasets(gen, uptoIndex) {
  const points = Math.min(uptoIndex + 1, TOTAL_POINTS);
  const p = new Array(points);
  const f = new Array(points);
  const v = new Array(points);
  for (let i = 0; i < points; i++) {
    p[i] = gen.pressureAt(i);
    f[i] = gen.flowAt(i);
    v[i] = gen.volumeAt(i);
  }
  return { p, f, v };
}

/**
 * WaveformVisualization
 * @param {Object} props
 * @param {{ modality?: string, params?: { vt?: number, f?: number, peep?: number, pinsp?: number }, annotations?: Array<{ t?: number, label: string }>}} props.waveformData
 */
const WaveformVisualization = ({ waveformData }) => {
  const theme = useTheme();
  const [modality, setModality] = useState(waveformData?.modality || 'VCV');
  const [params, setParams] = useState({ vt: 500, f: 15, peep: 5, pinsp: 18, ...(waveformData?.params || {}) });
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 0.5x - 2x
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  const timeLabels = useMemo(() => generateTimeArray(), []);
  const generators = useMemo(() => buildWaveformGenerators({ modality, ...params }), [modality, params]);
  const datasets = useMemo(() => buildDatasets(generators, index), [generators, index]);

  // Animación
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.max(10, Math.round(1000 / (SAMPLE_RATE * speed)));
    timerRef.current = setInterval(() => {
      setIndex(prev => (prev + 1) % TOTAL_POINTS);
    }, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [isPlaying, speed]);

  // Reiniciar índice al cambiar parámetros o modalidad
  useEffect(() => {
    setIndex(0);
  }, [modality, params.vt, params.f, params.peep, params.pinsp]);

  // Colores del tema
  const colorPressure = theme.palette.error.main; // rojo suave
  const colorFlow = theme.palette.info.main; // azul
  const colorVolume = theme.palette.success.main; // verde

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false },
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      x: { ticks: { autoSkip: true, maxTicksLimit: 6 }, grid: { display: false } },
    }
  };

  const dataPressure = {
    labels: timeLabels.slice(0, datasets.p.length),
    datasets: [
      { label: 'Presión (cmH2O)', data: datasets.p, borderColor: colorPressure, backgroundColor: colorPressure, pointRadius: 0, borderWidth: 2, tension: 0.15 }
    ]
  };
  const optionsPressure = {
    ...commonOptions,
    scales: { ...commonOptions.scales, y: { min: 0, max: 40, title: { display: true, text: 'cmH2O' } } }
  };

  const dataFlow = {
    labels: timeLabels.slice(0, datasets.f.length),
    datasets: [
      { label: 'Flujo (L/min)', data: datasets.f, borderColor: colorFlow, backgroundColor: colorFlow, pointRadius: 0, borderWidth: 2, tension: 0.15 }
    ]
  };
  const optionsFlow = {
    ...commonOptions,
    scales: { ...commonOptions.scales, y: { min: -100, max: 100, title: { display: true, text: 'L/min' } } }
  };

  const dataVolume = {
    labels: timeLabels.slice(0, datasets.v.length),
    datasets: [
      { label: 'Volumen (mL)', data: datasets.v, borderColor: colorVolume, backgroundColor: colorVolume, pointRadius: 0, borderWidth: 2, tension: 0.15 }
    ]
  };
  const optionsVolume = {
    ...commonOptions,
    scales: { ...commonOptions.scales, y: { min: 0, max: 700, title: { display: true, text: 'mL' } } }
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Modalidad</InputLabel>
          <Select label="Modalidad" value={modality} onChange={(e) => setModality(e.target.value)}>
            {['VCV','PCV','PSV','SIMV-VC','SIMV-PC','CPAP','BiPAP'].map(m => (
              <MenuItem key={m} value={m}>{m}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 220 }}>
          <Button variant="contained" onClick={() => setIsPlaying(p => !p)}>{isPlaying ? 'Pausa' : 'Play'}</Button>
          <Typography variant="body2" sx={{ minWidth: 70 }}>Velocidad</Typography>
          <Slider value={speed} onChange={(_, v) => setSpeed(v)} min={0.5} max={2} step={0.1} sx={{ width: 160 }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2">VT</Typography>
          <Slider value={params.vt} onChange={(_, v) => setParams(p => ({ ...p, vt: v }))} min={200} max={700} step={10} sx={{ width: 140 }} />
          <Typography variant="body2">f</Typography>
          <Slider value={params.f} onChange={(_, v) => setParams(p => ({ ...p, f: v }))} min={8} max={30} step={1} sx={{ width: 120 }} />
          <Typography variant="body2">PEEP</Typography>
          <Slider value={params.peep} onChange={(_, v) => setParams(p => ({ ...p, peep: v }))} min={0} max={15} step={1} sx={{ width: 120 }} />
          <Typography variant="body2">Pinsp</Typography>
          <Slider value={params.pinsp} onChange={(_, v) => setParams(p => ({ ...p, pinsp: v }))} min={8} max={30} step={1} sx={{ width: 120 }} />
        </Box>
      </Stack>

      <Box sx={{ height: 220, mb: 2 }}>
        <Line data={dataPressure} options={optionsPressure} />
      </Box>
      <Box sx={{ height: 220, mb: 2 }}>
        <Line data={dataFlow} options={optionsFlow} />
      </Box>
      <Box sx={{ height: 220 }}>
        <Line data={dataVolume} options={optionsVolume} />
      </Box>

      {waveformData?.annotations?.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Sugerencia: pasa el cursor por los puntos de interés para ver tooltips. Marcadores: {waveformData.annotations.map(a => a.label).join(', ')}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

WaveformVisualization.propTypes = {
  waveformData: PropTypes.shape({
    modality: PropTypes.string,
    params: PropTypes.shape({
      vt: PropTypes.number,
      f: PropTypes.number,
      peep: PropTypes.number,
      pinsp: PropTypes.number
    }),
    annotations: PropTypes.arrayOf(PropTypes.shape({ t: PropTypes.number, label: PropTypes.string }))
  })
};

WaveformVisualization.defaultProps = {
  waveformData: { modality: 'VCV', params: { vt: 500, f: 15, peep: 5, pinsp: 18 }, annotations: [] }
};

export default WaveformVisualization;


