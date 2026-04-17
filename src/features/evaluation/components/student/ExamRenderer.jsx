/*
 * Funcionalidad: Renderizador de Examen (evaluación formal)
 * Descripción: Muestra una pregunta a la vez (paginado) con temporizador regresivo.
 *              Sin pistas, sin retroalimentación inmediata, sin revelar respuestas
 *              durante el examen. Auto-envía al agotarse el tiempo.
 *              Temporizador: blanco → amarillo (< 10 min) → rojo (< 5 min).
 *              Resultados mostrados sólo después del envío. Tono serio (sin emojis).
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  LinearProgress,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import ResultsScreen from './ResultsScreen';
import evalStyles from '@/features/evaluation/UI/evaluation.module.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_TIME_LIMIT_MINUTES = 45;
const WARNING_THRESHOLD_SECONDS = 10 * 60; // 10 minutes
const DANGER_THRESHOLD_SECONDS = 5 * 60;   // 5 minutes

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcAutoScore(questions, answers) {
  const total = questions.length;
  if (total === 0) return { score: null, correct: 0, total: 0 };
  let correct = 0;
  for (const q of questions) {
    const selectedId = answers[q.id];
    if (!selectedId) continue;
    const opt = q.options?.find((o) => o.id === selectedId);
    if (opt?.isCorrect) correct++;
  }
  return { score: (correct / total) * 100, correct, total };
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function timerClass(secondsLeft) {
  if (secondsLeft <= DANGER_THRESHOLD_SECONDS) return evalStyles.timerDanger;
  if (secondsLeft <= WARNING_THRESHOLD_SECONDS) return evalStyles.timerWarning;
  return evalStyles.timerNormal;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExamRenderer({ questions, passingScore, timeLimit, onSubmitted }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const timeLimitMinutes = timeLimit ?? DEFAULT_TIME_LIMIT_MINUTES;
  const [timeLeft, setTimeLeft] = useState(timeLimitMinutes * 60);

  const current = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const currentAnswered = Boolean(current && answers[current.id]);
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const unansweredCount = questions.filter((q) => !answers[q.id]).length;

  // ── Submit logic (stable ref for timer) ────────────────────────────────────
  const handleSubmit = useCallback(() => {
    const { score, correct, total } = calcAutoScore(questions, answers);
    const passed = score !== null ? score >= passingScore : null;
    setResult({ score, correct, total, passed });
    onSubmitted?.();
  }, [questions, answers, passingScore, onSubmitted]);

  const submitRef = useRef(handleSubmit);
  submitRef.current = handleSubmit;

  // ── Timer effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (result) return;
    if (timeLeft <= 0) {
      submitRef.current();
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, result]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNext = () => setCurrentIndex((i) => Math.min(i + 1, questions.length - 1));
  const handlePrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));

  const handleSelect = (optionId) => {
    setAnswers((prev) => ({ ...prev, [current.id]: optionId }));
  };

  // ── Results ────────────────────────────────────────────────────────────────
  if (result) {
    return (
      <ResultsScreen
        score={result.score}
        correct={result.correct}
        total={result.total}
        passed={result.passed}
        showEmojis={false}
      />
    );
  }

  if (!current) return null;

  // ── Exam body — paginated with timer ───────────────────────────────────────
  return (
    <Box className={evalStyles.examContainer}>
      {/* Progress + timer row */}
      <Box className={evalStyles.progressRow}>
        <Typography className={evalStyles.progressLabel}>
          Pregunta {currentIndex + 1} de {questions.length}
        </Typography>
        <Typography className={timerClass(timeLeft)}>
          ⏱ {formatTime(timeLeft)}
        </Typography>
      </Box>

      <LinearProgress
        variant="determinate"
        value={progress}
        className={evalStyles.progressBarMui}
      />

      {/* Question card */}
      <Box className={evalStyles.questionCard}>
        <Typography className={evalStyles.questionLabel}>Pregunta</Typography>
        <Typography className={evalStyles.questionTextHeading}>
          {current.text}
        </Typography>

        <FormControl component="fieldset" fullWidth>
          <RadioGroup
            value={answers[current.id] ?? ''}
            onChange={(e) => handleSelect(e.target.value)}
          >
            {(current.options ?? []).map((opt) => (
              <FormControlLabel
                key={opt.id}
                value={opt.id}
                className={
                  answers[current.id] === opt.id
                    ? `${evalStyles.optionRow} ${evalStyles.optionRowSelected}`
                    : evalStyles.optionRow
                }
                control={<Radio size="small" className={evalStyles.radioBtn} />}
                label={
                  <Typography className={evalStyles.optionText}>
                    {opt.text}
                  </Typography>
                }
              />
            ))}
          </RadioGroup>
        </FormControl>
      </Box>

      {/* Navigation */}
      <Box className={evalStyles.navigationRow}>
        <Button
          variant="outlined"
          disabled={currentIndex === 0}
          onClick={handlePrev}
          className={evalStyles.navBtn}
        >
          Anterior
        </Button>

        {isLast ? (
          <Box className={evalStyles.submitRow}>
            {unansweredCount > 0 && (
              <Typography className={evalStyles.unansweredWarning}>
                {unansweredCount} pregunta{unansweredCount > 1 ? 's' : ''} sin responder
              </Typography>
            )}
            <Button
              variant="contained"
              onClick={handleSubmit}
              className={evalStyles.submitBtn}
            >
              Enviar examen
            </Button>
          </Box>
        ) : (
          <Button
            variant="contained"
            disabled={!currentAnswered}
            onClick={handleNext}
            className={evalStyles.navBtn}
          >
            Siguiente
          </Button>
        )}
      </Box>
    </Box>
  );
}

ExamRenderer.propTypes = {
  questions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          text: PropTypes.string.isRequired,
          isCorrect: PropTypes.bool,
        })
      ),
    })
  ).isRequired,
  passingScore: PropTypes.number,
  timeLimit: PropTypes.number,
  onSubmitted: PropTypes.func,
};

ExamRenderer.defaultProps = {
  passingScore: 70,
};
