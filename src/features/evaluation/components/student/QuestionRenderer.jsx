/*
 * Funcionalidad: Renderizador de Pregunta Individual
 * Descripción: Componente presentacional que renderiza una pregunta según su tipo:
 *              selección múltiple, verdadero/falso, texto abierto o caso clínico.
 *              Soporta modo examen (sin retroalimentación inmediata) y modo quiz
 *              (retroalimentación correcta/incorrecta inmediata tras seleccionar).
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import React from 'react';
import {
  Box,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import evalStyles from '@/features/evaluation/UI/evaluation.module.css';

/**
 * Returns the CSS class for a multiple-choice option row based on current state.
 */
function optionClass(opt, selectedId, isQuiz, revealed) {
  const base = evalStyles.optionRow;
  if (isQuiz && revealed) {
    if (opt.isCorrect) return `${base} ${evalStyles.optionRowCorrect}`;
    if (selectedId === opt.id) return `${base} ${evalStyles.optionRowWrong}`;
    return base;
  }
  if (selectedId === opt.id) return `${base} ${evalStyles.optionRowSelected}`;
  return base;
}

/**
 * Renders a radio-group for multiple_choice / case_study / true_false questions.
 */
function ChoiceGroup({ options, value, disabled, onChange, isQuiz, revealed }) {
  return (
    <FormControl component="fieldset" fullWidth>
      <RadioGroup
        value={value ?? ''}
        onChange={(e) => !disabled && onChange(e.target.value)}
      >
        {options.map((opt) => (
          <FormControlLabel
            key={opt.id}
            value={opt.id}
            disabled={disabled}
            className={optionClass(opt, value, isQuiz, revealed)}
            control={<Radio size="small" />}
            label={
              <Box className={evalStyles.optionContent}>
                <Typography className={evalStyles.optionText}>{opt.text}</Typography>
                {isQuiz && revealed && opt.isCorrect && (
                  <Typography
                    className={`${evalStyles.optionFeedback} ${evalStyles.optionFeedbackCorrect}`}
                  >
                    Respuesta correcta
                  </Typography>
                )}
                {isQuiz && revealed && value === opt.id && !opt.isCorrect && (
                  <Typography
                    className={`${evalStyles.optionFeedback} ${evalStyles.optionFeedbackWrong}`}
                  >
                    Respuesta incorrecta
                  </Typography>
                )}
              </Box>
            }
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders a single question card.
 *
 * @param {object}   question  - Question data object
 * @param {string}   value     - Current answer value (optionId or text)
 * @param {function} onChange  - Called with new answer value
 * @param {'exam'|'quiz'} mode - Exam = no immediate feedback; quiz = show result on select
 * @param {boolean}  revealed  - Whether this question's answer has been revealed (quiz)
 * @param {boolean}  locked    - Read-only (submission already submitted)
 */
export default function QuestionRenderer({ question, value, onChange, mode, revealed, locked }) {
  const isQuiz = mode === 'quiz';
  const isInteractive = !locked && !(isQuiz && revealed);
  const hasChoices = Array.isArray(question.options) && question.options.length > 0;

  return (
    <Box className={evalStyles.questionCard}>
      <Typography className={evalStyles.questionLabel}>Pregunta</Typography>

      {/* Case study context */}
      {question.type === 'case_study' && (question.patientInfo || question.caseDescription) && (
        <Box className={evalStyles.caseStudyBox}>
          <Typography className={evalStyles.caseStudyLabel}>Caso clínico</Typography>
          {question.patientInfo && (
            <Typography className={evalStyles.caseStudyPatient}>{question.patientInfo}</Typography>
          )}
          {question.caseDescription && (
            <Typography className={evalStyles.caseStudyScenario}>{question.caseDescription}</Typography>
          )}
        </Box>
      )}

      <Typography variant="h6" className={evalStyles.questionTextHeading} gutterBottom>
        {question.text}
      </Typography>

      {/* Multiple choice / case study with options */}
      {(question.type === 'multiple_choice' || question.type === 'case_study') && hasChoices && (
        <ChoiceGroup
          options={question.options}
          value={value}
          disabled={!isInteractive}
          onChange={onChange}
          isQuiz={isQuiz}
          revealed={revealed}
        />
      )}

      {/* True / false */}
      {question.type === 'true_false' && (
        <FormControl component="fieldset">
          <RadioGroup
            value={value ?? ''}
            onChange={(e) => isInteractive && onChange(e.target.value)}
          >
            <FormControlLabel
              value="true"
              control={<Radio size="small" className={evalStyles.radioBtn} />}
              label={<Typography className={evalStyles.optionText}>Verdadero</Typography>}
              disabled={!isInteractive}
              className={evalStyles.optionRow}
            />
            <FormControlLabel
              value="false"
              control={<Radio size="small" className={evalStyles.radioBtn} />}
              label={<Typography className={evalStyles.optionText}>Falso</Typography>}
              disabled={!isInteractive}
              className={evalStyles.optionRow}
            />
          </RadioGroup>
        </FormControl>
      )}

      {/* Open text */}
      {question.type === 'open_text' && (
        <TextField
          className={evalStyles.openTextField}
          multiline
          minRows={4}
          value={value ?? ''}
          onChange={(e) => !locked && onChange(e.target.value)}
          disabled={locked}
          placeholder="Escribe tu respuesta aquí..."
          variant="outlined"
        />
      )}

      {/* Quiz explanation shown after answer is revealed */}
      {isQuiz && revealed && question.explanation && (
        <Box className={evalStyles.explanationBox}>
          <Typography className={evalStyles.explanationText}>{question.explanation}</Typography>
        </Box>
      )}
    </Box>
  );
}

