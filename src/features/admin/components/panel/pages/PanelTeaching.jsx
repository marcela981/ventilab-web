/**
 * PanelTeaching - Teaching Content Manager
 * Hierarchy: Level → Module → Lesson → Steps (Cards)
 * Teachers can create/edit. Admins/Superusers can also delete.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, Tooltip, Chip, Alert,
  Accordion, AccordionSummary, AccordionDetails,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, InputLabel, FormControl,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  CircularProgress, Divider, Stack, Drawer,
  Radio, RadioGroup, FormControlLabel, FormLabel,
  Checkbox, FormGroup,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon, MenuBook as MenuBookIcon,
  Folder as FolderIcon, Article as ArticleIcon,
  Image as ImageIcon, VideoLibrary as VideoIcon,
  Quiz as QuizIcon, TextFields as TextIcon,
  History as HistoryIcon, DragIndicator as DragIcon,
  ArrowUpward as UpIcon, ArrowDownward as DownIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';
import { useAuth } from '@/shared/contexts/AuthContext';
import teachingService from '@/features/admin/services/teachingService';

// ── Constants ─────────────────────────────────────────────────────────────────
const TRACKS = [
  { value: 'mecanica', label: 'Mecánica' },
  { value: 'ventylab', label: 'VentyLab' },
];
const DIFFICULTIES = [
  { value: 'prerequisitos', label: 'Prerequisitos' },
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
];
const STEP_TYPES = [
  { value: 'text', label: 'Texto', icon: <TextIcon fontSize="small" /> },
  { value: 'image', label: 'Imagen (URL)', icon: <ImageIcon fontSize="small" /> },
  { value: 'video', label: 'Video (URL)', icon: <VideoIcon fontSize="small" /> },
  { value: 'quiz', label: 'Pregunta', icon: <QuizIcon fontSize="small" /> },
];
const QUESTION_TYPES = [
  { value: 'single', label: 'Opción única' },
  { value: 'multiple', label: 'Opción múltiple' },
  { value: 'open', label: 'Respuesta abierta' },
];

const INITIAL_LESSON_CONTENT = JSON.stringify({
  type: 'lesson',
  sections: [{ type: 'text', content: '' }],
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseQuizContent = (content) => {
  try {
    const p = typeof content === 'string' ? JSON.parse(content) : content;
    return { question: '', questionType: 'single', options: [{ id: '1', text: '', isCorrect: false }], explanation: '', points: 0, ...p };
  } catch { return { question: '', questionType: 'single', options: [{ id: '1', text: '', isCorrect: false }], explanation: '', points: 0 }; }
};

const stepTypeIcon = (type) => {
  const t = STEP_TYPES.find((s) => s.value === type);
  return t ? t.icon : <ArticleIcon fontSize="small" />;
};

// ── Level Form Dialog ─────────────────────────────────────────────────────────
function LevelFormDialog({ open, onClose, onSaved, editLevel }) {
  const isEdit = !!editLevel;
  const [title, setTitle] = useState('');
  const [track, setTrack] = useState('mecanica');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(editLevel?.title || '');
      setTrack(editLevel?.track || 'mecanica');
      setDescription(editLevel?.description || '');
      setOrder(editLevel?.order ?? '');
      setErr('');
    }
  }, [open, editLevel]);

  const handleSave = async () => {
    if (!title.trim()) return setErr('El título es requerido');
    setSaving(true);
    const payload = { title: title.trim(), track, description: description.trim() || undefined, order: order !== '' ? Number(order) : undefined };
    const res = isEdit ? await teachingService.updateLevel(editLevel.id, payload) : await teachingService.createLevel(payload);
    setSaving(false);
    if (res.success) { onSaved(); onClose(); }
    else setErr(res.error?.message || 'Error al guardar');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Editar nivel' : 'Nuevo nivel'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {err && <Alert severity="error">{err}</Alert>}
        <TextField label="Título *" size="small" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel>Track</InputLabel>
            <Select value={track} label="Track" onChange={(e) => setTrack(e.target.value)}>
              {TRACKS.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Orden" size="small" type="number" value={order} onChange={(e) => setOrder(e.target.value)} sx={{ flex: 1 }} />
        </Box>
        <TextField label="Descripción" size="small" multiline rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? <CircularProgress size={20} /> : 'Guardar'}</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Module Form Dialog ────────────────────────────────────────────────────────
function ModuleFormDialog({ open, onClose, onSaved, editModule, defaultLevelId }) {
  const isEdit = !!editModule;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [order, setOrder] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(editModule?.title || '');
      setDescription(editModule?.description || '');
      setDifficulty(editModule?.difficulty || 'beginner');
      setEstimatedTime(editModule?.estimatedTime ?? '');
      setOrder(editModule?.order ?? '');
      setErr('');
    }
  }, [open, editModule]);

  const handleSave = async () => {
    if (!title.trim()) return setErr('El título es requerido');
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      difficulty,
      estimatedTime: estimatedTime !== '' ? Number(estimatedTime) : undefined,
      order: order !== '' ? Number(order) : undefined,
    };
    const res = isEdit
      ? await teachingService.updateModule(editModule.id, payload)
      : await teachingService.createModule({ ...payload, levelId: defaultLevelId });
    setSaving(false);
    if (res.success) { onSaved(); onClose(); }
    else setErr(res.error?.message || 'Error al guardar');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Editar módulo' : 'Nuevo módulo'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {err && <Alert severity="error">{err}</Alert>}
        <TextField label="Título *" size="small" value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextField label="Descripción" size="small" multiline rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel>Dificultad</InputLabel>
            <Select value={difficulty} label="Dificultad" onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFICULTIES.map((d) => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Tiempo est. (min)" size="small" type="number" value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} sx={{ flex: 1 }} />
          <TextField label="Orden" size="small" type="number" value={order} onChange={(e) => setOrder(e.target.value)} sx={{ flex: 1 }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? <CircularProgress size={20} /> : 'Guardar'}</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Step Form Dialog ──────────────────────────────────────────────────────────
function StepFormDialog({ open, onClose, onSaved, editStep, lessonId }) {
  const isEdit = !!editStep;
  const [contentType, setContentType] = useState('text');
  const [stepTitle, setStepTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [quiz, setQuiz] = useState({ question: '', questionType: 'single', options: [{ id: '1', text: '', isCorrect: false }], explanation: '', points: 0 });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setErr('');
      if (editStep) {
        setContentType(editStep.contentType || 'text');
        setStepTitle(editStep.title || '');
        if (editStep.contentType === 'quiz') setQuiz(parseQuizContent(editStep.content));
        else if (editStep.contentType === 'image' || editStep.contentType === 'video') setMediaUrl(editStep.content || '');
        else setTextContent(editStep.content || '');
      } else {
        setContentType('text');
        setStepTitle('');
        setTextContent('');
        setMediaUrl('');
        setQuiz({ question: '', questionType: 'single', options: [{ id: '1', text: '', isCorrect: false }], explanation: '', points: 0 });
      }
    }
  }, [open, editStep]);

  const buildContent = () => {
    if (contentType === 'quiz') return JSON.stringify(quiz);
    if (contentType === 'image' || contentType === 'video') return mediaUrl;
    return textContent;
  };

  const handleSave = async () => {
    const content = buildContent();
    if (!content && contentType !== 'quiz') return setErr('El contenido es requerido');
    if (contentType === 'quiz' && !quiz.question.trim()) return setErr('La pregunta es requerida');
    setSaving(true);
    const payload = { lessonId, title: stepTitle || undefined, content, contentType };
    const res = isEdit ? await teachingService.updateStep(editStep.id, payload) : await teachingService.createStep(payload);
    setSaving(false);
    if (res.success) { onSaved(res.data); onClose(); }
    else setErr(res.error?.message || 'Error al guardar');
  };

  const addOption = () =>
    setQuiz((q) => ({ ...q, options: [...q.options, { id: String(Date.now()), text: '', isCorrect: false }] }));
  const removeOption = (id) =>
    setQuiz((q) => ({ ...q, options: q.options.filter((o) => o.id !== id) }));
  const updateOption = (id, field, value) =>
    setQuiz((q) => ({ ...q, options: q.options.map((o) => o.id === id ? { ...o, [field]: value } : (field === 'isCorrect' && q.questionType === 'single' ? { ...o, isCorrect: false } : o)) }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? 'Editar sección' : 'Nueva sección'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {err && <Alert severity="error">{err}</Alert>}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={contentType} label="Tipo" onChange={(e) => setContentType(e.target.value)}>
              {STEP_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{t.icon} {t.label}</Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Título de sección (opcional)" size="small" value={stepTitle} onChange={(e) => setStepTitle(e.target.value)} sx={{ flex: 2 }} />
        </Box>

        {contentType === 'text' && (
          <TextField label="Contenido (texto / markdown)" multiline rows={6} value={textContent} onChange={(e) => setTextContent(e.target.value)} fullWidth />
        )}

        {(contentType === 'image' || contentType === 'video') && (
          <Box>
            <TextField label={`URL del ${contentType === 'image' ? 'imagen/GIF' : 'video'}`} size="small" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} fullWidth sx={{ mb: 1 }} />
            {mediaUrl && contentType === 'image' && (
              <Box sx={{ mt: 1, border: '1px solid', borderColor: 'grey.300', borderRadius: 1, overflow: 'hidden', maxHeight: 200 }}>
                <img src={mediaUrl} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
              </Box>
            )}
            {mediaUrl && contentType === 'video' && (
              <Box sx={{ mt: 1, border: '1px solid', borderColor: 'grey.300', borderRadius: 1, overflow: 'hidden', aspectRatio: '16/9', maxHeight: 240 }}>
                <iframe src={mediaUrl} title="video preview" style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
              </Box>
            )}
          </Box>
        )}

        {contentType === 'quiz' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Pregunta *" value={quiz.question} onChange={(e) => setQuiz((q) => ({ ...q, question: e.target.value }))} fullWidth size="small" />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ flex: 2 }}>
                <InputLabel>Tipo de pregunta</InputLabel>
                <Select value={quiz.questionType} label="Tipo de pregunta" onChange={(e) => setQuiz((q) => ({ ...q, questionType: e.target.value, options: q.options.map((o) => ({ ...o, isCorrect: false })) }))}>
                  {QUESTION_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Puntos" size="small" type="number" value={quiz.points} onChange={(e) => setQuiz((q) => ({ ...q, points: Number(e.target.value) }))} sx={{ flex: 1 }} inputProps={{ min: 0 }} />
            </Box>

            {quiz.questionType !== 'open' && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Opciones {quiz.questionType === 'single' ? '(marca la correcta)' : '(marca todas las correctas)'}
                </Typography>
                {quiz.options.map((opt, i) => (
                  <Box key={opt.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {quiz.questionType === 'single'
                      ? <Radio size="small" checked={opt.isCorrect} onChange={() => updateOption(opt.id, 'isCorrect', true)} />
                      : <Checkbox size="small" checked={opt.isCorrect} onChange={(e) => updateOption(opt.id, 'isCorrect', e.target.checked)} />
                    }
                    <TextField size="small" value={opt.text} onChange={(e) => updateOption(opt.id, 'text', e.target.value)} placeholder={`Opción ${i + 1}`} sx={{ flex: 1 }} />
                    <IconButton size="small" onClick={() => removeOption(opt.id)} disabled={quiz.options.length <= 1}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                ))}
                <Button size="small" startIcon={<AddIcon />} onClick={addOption}>Agregar opción</Button>
              </Box>
            )}

            {quiz.questionType === 'open' && (
              <Alert severity="info" sx={{ py: 0.5 }}>Pregunta de respuesta abierta — el profesor revisa manualmente.</Alert>
            )}

            <TextField label="Explicación (se muestra después de responder)" size="small" multiline rows={2} value={quiz.explanation} onChange={(e) => setQuiz((q) => ({ ...q, explanation: e.target.value }))} fullWidth />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? <CircularProgress size={20} /> : 'Guardar'}</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Lesson Editor Dialog ──────────────────────────────────────────────────────
function LessonEditorDialog({ open, onClose, onSaved, editLesson, defaultModuleId, canDelete }) {
  const isEdit = !!editLesson;
  const [title, setTitle] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [order, setOrder] = useState('');
  const [steps, setSteps] = useState([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [stepDialog, setStepDialog] = useState(null); // null | { mode: 'create'|'edit', step? }
  const [lessonId, setLessonId] = useState(null);

  useEffect(() => {
    if (open) {
      setErr('');
      setTitle(editLesson?.title || '');
      setEstimatedTime(editLesson?.estimatedTime ?? '');
      setOrder(editLesson?.order ?? '');
      setSteps([]);
      if (editLesson?.id) {
        setLessonId(editLesson.id);
        loadSteps(editLesson.id);
      } else {
        setLessonId(null);
      }
    }
  }, [open, editLesson]);

  const loadSteps = async (id) => {
    setLoadingSteps(true);
    const res = await teachingService.getLessonSteps(id);
    if (res.success) setSteps(res.data?.steps || res.data || []);
    setLoadingSteps(false);
  };

  const handleSaveLesson = async () => {
    if (!title.trim()) return setErr('El título es requerido');
    setSaving(true);
    const payload = {
      title: title.trim(),
      estimatedTime: estimatedTime !== '' ? Number(estimatedTime) : undefined,
      order: order !== '' ? Number(order) : undefined,
    };
    if (!isEdit) {
      payload.moduleId = defaultModuleId;
      payload.content = INITIAL_LESSON_CONTENT;
    }
    const res = isEdit
      ? await teachingService.updateLesson(editLesson.id, payload)
      : await teachingService.createLesson(payload);
    setSaving(false);
    if (res.success) {
      if (!isEdit) {
        setLessonId(res.data?.lesson?.id || res.data?.id);
      }
      onSaved();
    } else {
      setErr(res.error?.message || 'Error al guardar');
    }
  };

  const handleDeleteStep = async (stepId) => {
    if (!window.confirm('¿Eliminar esta sección?')) return;
    const res = await teachingService.deleteStep(stepId);
    if (res.success) setSteps((prev) => prev.filter((s) => s.id !== stepId));
    else alert(res.error?.message || 'Error al eliminar');
  };

  const moveStep = async (index, direction) => {
    const newSteps = [...steps];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps);
    const lid = lessonId || editLesson?.id;
    if (lid) await teachingService.reorderSteps(lid, newSteps.map((s) => s.id));
  };

  const onStepSaved = () => {
    const lid = lessonId || editLesson?.id;
    if (lid) loadSteps(lid);
  };

  const stepPreview = (step) => {
    if (step.contentType === 'quiz') {
      try { return `❓ ${JSON.parse(step.content).question}`; } catch { return '❓ Pregunta'; }
    }
    if (step.contentType === 'image') return `🖼 ${step.content?.slice(0, 60)}`;
    if (step.contentType === 'video') return `🎬 ${step.content?.slice(0, 60)}`;
    return step.content?.slice(0, 80) || '(vacío)';
  };

  const currentLessonId = lessonId || editLesson?.id;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? `Editar lección: ${editLesson?.title}` : 'Nueva lección'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {err && <Alert severity="error">{err}</Alert>}

        {/* Lesson metadata */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>Información de la lección</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Título *" size="small" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ flex: 3 }} />
            <TextField label="Tiempo est. (min)" size="small" type="number" value={estimatedTime} onChange={(e) => setEstimatedTime(e.target.value)} sx={{ flex: 1 }} />
            <TextField label="Orden" size="small" type="number" value={order} onChange={(e) => setOrder(e.target.value)} sx={{ flex: 1 }} />
          </Box>
          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" size="small" onClick={handleSaveLesson} disabled={saving}>
              {saving ? <CircularProgress size={16} /> : (isEdit ? 'Actualizar info' : 'Crear lección')}
            </Button>
          </Box>
        </Paper>

        {/* Steps section — only shown once lesson exists */}
        {currentLessonId && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight="bold">Secciones / Contenido</Typography>
              <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={() => setStepDialog({ mode: 'create' })}>
                Agregar sección
              </Button>
            </Box>

            {loadingSteps ? (
              <Box sx={{ textAlign: 'center', py: 2 }}><CircularProgress size={24} /></Box>
            ) : steps.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                Sin secciones todavía. Agrega texto, imágenes, videos o preguntas.
              </Typography>
            ) : (
              <List dense disablePadding>
                {steps.filter((s) => s.isActive !== false).map((step, i) => (
                  <React.Fragment key={step.id}>
                    {i > 0 && <Divider component="li" />}
                    <ListItem sx={{ px: 0, py: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
                        <IconButton size="small" onClick={() => moveStep(i, -1)} disabled={i === 0}><UpIcon sx={{ fontSize: 16 }} /></IconButton>
                        <IconButton size="small" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}><DownIcon sx={{ fontSize: 16 }} /></IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 32 }}>
                        {stepTypeIcon(step.contentType)}
                      </Box>
                      <ListItemText
                        primary={step.title || STEP_TYPES.find((t) => t.value === step.contentType)?.label}
                        secondary={<Typography variant="caption" noWrap sx={{ maxWidth: 380, display: 'block' }}>{stepPreview(step)}</Typography>}
                        sx={{ mx: 1 }}
                      />
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => setStepDialog({ mode: 'edit', step })}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        {canDelete && (
                          <Tooltip title="Eliminar">
                            <IconButton size="small" color="error" onClick={() => handleDeleteStep(step.id)}><DeleteIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        )}

        {!currentLessonId && isEdit === false && (
          <Alert severity="info">Crea la lección primero para poder agregar secciones.</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>

      {stepDialog && (
        <StepFormDialog
          open
          onClose={() => setStepDialog(null)}
          onSaved={onStepSaved}
          editStep={stepDialog.mode === 'edit' ? stepDialog.step : null}
          lessonId={currentLessonId}
        />
      )}
    </Dialog>
  );
}

// ── Changelog Drawer ──────────────────────────────────────────────────────────
function ChangelogDrawer({ open, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      teachingService.getRecentChanges(40).then((res) => {
        if (res.success) setEntries(res.data?.changes || res.data || []);
        setLoading(false);
      });
    }
  }, [open]);

  const actionColor = { create: 'success', update: 'info', delete: 'error', reorder: 'default' };
  const actionLabel = { create: 'Creó', update: 'Editó', delete: 'Eliminó', reorder: 'Reordenó' };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} sx={{ '& .MuiDrawer-paper': { width: 360 } }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" fontWeight="bold">Historial de cambios</Typography>
        <Typography variant="body2" color="text.secondary">Últimas 40 modificaciones al contenido</Typography>
      </Box>
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
      ) : entries.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}><Typography color="text.secondary">Sin cambios registrados</Typography></Box>
      ) : (
        <List>
          {entries.map((e, i) => (
            <React.Fragment key={e.id || i}>
              <ListItem alignItems="flex-start">
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Chip label={actionLabel[e.action] || e.action} color={actionColor[e.action] || 'default'} size="small" />
                      <Chip label={e.entityType} size="small" variant="outlined" />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="caption" display="block">{e.user?.name || e.changedBy}</Typography>
                      <Typography variant="caption" color="text.secondary">{new Date(e.changedAt).toLocaleString('es')}</Typography>
                    </>
                  }
                />
              </ListItem>
              {i < entries.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Drawer>
  );
}

// ── Lesson Row ────────────────────────────────────────────────────────────────
function LessonRow({ lesson, canDelete, onEdit, onDelete }) {
  return (
    <ListItem
      sx={{ px: 1.5, py: 0.75, borderRadius: 1, '&:hover': { bgcolor: 'grey.50' } }}
    >
      <ArticleIcon sx={{ mr: 1.5, color: 'text.secondary', fontSize: 20 }} />
      <ListItemText
        primary={lesson.title}
        secondary={lesson.estimatedTime ? `${lesson.estimatedTime} min` : undefined}
        primaryTypographyProps={{ variant: 'body2' }}
        secondaryTypographyProps={{ variant: 'caption' }}
      />
      <Stack direction="row" spacing={0.5}>
        <Tooltip title="Editar contenido">
          <IconButton size="small" onClick={() => onEdit(lesson)}><EditIcon fontSize="small" /></IconButton>
        </Tooltip>
        {canDelete && (
          <Tooltip title="Eliminar lección">
            <IconButton size="small" color="error" onClick={() => onDelete(lesson)}><DeleteIcon fontSize="small" /></IconButton>
          </Tooltip>
        )}
      </Stack>
    </ListItem>
  );
}

// ── Module Accordion ──────────────────────────────────────────────────────────
function ModuleAccordion({ module, canDelete, onEditModule, onDeleteModule, onEditLesson, onNewLesson }) {
  const [expanded, setExpanded] = useState(false);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadLessons = useCallback(async () => {
    setLoading(true);
    const res = await teachingService.getModuleLessons(module.id);
    if (res.success) setLessons(res.data?.lessons || res.data || []);
    setLoading(false);
  }, [module.id]);

  useEffect(() => {
    if (expanded && lessons.length === 0) loadLessons();
  }, [expanded]);

  const handleDeleteLesson = async (lesson) => {
    if (!window.confirm(`¿Eliminar la lección "${lesson.title}"?`)) return;
    const res = await teachingService.deleteLesson(lesson.id);
    if (res.success) loadLessons();
    else alert(res.error?.message || 'Error al eliminar');
  };

  const difficultyColor = { prerequisitos: 'default', beginner: 'success', intermediate: 'warning', advanced: 'error' };

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, v) => setExpanded(v)}
      elevation={0}
      sx={{ border: '1px solid', borderColor: 'grey.200', mb: 0.5, '&:before': { display: 'none' }, borderRadius: '8px !important' }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
          <FolderIcon color="secondary" sx={{ flexShrink: 0 }} />
          <Typography variant="body1" fontWeight="medium" noWrap sx={{ flex: 1 }}>{module.title}</Typography>
          {module.difficulty && <Chip label={module.difficulty} size="small" color={difficultyColor[module.difficulty] || 'default'} />}
          {module.estimatedTime && <Chip label={`${module.estimatedTime}min`} size="small" variant="outlined" />}
        </Box>
        <Stack direction="row" spacing={0.5} sx={{ mr: 1 }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Nueva lección"><IconButton size="small" onClick={() => onNewLesson(module)}><AddIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Editar módulo"><IconButton size="small" onClick={() => onEditModule(module)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          {canDelete && <Tooltip title="Eliminar módulo"><IconButton size="small" color="error" onClick={() => onDeleteModule(module)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, pb: 1 }}>
        {module.description && <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{module.description}</Typography>}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 1 }}><CircularProgress size={20} /></Box>
        ) : lessons.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1, pl: 1 }}>Sin lecciones — <Button size="small" onClick={() => onNewLesson(module)}>Crear primera lección</Button></Typography>
        ) : (
          <List dense disablePadding>
            {lessons.map((l) => (
              <LessonRow
                key={l.id}
                lesson={l}
                canDelete={canDelete}
                onEdit={(lesson) => onEditLesson(lesson)}
                onDelete={handleDeleteLesson}
              />
            ))}
          </List>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

// ── Level Accordion ───────────────────────────────────────────────────────────
function LevelAccordion({ level, canDelete, onEditLevel, onDeleteLevel, onEditModule, onNewModule, onEditLesson, onNewLesson }) {
  const [expanded, setExpanded] = useState(false);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadModules = useCallback(async () => {
    setLoading(true);
    const res = await teachingService.getLevelModules(level.id);
    if (res.success) setModules(res.data?.modules || res.data || []);
    setLoading(false);
  }, [level.id]);

  useEffect(() => {
    if (expanded && modules.length === 0) loadModules();
  }, [expanded]);

  const handleDeleteModule = async (module) => {
    if (!window.confirm(`¿Eliminar el módulo "${module.title}"?`)) return;
    const res = await teachingService.deleteModule(module.id);
    if (res.success) loadModules();
    else alert(res.error?.message || 'Error al eliminar');
  };

  const trackLabel = TRACKS.find((t) => t.value === level.track)?.label || level.track;

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, v) => setExpanded(v)}
      elevation={0}
      sx={{ border: '2px solid', borderColor: expanded ? 'primary.main' : 'grey.200', mb: 1, '&:before': { display: 'none' }, borderRadius: '8px !important' }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
          <MenuBookIcon color="primary" sx={{ flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight="bold" noWrap>{level.title}</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25 }}>
              <Chip label={trackLabel} size="small" color="primary" variant="outlined" />
              {level._count?.modules !== undefined && <Chip label={`${level._count.modules} módulos`} size="small" variant="outlined" />}
            </Box>
          </Box>
        </Box>
        <Stack direction="row" spacing={0.5} sx={{ mr: 1 }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Nuevo módulo"><IconButton size="small" onClick={() => onNewModule(level)}><AddIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Editar nivel"><IconButton size="small" onClick={() => onEditLevel(level)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          {canDelete && <Tooltip title="Eliminar nivel"><IconButton size="small" color="error" onClick={() => onDeleteLevel(level)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {level.description && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{level.description}</Typography>}
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 2 }}><CircularProgress size={24} /></Box>
        ) : modules.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">Sin módulos en este nivel.</Typography>
            <Button size="small" startIcon={<AddIcon />} sx={{ mt: 1 }} onClick={() => onNewModule(level)}>Crear primer módulo</Button>
          </Paper>
        ) : (
          modules.map((m) => (
            <ModuleAccordion
              key={m.id}
              module={m}
              canDelete={canDelete}
              onEditModule={onEditModule}
              onDeleteModule={handleDeleteModule}
              onEditLesson={onEditLesson}
              onNewLesson={onNewLesson}
            />
          ))
        )}
      </AccordionDetails>
    </Accordion>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PanelTeaching() {
  const { isAdmin, isSuperuser } = useAuth();
  const canDelete = isAdmin() || isSuperuser();

  const [levels, setLevels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dialog states
  const [levelDialog, setLevelDialog] = useState(null); // null | { mode, level? }
  const [moduleDialog, setModuleDialog] = useState(null); // null | { mode, module?, levelId }
  const [lessonDialog, setLessonDialog] = useState(null); // null | { mode, lesson?, moduleId }
  const [changelogOpen, setChangelogOpen] = useState(false);

  const fetchLevels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await teachingService.getLevels(canDelete); // admins see inactive too
    if (res.success) setLevels(res.data?.levels || res.data || []);
    else setError(res.error?.message || 'Error al cargar niveles');
    setIsLoading(false);
  }, [canDelete]);

  useEffect(() => { fetchLevels(); }, [fetchLevels]);

  const handleDeleteLevel = async (level) => {
    if (!window.confirm(`¿Eliminar el nivel "${level.title}"? Esta acción es irreversible.`)) return;
    const res = await teachingService.deleteLevel(level.id);
    if (res.success) fetchLevels();
    else alert(res.error?.message || 'Error al eliminar');
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Gestión de Contenido</Typography>
          <Typography variant="body2" color="text.secondary">
            Crea y edita niveles, módulos, lecciones y secciones. Los cambios son globales y visibles para todos los estudiantes.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<HistoryIcon />} onClick={() => setChangelogOpen(true)}>
            Historial
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setLevelDialog({ mode: 'create' })}>
            Nuevo Nivel
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Level tree */}
      {isLoading ? (
        [1, 2, 3].map((i) => (
          <Box key={i} sx={{ height: 72, bgcolor: 'grey.100', borderRadius: 2, mb: 1, animation: 'pulse 1.5s infinite' }} />
        ))
      ) : levels.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
          <MenuBookIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6">No hay niveles creados</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>Crea el primer nivel para comenzar a organizar el contenido.</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setLevelDialog({ mode: 'create' })}>Crear primer nivel</Button>
        </Paper>
      ) : (
        levels.map((level) => (
          <LevelAccordion
            key={level.id}
            level={level}
            canDelete={canDelete}
            onEditLevel={(l) => setLevelDialog({ mode: 'edit', level: l })}
            onDeleteLevel={handleDeleteLevel}
            onNewModule={(l) => setModuleDialog({ mode: 'create', levelId: l.id })}
            onEditModule={(m) => setModuleDialog({ mode: 'edit', module: m, levelId: m.levelId })}
            onNewLesson={(m) => setLessonDialog({ mode: 'create', moduleId: m.id })}
            onEditLesson={(lesson) => setLessonDialog({ mode: 'edit', lesson })}
          />
        ))
      )}

      {/* Level dialog */}
      {levelDialog && (
        <LevelFormDialog
          open
          onClose={() => setLevelDialog(null)}
          onSaved={() => { setLevelDialog(null); fetchLevels(); }}
          editLevel={levelDialog.mode === 'edit' ? levelDialog.level : null}
        />
      )}

      {/* Module dialog */}
      {moduleDialog && (
        <ModuleFormDialog
          open
          onClose={() => setModuleDialog(null)}
          onSaved={() => { setModuleDialog(null); fetchLevels(); }}
          editModule={moduleDialog.mode === 'edit' ? moduleDialog.module : null}
          defaultLevelId={moduleDialog.levelId}
        />
      )}

      {/* Lesson editor */}
      {lessonDialog && (
        <LessonEditorDialog
          open
          onClose={() => setLessonDialog(null)}
          onSaved={() => fetchLevels()}
          editLesson={lessonDialog.mode === 'edit' ? lessonDialog.lesson : null}
          defaultModuleId={lessonDialog.moduleId}
          canDelete={canDelete}
        />
      )}

      {/* Changelog drawer */}
      <ChangelogDrawer open={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </Box>
  );
}
