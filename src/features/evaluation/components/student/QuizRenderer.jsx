/*
 * Funcionalidad: Renderizador de Quiz (evaluación corta)
 * Descripción: Muestra TODAS las preguntas en una página scrollable.
 *              Al seleccionar una opción se revela inmediatamente si es correcta
 *              o incorrecta con retroalimentación visual y textual.
 *              Sin temporizador. Botón de envío al final.
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

function optionClass(opt, selectedId, revealed) {
  const base = evalStyles.optionRow;
  if (!revealed) {
    if (selectedId === opt.id) return `${base} ${evalStyles.optionRowSelected}`;
    return base;
  }
  if (opt.isCorrect) return `${base} ${evalStyles.optionRowCorrect}`;
  if (selectedId === opt.id) return `${base} ${evalStyles.optionRowWrong}`;
  return base;
}

function correctOptionText(question) {
  const correct = question.options?.find((o) => o.isCorrect);
  return correct ? correct.text : '';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function QuizRenderer({ questions, passingScore, onSubmitted }) {
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [result, setResult] = useState(null);

  const handleSelect = (questionId, optionId) => {
    if (revealed[questionId]) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    setRevealed((prev) => ({ ...prev, [questionId]: true }));
  };

  const allAnswered = questions.every((q) => answers[q.id]);

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

  // ── Quiz body — all questions scrollable ───────────────────────────────────
  return (
    <Box className={evalStyles.quizScrollContainer}>
      {questions.map((q, idx) => {
        const isCorrect =
          revealed[q.id] && q.options?.find((o) => o.id === answers[q.id])?.isCorrect;

        return (
          <Box key={q.id} className={evalStyles.questionCard}>
            <Typography className={evalStyles.questionLabel}>
              Pregunta {idx + 1} de {questions.length}
            </Typography>

            <Typography className={evalStyles.questionTextHeading}>
              {q.text}
            </Typography>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={answers[q.id] ?? ''}
                onChange={(e) => handleSelect(q.id, e.target.value)}
              >
                {(q.options ?? []).map((opt) => (
                  <FormControlLabel
                    key={opt.id}
                    value={opt.id}
                    disabled={Boolean(revealed[q.id])}
                    className={optionClass(opt, answers[q.id], revealed[q.id])}
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

            {/* Immediate feedback */}
            {revealed[q.id] && (
              <Box
                className={
                  isCorrect
                    ? evalStyles.quizFeedbackCorrect
                    : evalStyles.quizFeedbackWrong
                }
              >
                <Typography className={evalStyles.quizFeedbackText}>
                  {isCorrect
                    ? '¡Correcto! 🎉'
                    : `Casi. La respuesta correcta era "${correctOptionText(q)}"`}
                </Typography>
              </Box>
            )}

            {/* Explanation if available */}
            {revealed[q.id] && q.explanation && (
              <Box className={evalStyles.explanationBox}>
                <Typography className={evalStyles.explanationText}>
                  {q.explanation}
                </Typography>
              </Box>
            )}
          </Box>
        );
      })}

      {/* Submit row */}
      <Box className={evalStyles.submitRow}>
        <Button
          variant="contained"
          disabled={!allAnswered}
          onClick={handleSubmit}
          className={evalStyles.submitBtn}
        >
          Enviar quiz
        </Button>
      </Box>
    </Box>
  );
}

