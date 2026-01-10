/**
 * Content Generator Panel
 * Componente para que profesores generen contenido educativo clínico
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import {
  generateContent,
  generateAndSaveLesson,
  previewContent,
  validateContext,
  countMissingFields
} from '../../services/contentGenerator';

const ContentGeneratorPanel = ({ moduleId, onLessonCreated }) => {
  const [context, setContext] = useState({
    topic: '',
    level: 'Beginner',
    learningObjectives: [''],
    keyPoints: [''],
    parameters: [''],
    ranges: {},
    clinicalScenarios: [''],
    references: [''],
    text: '',
    videoUrl: '',
    diagrams: [''],
    tables: ['']
  });

  const [order, setOrder] = useState(1);
  const [estimatedTime, setEstimatedTime] = useState(60);

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [warnings, setWarnings] = useState([]);

  /**
   * Maneja cambios en campos simples
   */
  const handleChange = (field, value) => {
    setContext((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Maneja cambios en arrays
   */
  const handleArrayChange = (field, index, value) => {
    setContext((prev) => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  /**
   * Agrega un elemento a un array
   */
  const addArrayItem = (field) => {
    setContext((prev) => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  /**
   * Elimina un elemento de un array
   */
  const removeArrayItem = (field, index) => {
    setContext((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  /**
   * Agrega un rango de parámetros
   */
  const addRange = (param, min, max) => {
    setContext((prev) => ({
      ...prev,
      ranges: {
        ...prev.ranges,
        [param]: [parseFloat(min), parseFloat(max)]
      }
    }));
  };

  /**
   * Genera vista previa del contenido
   */
  const handlePreview = async () => {
    setError(null);
    setSuccess(null);
    setWarnings([]);

    // Validar contexto
    const validation = validateContext(context);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    setLoading(true);

    try {
      // Limpiar arrays vacíos
      const cleanedContext = {
        ...context,
        learningObjectives: context.learningObjectives.filter(obj => obj.trim() !== ''),
        keyPoints: context.keyPoints.filter(kp => kp.trim() !== ''),
        parameters: context.parameters.filter(p => p.trim() !== ''),
        clinicalScenarios: context.clinicalScenarios.filter(cs => cs.trim() !== ''),
        references: context.references.filter(ref => ref.trim() !== ''),
        diagrams: context.diagrams.filter(d => d.trim() !== ''),
        tables: context.tables.filter(t => t.trim() !== '')
      };

      const result = await previewContent(cleanedContext);

      if (result.data) {
        setPreview(result.data.preview);
        setWarnings(result.data.warnings || []);
        
        const missingCount = countMissingFields(result.data.preview);
        if (missingCount > 0) {
          setWarnings((prev) => [
            ...prev,
            `⚠️ Se encontraron ${missingCount} campo(s) con información faltante marcados como [[MISSING]]`
          ]);
        }

        setSuccess('Vista previa generada exitosamente');
      }
    } catch (err) {
      setError(err.message || 'Error al generar vista previa');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Genera y guarda la lección
   */
  const handleGenerateAndSave = async () => {
    setError(null);
    setSuccess(null);
    setWarnings([]);

    // Validar contexto
    const validation = validateContext(context);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    if (!moduleId) {
      setError('Debe especificar un módulo (moduleId)');
      return;
    }

    setLoading(true);

    try {
      // Limpiar arrays vacíos
      const cleanedContext = {
        ...context,
        learningObjectives: context.learningObjectives.filter(obj => obj.trim() !== ''),
        keyPoints: context.keyPoints.filter(kp => kp.trim() !== ''),
        parameters: context.parameters.filter(p => p.trim() !== ''),
        clinicalScenarios: context.clinicalScenarios.filter(cs => cs.trim() !== ''),
        references: context.references.filter(ref => ref.trim() !== ''),
        diagrams: context.diagrams.filter(d => d.trim() !== ''),
        tables: context.tables.filter(t => t.trim() !== '')
      };

      const result = await generateAndSaveLesson({
        context: cleanedContext,
        moduleId,
        order,
        estimatedTime
      });

      if (result.data) {
        setWarnings(result.data.warnings || []);
        setSuccess('Lección generada y guardada exitosamente');
        setPreview(null);

        // Notificar al componente padre
        if (onLessonCreated) {
          onLessonCreated(result.data.lesson);
        }

        // Reiniciar formulario
        resetForm();
      }
    } catch (err) {
      setError(err.message || 'Error al generar y guardar la lección');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reinicia el formulario
   */
  const resetForm = () => {
    setContext({
      topic: '',
      level: 'Beginner',
      learningObjectives: [''],
      keyPoints: [''],
      parameters: [''],
      ranges: {},
      clinicalScenarios: [''],
      references: [''],
      text: '',
      videoUrl: '',
      diagrams: [''],
      tables: ['']
    });
    setOrder(order + 1);
    setPreview(null);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <AutoAwesomeIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h5">
          Generador de Contenido Educativo Clínico
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Complete el contexto para generar una lección estructurada. Solo se usará la información proporcionada.
        Los campos vacíos se marcarán como [[MISSING]].
      </Typography>

      {/* Alertas */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {warnings.map((warning, idx) => (
            <div key={idx}>{warning}</div>
          ))}
        </Alert>
      )}

      {/* Campos básicos */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            required
            label="Tema de la Lección"
            value={context.topic}
            onChange={(e) => handleChange('topic', e.target.value)}
            placeholder="Ej: Ventilación Controlada por Volumen"
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <FormControl fullWidth required>
            <InputLabel>Nivel</InputLabel>
            <Select
              value={context.level}
              label="Nivel"
              onChange={(e) => handleChange('level', e.target.value)}
            >
              <MenuItem value="Beginner">Principiante</MenuItem>
              <MenuItem value="Intermediate">Intermedio</MenuItem>
              <MenuItem value="Advanced">Avanzado</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="number"
            label="Orden en el Módulo"
            value={order}
            onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
            InputProps={{ inputProps: { min: 1 } }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="number"
            label="Tiempo Estimado (minutos)"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 60)}
            InputProps={{ inputProps: { min: 1 } }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Contenido Base / Introducción"
            value={context.text}
            onChange={(e) => handleChange('text', e.target.value)}
            placeholder="Texto introductorio o contenido base de la lección..."
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Secciones expandibles */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Objetivos de Aprendizaje</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {context.learningObjectives.map((obj, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                value={obj}
                onChange={(e) => handleArrayChange('learningObjectives', idx, e.target.value)}
                placeholder="Ej: Comprender el funcionamiento de VCV"
              />
              <IconButton
                color="error"
                onClick={() => removeArrayItem('learningObjectives', idx)}
                disabled={context.learningObjectives.length === 1}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={() => addArrayItem('learningObjectives')}
            variant="outlined"
            size="small"
          >
            Agregar Objetivo
          </Button>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Puntos Clave</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {context.keyPoints.map((kp, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                value={kp}
                onChange={(e) => handleArrayChange('keyPoints', idx, e.target.value)}
                placeholder="Ej: Volumen constante"
              />
              <IconButton
                color="error"
                onClick={() => removeArrayItem('keyPoints', idx)}
                disabled={context.keyPoints.length === 1}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={() => addArrayItem('keyPoints')}
            variant="outlined"
            size="small"
          >
            Agregar Punto Clave
          </Button>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Parámetros Clínicos</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {context.parameters.map((param, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                value={param}
                onChange={(e) => handleArrayChange('parameters', idx, e.target.value)}
                placeholder="Ej: Vt, PEEP, FiO2"
              />
              <IconButton
                color="error"
                onClick={() => removeArrayItem('parameters', idx)}
                disabled={context.parameters.length === 1}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={() => addArrayItem('parameters')}
            variant="outlined"
            size="small"
          >
            Agregar Parámetro
          </Button>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Escenarios Clínicos</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {context.clinicalScenarios.map((scenario, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                value={scenario}
                onChange={(e) => handleArrayChange('clinicalScenarios', idx, e.target.value)}
                placeholder="Ej: paciente con ARDS"
              />
              <IconButton
                color="error"
                onClick={() => removeArrayItem('clinicalScenarios', idx)}
                disabled={context.clinicalScenarios.length === 1}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={() => addArrayItem('clinicalScenarios')}
            variant="outlined"
            size="small"
          >
            Agregar Escenario
          </Button>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Referencias Bibliográficas</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {context.references.map((ref, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                value={ref}
                onChange={(e) => handleArrayChange('references', idx, e.target.value)}
                placeholder="Ej: ARDSnet Study Group (2000)"
              />
              <IconButton
                color="error"
                onClick={() => removeArrayItem('references', idx)}
                disabled={context.references.length === 1}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Button
            startIcon={<AddIcon />}
            onClick={() => addArrayItem('references')}
            variant="outlined"
            size="small"
          >
            Agregar Referencia
          </Button>
        </AccordionDetails>
      </Accordion>

      {/* Botones de acción */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={20} /> : <PreviewIcon />}
          onClick={handlePreview}
          disabled={loading}
        >
          Vista Previa
        </Button>
        
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleGenerateAndSave}
          disabled={loading || !moduleId}
        >
          Generar y Guardar
        </Button>
      </Box>

      {/* Vista previa del contenido */}
      {preview && (
        <Paper elevation={2} sx={{ p: 2, mt: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>
            Vista Previa del Contenido Generado
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Chip label={`Nivel: ${preview.level}`} color="primary" sx={{ mr: 1 }} />
            <Chip label={`${preview.estimatedTime} minutos`} color="info" sx={{ mr: 1 }} />
            <Chip label={`${preview.sections?.length || 0} secciones`} color="success" />
          </Box>

          <pre style={{
            maxHeight: '400px',
            overflow: 'auto',
            backgroundColor: '#f5f5f5',
            padding: '16px',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            {JSON.stringify(preview, null, 2)}
          </pre>
        </Paper>
      )}
    </Paper>
  );
};

export default ContentGeneratorPanel;

