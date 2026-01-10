/**
 * =============================================================================
 * ExpertComparison Component
 * =============================================================================
 * 
 * Componente que muestra un resumen final comparando las respuestas del
 * estudiante con las elecciones del experto. Incluye puntaje total, tabla
 * comparativa por decisión y análisis por dominios clínicos.
 * 
 * @component
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

// =============================================================================
// Strings for i18n (centralized for future translation)
// =============================================================================
const strings = {
  grade: {
    excellent: 'Excelente',
    adequate: 'Adecuado',
    needsImprovement: 'Por mejorar',
  },
  match: {
    notAnswered: 'No respondida',
    perfect: 'Coincide totalmente',
    partial: 'Coincide parcialmente',
    none: 'No coincide',
    notSelected: 'No seleccionada',
  },
  notAvailable: 'No disponible',
  comparison: {
    title: 'Comparación por Decisión',
    subtitle: 'Comparación de tus respuestas con las elecciones del experto',
    table: {
      question: 'Pregunta',
      studentSelection: 'Tu Selección',
      expertSelection: 'Elección del Experto',
      expertRationale: 'Rationale del Experto',
    },
  },
  domainAnalysis: {
    title: 'Análisis por Dominios Clínicos',
    progress: 'Progreso',
    decisions: (count) => `${count} decisión(es) evaluada(s)`,
    recommendations: 'Recomendaciones:',
    excellent: 'Excelente desempeño en este dominio. Continúa así.',
    ariaProgress: (domain, percentage) => `Progreso en ${domain}: ${percentage}%`,
  },
  aria: {
    comparison: 'Comparación con el experto',
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Obtiene calificación textual basada en el puntaje
 */
const getScoreGrade = (score) => {
  if (score >= 85) return { text: strings.grade.excellent, color: 'success', icon: TrophyIcon };
  if (score >= 70) return { text: strings.grade.adequate, color: 'warning', icon: TrendingUpIcon };
  return { text: strings.grade.needsImprovement, color: 'error', icon: WarningIcon };
};

/**
 * Determina si la selección del estudiante coincide con el experto
 */
const getMatchStatus = (studentSelected, expertSelected) => {
  if (!studentSelected || studentSelected.length === 0) {
    return { type: 'none', label: strings.match.notAnswered, severity: 'error' };
  }

  // Verificar coincidencia exacta
  const studentSet = new Set(studentSelected);
  const expertSet = new Set(expertSelected);

  if (studentSet.size === expertSet.size &&
      [...studentSet].every(id => expertSet.has(id))) {
    return { type: 'perfect', label: strings.match.perfect, severity: 'success' };
  }

  // Verificar coincidencia parcial
  const intersection = [...studentSet].filter(id => expertSet.has(id));
  if (intersection.length > 0) {
    return { type: 'partial', label: strings.match.partial, severity: 'warning' };
  }

  return { type: 'none', label: strings.match.none, severity: 'error' };
};

/**
 * Obtiene las etiquetas de las opciones seleccionadas
 */
const getOptionLabels = (optionIds, decision) => {
  if (!optionIds || optionIds.length === 0) return strings.match.notSelected;
  
  return optionIds
    .map(id => {
      const option = decision.options.find(opt => opt.id === id);
      return option ? option.label : id;
    })
    .join(', ');
};

/**
 * Obtiene el rationale del experto combinando los rationales de las opciones expertas
 */
const getExpertRationale = (decision) => {
  const expertOptions = decision.options.filter(opt => opt.isExpertChoice);
  
  if (expertOptions.length === 0) return strings.notAvailable;
  
  // Combinar rationales de todas las opciones expertas
  const rationales = expertOptions.map(opt => opt.rationale).filter(Boolean);
  
  if (rationales.length === 0) {
    // Si no hay rationale en las opciones, usar el feedback de la decisión
    return decision.feedback || strings.notAvailable;
  }
  
  return rationales.join(' ');
};

// =============================================================================
// Main Component
// =============================================================================

const ExpertComparison = ({ caseData, answers, score, breakdownByDomain }) => {
  // Calcular calificación
  const grade = useMemo(() => getScoreGrade(score), [score]);

  // Preparar datos para la tabla comparativa
  const comparisonTableData = useMemo(() => {
    if (!caseData || !caseData.steps || !answers) return [];

    const tableRows = [];

    caseData.steps.forEach((step) => {
      step.decisions?.forEach((decision) => {
        const stepAnswer = answers[step.id]?.[decision.id] || [];
        const expertOptionIds = decision.options
          .filter(opt => opt.isExpertChoice)
          .map(opt => opt.id);

        const matchStatus = getMatchStatus(stepAnswer, expertOptionIds);
        const studentLabels = getOptionLabels(stepAnswer, decision);
        const expertLabels = getOptionLabels(expertOptionIds, decision);
        const expertRationale = getExpertRationale(decision);

        tableRows.push({
          decisionId: decision.id,
          prompt: decision.prompt,
          domain: decision.domain || 'general',
          studentSelected: stepAnswer,
          studentLabels,
          expertSelected: expertOptionIds,
          expertLabels,
          expertRationale,
          matchStatus,
          decision,
        });
      });
    });

    return tableRows;
  }, [caseData, answers]);

  // Preparar análisis por dominios
  const domainAnalysis = useMemo(() => {
    if (!breakdownByDomain) return [];

    return Object.entries(breakdownByDomain)
      .map(([domain, data]) => {
        const percentage = data.maxScore > 0
          ? Math.round((data.totalScore / data.maxScore) * 100)
          : 0;

        // Obtener recomendaciones basadas en decisiones de este dominio
        const domainDecisions = comparisonTableData.filter(
          row => row.domain === domain
        );

        // Encontrar decisiones con bajo desempeño en este dominio
        const poorDecisions = domainDecisions.filter(row => {
          const decisionScore = row.decision.weights
            ? row.studentSelected.reduce((sum, id) => {
                return sum + (row.decision.weights[id] || 0);
              }, 0)
            : 0;
          const maxScore = row.expertSelected.reduce((sum, id) => {
            return sum + (row.decision.weights?.[id] || 0);
          }, 0);
          const decisionPercentage = maxScore > 0
            ? (decisionScore / maxScore) * 100
            : 0;
          return decisionPercentage < 70;
        });

        // Generar recomendaciones
        const recommendations = poorDecisions
          .map(row => {
            // Priorizar feedback de la decisión si está disponible
            if (row.decision.feedback) {
              return {
                text: row.decision.feedback,
                source: 'decision',
              };
            }
            // Usar rationale del experto como alternativa
            if (row.expertRationale && row.expertRationale !== 'No disponible') {
              return {
                text: row.expertRationale,
                source: 'rationale',
              };
            }
            return null;
          })
          .filter(Boolean)
          .slice(0, 2) // Limitar a 2 recomendaciones por dominio
          .map(rec => rec.text);

        return {
          domain,
          totalScore: data.totalScore,
          maxScore: data.maxScore,
          percentage,
          recommendations,
          decisionCount: data.decisions?.length || 0,
        };
      })
      .sort((a, b) => a.percentage - b.percentage); // Ordenar de peor a mejor
  }, [breakdownByDomain, comparisonTableData]);

  const GradeIcon = grade.icon;

  return (
    <Paper
      sx={{
        p: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
      role="region"
      aria-label={strings.aria.comparison}
      tabIndex={0}
    >
      {/* Header con Puntaje Total */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <GradeIcon
          sx={{
            fontSize: 64,
            color: `${grade.color}.main`,
            mb: 2,
          }}
        />
        <Typography variant="h3" component="h2" fontWeight={700} gutterBottom>
          {score}%
        </Typography>
        <Chip
          label={grade.text}
          color={grade.color}
          size="large"
          icon={<GradeIcon />}
          sx={{ fontSize: '1rem', py: 2, px: 1 }}
        />
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          {strings.comparison.subtitle}
        </Typography>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Tabla Comparativa por Decisión */}
      <Box sx={{ mb: 4 }} role="region" aria-label={strings.comparison.title}>
        <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
          {strings.comparison.title}
        </Typography>

        <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
          <Table role="table" aria-label={strings.comparison.title}>
            <TableHead>
              <TableRow>
                <TableCell><strong>{strings.comparison.table.question}</strong></TableCell>
                <TableCell><strong>{strings.comparison.table.studentSelection}</strong></TableCell>
                <TableCell><strong>{strings.comparison.table.expertSelection}</strong></TableCell>
                <TableCell><strong>{strings.comparison.table.expertRationale}</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {comparisonTableData.map((row, index) => {
                const MatchIcon =
                  row.matchStatus.severity === 'success'
                    ? CheckCircleIcon
                    : row.matchStatus.severity === 'warning'
                    ? WarningIcon
                    : ErrorIcon;

                return (
                  <TableRow key={row.decisionId || index}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {row.prompt}
                      </Typography>
                      {row.domain && (
                        <Chip
                          label={row.domain}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mt: 1 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MatchIcon
                          color={row.matchStatus.severity}
                          fontSize="small"
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            color:
                              row.matchStatus.severity === 'success'
                                ? 'success.main'
                                : row.matchStatus.severity === 'warning'
                                ? 'warning.main'
                                : 'error.main',
                            fontWeight: 500,
                          }}
                        >
                          {row.studentLabels}
                        </Typography>
                      </Box>
                      <Chip
                        label={row.matchStatus.label}
                        size="small"
                        color={row.matchStatus.severity}
                        variant="outlined"
                        sx={{ mt: 0.5 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleIcon color="success" fontSize="small" />
                        <Typography variant="body2" fontWeight={500}>
                          {row.expertLabels}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {row.expertRationale}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Panel de Análisis por Dominios */}
      <Box role="region" aria-label={strings.domainAnalysis.title}>
        <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
          {strings.domainAnalysis.title}
        </Typography>

        <Grid container spacing={3}>
          {domainAnalysis.map((domainData) => {
            const domainGrade = getScoreGrade(domainData.percentage);
            const DomainIcon = domainGrade.icon;

            return (
              <Grid item xs={12} md={6} key={domainData.domain}>
                <Card
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    height: '100%',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <DomainIcon color={domainGrade.color} />
                      <Typography variant="h6" fontWeight={600}>
                        {domainData.domain}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          mb: 1,
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {strings.domainAnalysis.progress}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {domainData.percentage}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={domainData.percentage}
                        color={domainGrade.color}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                        }}
                        role="progressbar"
                        aria-valuenow={domainData.percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={strings.domainAnalysis.ariaProgress(domainData.domain, domainData.percentage)}
                      />
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                      {strings.domainAnalysis.decisions(domainData.decisionCount)}
                    </Typography>

                    {domainData.recommendations && domainData.recommendations.length > 0 && (
                      <Box sx={{ mt: 2 }} role="region" aria-label={strings.domainAnalysis.recommendations}>
                        <Typography
                          variant="subtitle2"
                          fontWeight={600}
                          gutterBottom
                          color={domainGrade.color}
                        >
                          {strings.domainAnalysis.recommendations}
                        </Typography>
                        {domainData.recommendations.map((rec, idx) => (
                          <Alert
                            key={idx}
                            severity={domainGrade.color}
                            sx={{ mt: 1 }}
                            icon={<WarningIcon />}
                          >
                            <Typography variant="body2">{rec}</Typography>
                          </Alert>
                        ))}
                      </Box>
                    )}

                    {domainData.percentage >= 85 && (
                      <Alert severity="success" sx={{ mt: 2 }} role="alert" aria-live="polite">
                        <Typography variant="body2">
                          {strings.domainAnalysis.excellent}
                        </Typography>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </Paper>
  );
};

ExpertComparison.propTypes = {
  /**
   * Datos del caso clínico completo
   */
  caseData: PropTypes.shape({
    id: PropTypes.string,
    moduleId: PropTypes.string,
    title: PropTypes.string,
    steps: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        title: PropTypes.string,
        decisions: PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string,
            prompt: PropTypes.string,
            domain: PropTypes.string,
            type: PropTypes.oneOf(['single', 'multi']),
            options: PropTypes.arrayOf(
              PropTypes.shape({
                id: PropTypes.string,
                label: PropTypes.string,
                rationale: PropTypes.string,
                isExpertChoice: PropTypes.bool,
              })
            ),
            weights: PropTypes.objectOf(PropTypes.number),
            feedback: PropTypes.string,
          })
        ),
      })
    ),
  }).isRequired,

  /**
   * Respuestas del estudiante
   * Formato: { stepId: { decisionId: [optionIds] } }
   */
  answers: PropTypes.objectOf(
    PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string))
  ).isRequired,

  /**
   * Puntaje total normalizado (0-100)
   */
  score: PropTypes.number.isRequired,

  /**
   * Desglose de resultados por dominio
   * Formato: { domain: { totalScore, maxScore, decisions: [...] } }
   */
  breakdownByDomain: PropTypes.objectOf(
    PropTypes.shape({
      totalScore: PropTypes.number,
      maxScore: PropTypes.number,
      decisions: PropTypes.array,
    })
  ).isRequired,
};

export default ExpertComparison;

