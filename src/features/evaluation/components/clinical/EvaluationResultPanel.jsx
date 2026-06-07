/*
 * Funcionalidad: Panel de resultado de la evaluación (OE2 + OE3)
 * Descripción: Renderiza SIEMPRE: (1) score 0–100, (2) tabla de comparación
 *              paramétrica contra el experto con clasificación
 *              correcto/menor/moderado/crítico, y (3) feedback (de IA o del
 *              fallback determinístico) con un indicador discreto de su origen.
 *              No depende de que la IA esté disponible.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React from 'react';
import { Box, Button, Divider, Typography } from '@mui/material';
import styles from './clinicalCase.module.css';

// Etiquetas + unidades por parámetro (las keys provienen de compareConfigurations).
const PARAM_META = {
  ventilationMode: { label: 'Modo de ventilación', unit: '' },
  tidalVolume:     { label: 'Volumen Tidal (Vt)',  unit: 'ml' },
  respiratoryRate: { label: 'Frecuencia Resp.',    unit: 'resp/min' },
  peep:            { label: 'PEEP',                unit: 'cmH2O' },
  fio2:            { label: 'FiO2',                unit: '%' },
  maxPressure:     { label: 'Presión Máxima',      unit: 'cmH2O' },
  iERatio:         { label: 'Relación I:E',        unit: '' },
};

const CLASS_BADGE = {
  correcto: { cls: styles.badgeCorrecto, text: 'Correcto' },
  menor:    { cls: styles.badgeMenor,    text: 'Error menor' },
  moderado: { cls: styles.badgeModerado, text: 'Error moderado' },
  critico:  { cls: styles.badgeCritico,  text: 'Crítico' },
};

const MODE_LABEL = { volume: 'Volumen Control', pressure: 'Presión Control' };

function displayValue(parameter, value, unit) {
  if (value === null || value === undefined || value === '') return '—';
  if (parameter === 'ventilationMode') return MODE_LABEL[value] ?? String(value);
  return `${value}${unit ? ` ${unit}` : ''}`;
}

function scoreBandClass(score) {
  if (score >= 80) return styles.scoreHigh;
  if (score >= 50) return styles.scoreMid;
  return styles.scoreLow;
}

/**
 * @param {import('../../evaluation.types').EvaluationResult} result
 * @param {'ia'|'fallback'} feedbackSource
 * @param {() => void} onRetry - reintentar con otra configuración
 */
export default function EvaluationResultPanel({ result, feedbackSource, onRetry }) {
  if (!result) return null;

  const { comparison, feedback, expertConfiguration } = result;
  const score = comparison?.score ?? 0;
  const summary = comparison?.summary ?? { correct: 0, minor: 0, moderate: 0, critical: 0 };

  return (
    <Box>
      {/* ── Score ──────────────────────────────────────────────── */}
      <Box className={`${styles.scoreBand} ${scoreBandClass(score)}`}>
        <Typography className={styles.scoreNumber}>{Math.round(score)}</Typography>
        <Typography className={styles.scoreCaption}>/ 100</Typography>
        <Box sx={{ ml: 'auto', textAlign: 'right' }}>
          <Typography className={styles.scoreCaption}>
            {summary.correct} correcto(s) · {summary.minor} menor(es) · {summary.moderate} moderado(s) · {summary.critical} crítico(s)
          </Typography>
        </Box>
      </Box>

      {/* ── Comparación paramétrica (OE2) ──────────────────────── */}
      <Box className={styles.card}>
        <Typography variant="h6" className={styles.cardTitle}>
          Comparación con el experto
        </Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Parámetro</th>
                <th>Tu valor</th>
                <th>Experto</th>
                <th>Dif.</th>
                <th>Clasificación</th>
              </tr>
            </thead>
            <tbody>
              {(comparison?.parameters ?? []).map((p) => {
                const meta = PARAM_META[p.parameter] ?? { label: p.parameter, unit: '' };
                const badge = CLASS_BADGE[p.errorClassification] ?? CLASS_BADGE.menor;
                return (
                  <tr key={p.parameter}>
                    <td>{meta.label}</td>
                    <td>{displayValue(p.parameter, p.userValue, meta.unit)}</td>
                    <td>{displayValue(p.parameter, p.expertValue, meta.unit)}</td>
                    <td>{p.difference === null || p.difference === undefined ? '—' : p.difference}</td>
                    <td><span className={`${styles.badge} ${badge.cls}`}>{badge.text}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>
        {comparison?.criticalErrors?.length > 0 && (
          <Typography variant="body2" sx={{ mt: 1 }} className={styles.helperRow}>
            Errores críticos: {comparison.criticalErrors.join(', ')}
          </Typography>
        )}
      </Box>

      {/* ── Feedback (OE3) ─────────────────────────────────────── */}
      <Box className={styles.card}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="h6" className={styles.cardTitle}>
            Retroalimentación
          </Typography>
          <span
            className={`${styles.sourceChip} ${
              feedbackSource === 'ia' ? styles.sourceIa : styles.sourceFallback
            }`}
            title={
              feedbackSource === 'ia'
                ? 'Generada por el modelo de lenguaje'
                : 'Generada por reglas determinísticas (sin IA)'
            }
          >
            {feedbackSource === 'ia' ? '🤖 IA' : '⚙ Determinístico'}
          </span>
        </Box>

        <Typography variant="body1" className={styles.feedbackText}>
          {feedback?.text}
        </Typography>

        {feedback?.strengths?.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 1.5 }} className={styles.cardTitle}>Fortalezas</Typography>
            <ul className={styles.listTight}>
              {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </>
        )}

        {feedback?.improvements?.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 1.5 }} className={styles.cardTitle}>Áreas de mejora</Typography>
            <ul className={styles.listTight}>
              {feedback.improvements.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </>
        )}

        {feedback?.recommendations?.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 1.5 }} className={styles.cardTitle}>Recomendaciones</Typography>
            <ul className={styles.listTight}>
              {feedback.recommendations.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </>
        )}

        {feedback?.safetyConcerns?.length > 0 && (
          <Box className={styles.safety}>
            <Typography variant="subtitle2" className={styles.cardTitle}>⚠ Seguridad del paciente</Typography>
            <ul className={styles.listTight}>
              {feedback.safetyConcerns.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </Box>
        )}

        {expertConfiguration?.justification && (
          <>
            <Divider sx={{ my: 2, borderColor: 'rgba(232,244,253,0.12)' }} />
            <Typography variant="subtitle2" className={styles.cardTitle}>Justificación del experto</Typography>
            <Typography variant="body2" className={styles.feedbackText}>
              {expertConfiguration.justification}
            </Typography>
          </>
        )}
      </Box>

      {onRetry && (
        <Button variant="outlined" onClick={onRetry}>
          Probar otra configuración
        </Button>
      )}
    </Box>
  );
}
