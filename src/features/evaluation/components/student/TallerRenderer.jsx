/*
 * Funcionalidad: Renderizador de Taller (workshop guiado)
 * Descripción: Muestra una pregunta a la vez (paginado) con navegación paso a paso.
 *              Incluye botón "Pista 💡" para revelar pistas contextuales.
 *              Tras responder, muestra explicación detallada sin importar si la
 *              respuesta fue correcta o incorrecta. Tono amigable y educativo.
 *              Sin temporizador. Barra de progreso "Paso X de Y".
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
  FormControl,
  FormControlLabel,
  LinearProgress,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import ResultsScreen from './ResultsScreen';
import evalStyles from '@/features/evaluation/UI/evaluation.module.css';

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

function getHintText(question) {
  if (question.hint) return question.hint;
  if (question.explanation) return question.explanation;
  return `Recuerda: analiza cuidadosamente "${question.text}" y piensa en los conceptos clave del módulo.`;
}

function optionClass(opt, selectedId, revealed) {
  const base = evalStyles.optionRow;
  if (!revealed) {
    if (selectedId === opt.id) return `${base} ${evalStyles.optionRowSelected}`;
    return base;
  }
  if (opt.isCorrect) return `${base} ${evalStyles.optionRowCorrect}`;
  if (selectedId === opt.id && !opt.isCorrect) return `${base} ${evalStyles.optionRowWrong}`;
  return base;
}

function correctOptionText(question) {
  const correct = question.options?.find((o) => o.isCorrect);
  return correct ? correct.text : '';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TallerRenderer({ questions, passingScore, onSubmitted }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [hintVisible, setHintVisible] = useState({});
  const [result, setResult] = useState(null);

  const current = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const currentAnswered = Boolean(current && answers[current.id]);
  const currentRevealed = Boolean(current && revealed[current.id]);
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleSelect = (optionId) => {
    if (currentRevealed) return;
    setAnswers((prev) => ({ ...prev, [current.id]: optionId }));
    setRevealed((prev) => ({ ...prev, [current.id]: true }));
  };

  const handleNext = () => setCurrentIndex((i) => Math.min(i + 1, questions.length - 1));
  const handlePrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));

  const toggleHint = () => {
    setHintVisible((prev) => ({ ...prev, [current.id]: !prev[current.id] }));
  };

  const handleSubmit = () => {
    const { score, correct, total } = calcAutoScore(questions, answers);
    const passed = score !== null ? score >= passingScore : null;
    setResult({ score, correct, total, passed });
    onSubmitted?.({ answers, score, correct, total, passed });
  };

  // ── Results ────────────────────────────────────────────────────────────────
  if (result) {
    return (
      <ResultsScreen
        score={result.score}
        correct={result.correct}
        total={result.total}
        passed={result.passed}
        showEmojis
      />
    );
  }

  if (!current) return null;

  const isCorrect = currentRevealed && current.options?.find((o) => o.id === answers[current.id])?.isCorrect;

  // ── Taller body — paginated ────────────────────────────────────────────────
  return (
    <Box className={evalStyles.tallerContainer}>
      {/* Progress */}
      <Box className={evalStyles.progressRow}>
        <Typography className={evalStyles.progressLabel}>
          Paso {currentIndex + 1} de {questions.length}
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

        {/* Hint button */}
        {!currentRevealed && (
          <Button
            variant="text"
            className={evalStyles.hintBtn}
            onClick={toggleHint}
          >
            {hintVisible[current.id] ? 'Ocultar pista' : 'Pista 💡'}
          </Button>
        )}

        {/* Hint content */}
        {hintVisible[current.id] && (
          <Box className={evalStyles.hintBox}>
            <Typography className={evalStyles.hintText}>
              {getHintText(current)}
            </Typography>
          </Box>
        )}

        {/* Options */}
        <FormControl component="fieldset" fullWidth>
          <RadioGroup
            value={answers[current.id] ?? ''}
            onChange={(e) => handleSelect(e.target.value)}
          >
            {(current.options ?? []).map((opt) => (
              <FormControlLabel
                key={opt.id}
                value={opt.id}
                disabled={currentRevealed}
                className={optionClass(opt, answers[current.id], currentRevealed)}
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

        {/* Taller feedback — always show explanation after answering */}
        {currentRevealed && (
          <Box
            className={
              isCorrect
                ? evalStyles.quizFeedbackCorrect
                : evalStyles.quizFeedbackWrong
            }
          >
            <Typography className={evalStyles.quizFeedbackText}>
              {isCorrect
                ? '¡Muy bien! 🌟'
                : `La respuesta correcta era "${correctOptionText(current)}".`}
            </Typography>
          </Box>
        )}

        {currentRevealed && (
          <Box className={evalStyles.explanationBox}>
            <Typography className={evalStyles.explanationText}>
              {current.explanation
                ? current.explanation
                : `La opción correcta es "${correctOptionText(current)}". Revisa el material del módulo para profundizar en este tema.`}
            </Typography>
          </Box>
        )}
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
          <Button
            variant="contained"
            disabled={!currentAnswered}
            onClick={handleSubmit}
            className={evalStyles.submitBtn}
          >
            Enviar taller
          </Button>
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

