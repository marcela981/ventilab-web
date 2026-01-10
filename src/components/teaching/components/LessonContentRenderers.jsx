"use client";

import React from 'react';
import {
  Box,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import {
  Lightbulb,
  CheckCircle,
  ZoomIn,
  Quiz
} from '@mui/icons-material';

/**
 * TextContentRenderer - Renderiza contenido de tipo texto
 */
export const TextContentRenderer = ({ content }) => (
  <>
    <Typography variant="body1" paragraph sx={{ lineHeight: 1.8, mb: 3 }}>
      {content.text}
    </Typography>

    {content.highlights && (
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          <Lightbulb sx={{ mr: 1, verticalAlign: 'middle' }} />
          Puntos Destacados:
        </Typography>
        <List dense>
          {content.highlights.map((highlight, index) => (
            <ListItem key={index} sx={{ py: 0 }}>
              <ListItemIcon sx={{ minWidth: 20 }}>
                <Typography variant="body2">•</Typography>
              </ListItemIcon>
              <ListItemText
                primary={highlight}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          ))}
        </List>
      </Alert>
    )}
  </>
);

/**
 * MixedContentRenderer - Renderiza contenido mixto (texto + imagen + lista)
 */
export const MixedContentRenderer = ({ content, onImageClick }) => (
  <>
    <Typography variant="body1" paragraph sx={{ lineHeight: 1.8, mb: 3 }}>
      {content.text}
    </Typography>

    {content.image && (
      <Card sx={{ mb: 3, cursor: 'pointer' }} onClick={() => onImageClick(content.image)}>
        <Box
          component="img"
          src={content.image}
          alt={content.imageCaption}
          sx={{
            width: '100%',
            height: 'auto',
            maxHeight: 400,
            objectFit: 'contain',
            '&:hover': { opacity: 0.9 }
          }}
          onError={(e) => {
            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==';
          }}
        />
        <CardContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
            <ZoomIn sx={{ mr: 1, fontSize: 16 }} />
            {content.imageCaption} (Click para ampliar)
          </Typography>
        </CardContent>
      </Card>
    )}

    {content.list && (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <List>
            {content.list.map((item, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  <CheckCircle color="primary" />
                </ListItemIcon>
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    )}
  </>
);

/**
 * InteractiveContentRenderer - Renderiza contenido interactivo (tablas + quiz)
 */
export const InteractiveContentRenderer = ({ content, currentSection, quizAnswers, onQuizAnswer }) => (
  <>
    <Typography variant="body1" paragraph sx={{ lineHeight: 1.8, mb: 3 }}>
      {content.description}
    </Typography>

    {content.tableData && (
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Estructura</strong></TableCell>
              <TableCell><strong>Lóbulos</strong></TableCell>
              <TableCell><strong>Segmentos</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {content.tableData.map((row, index) => (
              <TableRow key={index}>
                <TableCell>{row.structure}</TableCell>
                <TableCell>{row.lobules}</TableCell>
                <TableCell>{row.segments}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )}

    {content.quiz && (
      <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <Quiz sx={{ mr: 1 }} />
          Quiz Rápido
        </Typography>
        <Typography variant="body1" gutterBottom>
          {content.quiz.question}
        </Typography>
        <RadioGroup
          value={quizAnswers[currentSection.id] || ''}
          onChange={(e) => onQuizAnswer(currentSection.id, e.target.value)}
        >
          {content.quiz.options.map((option, index) => (
            <FormControlLabel
              key={index}
              value={index.toString()}
              control={<Radio />}
              label={option}
            />
          ))}
        </RadioGroup>
        {quizAnswers[currentSection.id] !== undefined && (
          <Alert
            severity={quizAnswers[currentSection.id] == content.quiz.correct ? 'success' : 'error'}
            sx={{ mt: 2 }}
          >
            {quizAnswers[currentSection.id] == content.quiz.correct
              ? '¡Correcto! ' + content.quiz.explanation
              : 'Incorrecto. ' + content.quiz.explanation
            }
          </Alert>
        )}
      </Card>
    )}
  </>
);

/**
 * LessonContentRenderer - Componente principal que selecciona el renderer apropiado
 */
const LessonContentRenderer = ({ currentSection, quizAnswers, onQuizAnswer, onImageClick }) => {
  if (!currentSection) {
    return <Typography>No hay contenido disponible</Typography>;
  }

  switch (currentSection.type) {
    case 'text':
      return <TextContentRenderer content={currentSection.content} />;
    case 'mixed':
      return <MixedContentRenderer content={currentSection.content} onImageClick={onImageClick} />;
    case 'interactive':
      return (
        <InteractiveContentRenderer
          content={currentSection.content}
          currentSection={currentSection}
          quizAnswers={quizAnswers}
          onQuizAnswer={onQuizAnswer}
        />
      );
    default:
      return <Typography>Tipo de contenido no soportado</Typography>;
  }
};

export default LessonContentRenderer;
