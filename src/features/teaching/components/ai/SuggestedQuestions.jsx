import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Chip,
} from '@mui/material';

/**
 * Genera preguntas dinámicas basadas en el contexto de la lección
 */
const generateDynamicQuestions = (lessonContext) => {
  if (!lessonContext) return [];

  const { title, objectives, tags, tipoDeLeccion } = lessonContext;
  const questions = [];

  // Preguntas según tipo de lección
  const tipoDeLeccionMap = {
    teoria: [
      'Explícame los conceptos fundamentales de esta lección con un ejemplo práctico',
      '¿Cómo se relacionan los conceptos teóricos con la práctica clínica?',
      '¿Puedes explicar la ecuación del movimiento con un ejemplo numérico sencillo?',
      '¿Qué factores debo considerar al aplicar esta teoría en un caso real?',
    ],
    caso_clinico: [
      '¿Qué ajuste de PEEP justificarías si la compliancia cae a 25 mL/cmH₂O?',
      '¿Cómo interpretarías estos valores de gasometría y qué acciones tomarías?',
      '¿Qué parámetros modificarías primero ante una hipoxemia refractaria?',
      '¿Cuál sería tu estrategia de destete para este paciente?',
      '¿Cómo evaluarías la respuesta a un cambio de modo ventilatorio?',
    ],
    simulacion: [
      '¿Cómo puedo aplicar esto en la práctica clínica?',
      '¿Qué parámetros debo ajustar para optimizar la ventilación?',
      '¿Qué indicadores debo monitorear durante la simulación?',
      '¿Cómo interpreto los resultados de esta simulación?',
      '¿Qué errores comunes debo evitar en esta configuración?',
    ],
    evaluacion: [
      '¿Qué temas debo repasar antes de la evaluación?',
      '¿Puedes darme ejercicios de práctica sobre los conceptos clave?',
      '¿Cuáles son los puntos más importantes que debo recordar?',
      '¿Cómo puedo prepararme mejor para esta evaluación?',
    ],
  };

  // Agregar preguntas según tipo de lección
  const tipoQuestions = tipoDeLeccionMap[tipoDeLeccion] || [];
  questions.push(...tipoQuestions);

  // Preguntas basadas en objetivos
  if (objectives && objectives.length > 0) {
    const firstObjective = objectives[0];
    if (firstObjective) {
      questions.push(`¿Cómo puedo lograr el objetivo: "${firstObjective}"?`);
    }
  }

  // Preguntas basadas en tags/temas
  if (tags && tags.length > 0) {
    const relevantTags = tags.slice(0, 2); // Tomar los primeros 2 tags
    relevantTags.forEach(tag => {
      if (tipoDeLeccion === 'caso_clinico') {
        questions.push(`¿Cómo manejarías un caso relacionado con ${tag}?`);
      } else if (tipoDeLeccion === 'teoria') {
        questions.push(`Explícame más sobre ${tag} y su importancia clínica`);
      }
    });
  }

  // Pregunta basada en título
  if (title) {
    const titleQuestion = tipoDeLeccion === 'caso_clinico'
      ? `¿Qué estrategia de ventilación usarías para "${title}"?`
      : `¿Cuál es la importancia clínica de "${title}"?`;
    questions.push(titleQuestion);
  }

  // Preguntas generales si no hay suficientes
  const generalQuestions = [
    '¿Puedes explicarme los conceptos clave de esta lección?',
    '¿Qué es lo más importante que debo recordar?',
    '¿Tienes algún consejo práctico para aplicar esto?',
  ];

  // Combinar y limitar a 4-6 preguntas
  const allQuestions = [...questions, ...generalQuestions];
  const uniqueQuestions = Array.from(new Set(allQuestions));
  
  // Seleccionar 4-6 preguntas variadas
  const selectedQuestions = uniqueQuestions.slice(0, 6);
  
  // Si hay menos de 4, completar con generales
  while (selectedQuestions.length < 4 && generalQuestions.length > 0) {
    const remaining = generalQuestions.filter(q => !selectedQuestions.includes(q));
    if (remaining.length > 0) {
      selectedQuestions.push(remaining[0]);
    } else {
      break;
    }
  }

  return selectedQuestions.slice(0, 6);
};

/**
 * SuggestedQuestions - Componente para renderizar preguntas sugeridas
 * 
 * @param {Object} props
 * @param {Object} props.lessonContext - Contexto de la lección
 * @param {string} props.lessonContext.lessonId - ID de la lección
 * @param {string} props.lessonContext.title - Título de la lección
 * @param {string[]} props.lessonContext.objectives - Objetivos de aprendizaje
 * @param {string[]} props.lessonContext.tags - Tags/temas de la lección
 * @param {string} props.lessonContext.tipoDeLeccion - Tipo de lección (teoria | caso_clinico | simulacion | evaluacion)
 * @param {string[]} props.suggestions - Array de preguntas sugeridas del backend
 * @param {Function} props.onPick - Callback cuando se selecciona una pregunta (recibe la pregunta como string)
 */
const SuggestedQuestions = ({ 
  lessonContext, 
  suggestions = [], 
  onPick 
}) => {
  // Generar preguntas dinámicas si suggestions está vacío
  // Refrescar cuando cambie lessonContext o suggestions
  const questions = useMemo(() => {
    // Si hay sugerencias del backend, usarlas
    if (suggestions && suggestions.length > 0) {
      return suggestions;
    }
    // Si no, generar dinámicamente basadas en lessonContext
    return generateDynamicQuestions(lessonContext);
  }, [
    suggestions, 
    lessonContext?.lessonId, 
    lessonContext?.title, 
    lessonContext?.objectives, 
    lessonContext?.tags, 
    lessonContext?.tipoDeLeccion
  ]);

  if (!questions || questions.length === 0) {
    return null;
  }

  const handleQuestionClick = (question) => {
    if (onPick) {
      onPick(question);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        mb: 2,
        px: 1,
      }}
    >
      {questions.map((question, index) => (
        <Chip
          key={`${question}-${index}`}
          label={question}
          onClick={() => handleQuestionClick(question)}
          title={question}
          sx={{
            fontSize: '0.75rem',
            height: 28,
            maxWidth: '100%',
            backgroundColor: 'rgba(11, 186, 244, 0.15)',
            color: '#BBECFC',
            border: '1px solid rgba(11, 186, 244, 0.3)',
            cursor: 'pointer',
            '& .MuiChip-label': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            },
            '&:hover': {
              backgroundColor: 'rgba(11, 186, 244, 0.25)',
              borderColor: 'rgba(11, 186, 244, 0.5)',
            },
            '&:focus-visible': {
              outline: '2px solid #0BBAF4',
              outlineOffset: '2px',
            },
          }}
        />
      ))}
    </Box>
  );
};

SuggestedQuestions.propTypes = {
  lessonContext: PropTypes.shape({
    lessonId: PropTypes.string,
    title: PropTypes.string,
    objectives: PropTypes.arrayOf(PropTypes.string),
    tags: PropTypes.arrayOf(PropTypes.string),
    tipoDeLeccion: PropTypes.oneOf(['teoria', 'caso_clinico', 'simulacion', 'evaluacion']),
  }),
  suggestions: PropTypes.arrayOf(PropTypes.string),
  onPick: PropTypes.func,
};

export default SuggestedQuestions;

