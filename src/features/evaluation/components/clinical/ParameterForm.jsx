/*
 * Funcionalidad: Formulario de parámetros ventilatorios (OE2)
 * Descripción: Captura la configuración del estudiante (modo, Vt, FR, PEEP, FiO2,
 *              Pmax) para enviarla al motor de comparación con el experto.
 *              El campo "modo" emite EXACTAMENTE el vocabulario sembrado en el
 *              backend ('volume' | 'pressure'); cualquier otro literal rompería
 *              la comparación de modo. La validación de rangos es básica y de
 *              cliente: NO sustituye la validación del backend.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import styles from './clinicalCase.module.css';

// Límites de seguridad de cliente (orientativos). El backend valida de nuevo.
const FIELDS = [
  { key: 'tidalVolume',     label: 'Volumen Tidal (Vt)', unit: 'ml',       min: 100, max: 1000, step: 10 },
  { key: 'respiratoryRate', label: 'Frecuencia Resp. (FR)', unit: 'resp/min', min: 4,  max: 60,  step: 1 },
  { key: 'peep',            label: 'PEEP',               unit: 'cmH2O',    min: 0,   max: 25,   step: 1 },
  { key: 'fio2',            label: 'FiO2',               unit: '%',        min: 21,  max: 100,  step: 1 },
  { key: 'maxPressure',     label: 'Presión Máxima',     unit: 'cmH2O',    min: 10,  max: 60,   step: 1 },
];

const DEFAULTS = {
  ventilationMode: 'volume',
  tidalVolume: '',
  respiratoryRate: '',
  peep: '',
  fio2: '',
  maxPressure: '',
};

/**
 * @param {(config: object) => void} onSubmit - recibe la configuración tipada
 * @param {boolean} isSubmitting
 */
export default function ParameterForm({ onSubmit, isSubmitting = false }) {
  const [values, setValues] = useState(DEFAULTS);
  const [errors, setErrors] = useState({});

  const handleChange = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    for (const f of FIELDS) {
      const raw = values[f.key];
      if (raw === '' || raw === null || raw === undefined) {
        next[f.key] = 'Requerido';
        continue;
      }
      const n = Number(raw);
      if (Number.isNaN(n)) next[f.key] = 'Debe ser un número';
      else if (n < f.min || n > f.max) next[f.key] = `Rango ${f.min}–${f.max} ${f.unit}`;
    }
    if (values.ventilationMode !== 'volume' && values.ventilationMode !== 'pressure') {
      next.ventilationMode = 'Selecciona un modo';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ventilationMode: values.ventilationMode, // 'volume' | 'pressure' (vocabulario del backend)
      tidalVolume: Number(values.tidalVolume),
      respiratoryRate: Number(values.respiratoryRate),
      peep: Number(values.peep),
      fio2: Number(values.fio2),
      maxPressure: Number(values.maxPressure),
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} className={styles.card}>
      <Typography variant="h6" className={styles.cardTitle}>
        Tu configuración del ventilador
      </Typography>
      <Typography variant="body2" className={styles.cardSubtitle}>
        Ingresa los parámetros que aplicarías a este paciente. Al enviar, se
        compararán con la configuración recomendada por el experto.
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            label="Modo de ventilación"
            value={values.ventilationMode}
            onChange={handleChange('ventilationMode')}
            error={!!errors.ventilationMode}
            helperText={errors.ventilationMode}
            disabled={isSubmitting}
          >
            {/* value = vocabulario exacto del backend; label = nombre clínico */}
            <MenuItem value="volume">Volumen Control</MenuItem>
            <MenuItem value="pressure">Presión Control</MenuItem>
          </TextField>
        </Grid>

        {FIELDS.map((f) => (
          <Grid item xs={12} sm={6} key={f.key}>
            <TextField
              fullWidth
              type="number"
              label={`${f.label} (${f.unit})`}
              value={values[f.key]}
              onChange={handleChange(f.key)}
              error={!!errors[f.key]}
              helperText={errors[f.key] ?? `Rango ${f.min}–${f.max}`}
              inputProps={{ min: f.min, max: f.max, step: f.step }}
              disabled={isSubmitting}
            />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Evaluando…' : 'Evaluar configuración'}
        </Button>
        {isSubmitting && <CircularProgress size={20} />}
      </Box>
    </Box>
  );
}
