/**
 * PanelStudentDetail - Detailed student view
 * Uses /api/admin/students/:id/progress for rich data.
 * Shows: profile, module progress, evaluations, simulator sessions, teacher scores.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Box, Typography, Paper, Avatar, Chip, LinearProgress, Grid,
  Card, CardContent, List, ListItem, ListItemText, Button, Alert,
  Skeleton, Divider, Tab, Tabs, TextField, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, InputLabel, FormControl,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon, Email as EmailIcon, CalendarToday as CalendarIcon,
  AccessTime as TimeIcon, CheckCircle as CheckCircleIcon, School as SchoolIcon,
  TrendingUp as TrendingUpIcon, Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon,
  Grade as GradeIcon, SimulationOutlined, Psychology as PsychologyIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/shared/contexts/AuthContext';
import adminService from '@/features/admin/services/adminService';
import scoresService from '@/features/admin/services/scoresService';

// ── helpers ──────────────────────────────────────────────────────────────────

const stringToColor = (str) => {
  if (!str) return '#1976d2';
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#1976d2','#388e3c','#d32f2f','#f57c00','#7b1fa2','#0097a7','#c2185b','#5d4037','#455a64','#00897b'];
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const progressColor = (pct) => pct >= 80 ? 'success' : pct >= 50 ? 'primary' : pct >= 25 ? 'warning' : 'error';
const fmtTime = (secs) => {
  if (!secs) return '0 min';
  const m = Math.round(secs / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}min`;
};

// ── Score Dialog ──────────────────────────────────────────────────────────────

function ScoreDialog({ open, onClose, onSave, studentId, initialScore }) {
  const [entityType, setEntityType] = useState(initialScore?.entityType || 'CUSTOM');
  const [entityId, setEntityId] = useState(initialScore?.entityId || '');
  const [points, setPoints] = useState(initialScore?.points ?? '');
  const [maxPoints, setMaxPoints] = useState(initialScore?.maxPoints ?? 100);
  const [comments, setComments] = useState(initialScore?.comments || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    if (!entityId.trim()) return setErr('El identificador es requerido');
    if (points === '' || isNaN(Number(points))) return setErr('La calificación debe ser un número');
    setSaving(true);
    setErr('');
    const result = await scoresService.upsertScore({
      studentId,
      entityType,
      entityId: entityId.trim(),
      score: Number(points),
      maxScore: Number(maxPoints),
      notes: comments,
    });
    setSaving(false);
    if (result.success) { onSave(); onClose(); }
    else setErr(result.error?.message || 'Error al guardar');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialScore ? 'Editar calificación' : 'Nueva calificación'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {err && <Alert severity="error">{err}</Alert>}
        <FormControl size="small" fullWidth>
          <InputLabel>Tipo</InputLabel>
          <Select value={entityType} label="Tipo" onChange={(e) => setEntityType(e.target.value)}>
            <MenuItem value="MODULE">Módulo</MenuItem>
            <MenuItem value="LESSON">Lección</MenuItem>
            <MenuItem value="QUIZ">Quiz</MenuItem>
            <MenuItem value="CASE">Caso clínico</MenuItem>
            <MenuItem value="CUSTOM">Personalizado</MenuItem>
          </Select>
        </FormControl>
        <TextField label="Identificador / Título" size="small" value={entityId} onChange={(e) => setEntityId(e.target.value)}
          helperText="ID del módulo/lección, o etiqueta libre para calificaciones personalizadas" />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField label="Calificación" size="small" type="number" value={points} onChange={(e) => setPoints(e.target.value)} sx={{ flex: 1 }} />
          <TextField label="Máximo" size="small" type="number" value={maxPoints} onChange={(e) => setMaxPoints(e.target.value)} sx={{ flex: 1 }} />
        </Box>
        <TextField label="Comentarios (opcional)" size="small" multiline rows={3} value={comments} onChange={(e) => setComments(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PanelStudentDetail() {
  const router = useRouter();
  const { id: studentId } = router.query;
  const navigate = (path) => router.push(path);
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // Score dialog
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [editingScore, setEditingScore] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await adminService.getStudentProgress(studentId);
    if (result.success) setData(result.data.data);
    else setError(result.error?.message || 'Error al cargar datos');
    setIsLoading(false);
  }, [studentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeleteScore = async (scoreId) => {
    if (!window.confirm('¿Eliminar esta calificación?')) return;
    await scoresService.deleteScore(scoreId);
    fetchData();
  };

  if (isLoading) return (
    <Box>
      <Skeleton variant="rectangular" width={150} height={36} sx={{ mb: 3 }} />
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'grey.200' }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Skeleton variant="circular" width={80} height={80} />
          <Box sx={{ flex: 1 }}><Skeleton variant="text" width="40%" height={32} /><Skeleton variant="text" width="30%" /></Box>
        </Box>
      </Paper>
      <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
    </Box>
  );

  if (error) return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/panel/students')} sx={{ mb: 3 }}>Volver</Button>
      <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      <Button variant="outlined" onClick={fetchData}>Reintentar</Button>
    </Box>
  );

  if (!data) return null;

  const { user: student, moduleProgress = [], evaluationAttempts = [], simulatorSessions = [], quizAttempts = [], scores = [], statistics } = data;
  const overallPct = statistics?.overallProgress ?? 0;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/panel/students')} sx={{ mb: 3 }}>Volver a la lista</Button>

      {/* Profile card */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, flexWrap: 'wrap' }}>
          <Avatar sx={{ bgcolor: stringToColor(student.name), width: 80, height: 80, fontSize: '1.75rem', fontWeight: 'bold' }} src={student.image}>
            {getInitials(student.name)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>{student.name || 'Sin nombre'}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}><EmailIcon fontSize="small" color="action" /><Typography variant="body2" color="text.secondary">{student.email}</Typography></Box>
            <Box sx={{ display: 'flex', gap: 1 }}><CalendarIcon fontSize="small" color="action" /><Typography variant="body2" color="text.secondary">Registrado el {format(new Date(student.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es })}</Typography></Box>
            {student.groups?.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {student.groups.map((g) => <Chip key={g.id} label={g.name} size="small" variant="outlined" color="primary" />)}
              </Box>
            )}
          </Box>
          {/* Progress circle */}
          <Box sx={{ textAlign: 'center', minWidth: 100 }}>
            <Box sx={{ width: 80, height: 80, borderRadius: '50%', border: '6px solid', borderColor: `${progressColor(overallPct)}.main`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto' }}>
              <Typography variant="h5" fontWeight="bold">{overallPct}%</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">Progreso global</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Stats summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { icon: <CheckCircleIcon color="success" sx={{ fontSize: 36 }} />, value: statistics?.completedModules ?? 0, label: 'Módulos completados' },
          { icon: <TimeIcon color="primary" sx={{ fontSize: 36 }} />, value: fmtTime(statistics?.totalTimeSpentSeconds ?? 0), label: 'Tiempo de estudio' },
          { icon: <PsychologyIcon color="warning" sx={{ fontSize: 36 }} />, value: `${statistics?.evaluationsPassed ?? 0}/${statistics?.evaluationsTaken ?? 0}`, label: 'Evaluaciones aprobadas' },
          { icon: <SchoolIcon color="info" sx={{ fontSize: 36 }} />, value: statistics?.simulatorSessions ?? 0, label: 'Sesiones simulador' },
        ].map((stat, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {stat.icon}
                  <Box>
                    <Typography variant="h5" fontWeight="bold">{stat.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}>
          <Tab label="Módulos" />
          <Tab label="Evaluaciones" />
          <Tab label={`Calificaciones (${scores.length})`} />
          <Tab label="Simulador" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Tab 0: Module progress */}
          {activeTab === 0 && (
            moduleProgress.length === 0
              ? <Box sx={{ textAlign: 'center', py: 4 }}><SchoolIcon sx={{ fontSize: 48, color: 'grey.400' }} /><Typography color="text.secondary" sx={{ mt: 1 }}>Sin progreso registrado</Typography></Box>
              : <List disablePadding>
                  {moduleProgress.map((m, i) => (
                    <React.Fragment key={m.moduleId}>
                      {i > 0 && <Divider />}
                      <ListItem sx={{ py: 2, px: 0, gap: 2, flexWrap: 'wrap' }}>
                        <ListItemText
                          primary={<><strong>{m.moduleTitle}</strong>{m.levelTitle && <Chip label={m.levelTitle} size="small" sx={{ ml: 1 }} />}</>}
                          secondary={`${m.completedLessons}/${m.totalLessons} lecciones · ${fmtTime(m.timeSpentSeconds)}`}
                          sx={{ flex: '1 1 200px' }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 180 }}>
                          <LinearProgress variant="determinate" value={m.progressPercentage} color={progressColor(m.progressPercentage)} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
                          <Chip label={`${Math.round(m.progressPercentage)}%`} size="small" color={progressColor(m.progressPercentage)} sx={{ minWidth: 55 }} />
                        </Box>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
          )}

          {/* Tab 1: Evaluations */}
          {activeTab === 1 && (
            evaluationAttempts.length === 0
              ? <Box sx={{ textAlign: 'center', py: 4 }}><Typography color="text.secondary">Sin intentos de evaluación</Typography></Box>
              : <List disablePadding>
                  {evaluationAttempts.map((e, i) => (
                    <React.Fragment key={e.attemptId}>
                      {i > 0 && <Divider />}
                      <ListItem sx={{ py: 1.5, px: 0, gap: 2, flexWrap: 'wrap' }}>
                        <ListItemText
                          primary={e.caseTitle}
                          secondary={`${e.difficulty} · ${e.pathology} · ${format(new Date(e.startedAt), "dd/MM/yyyy HH:mm")}`}
                          sx={{ flex: '1 1 200px' }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={`${Math.round(e.score)}%`} size="small" color={e.isSuccessful ? 'success' : 'error'} />
                          <Chip label={e.isSuccessful ? 'Aprobado' : 'Reprobado'} size="small" variant="outlined" color={e.isSuccessful ? 'success' : 'error'} />
                        </Box>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
          )}

          {/* Tab 2: Teacher scores */}
          {activeTab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={() => { setEditingScore(null); setScoreDialogOpen(true); }}>
                  Nueva calificación
                </Button>
              </Box>
              {scores.length === 0
                ? <Box sx={{ textAlign: 'center', py: 4 }}><GradeIcon sx={{ fontSize: 48, color: 'grey.400' }} /><Typography color="text.secondary" sx={{ mt: 1 }}>Aún no has asignado calificaciones</Typography></Box>
                : <List disablePadding>
                    {scores.map((sc, i) => (
                      <React.Fragment key={sc.id}>
                        {i > 0 && <Divider />}
                        <ListItem sx={{ py: 1.5, px: 0, gap: 1 }}>
                          <Chip label={sc.entityType} size="small" variant="outlined" />
                          <ListItemText
                            primary={sc.entityId}
                            secondary={sc.comments || null}
                            sx={{ flex: 1 }}
                          />
                          <Typography variant="h6" fontWeight="bold" color={progressColor((sc.points / sc.maxPoints) * 100)}>
                            {sc.points}/{sc.maxPoints}
                          </Typography>
                          <Tooltip title="Eliminar">
                            <IconButton size="small" color="error" onClick={() => handleDeleteScore(sc.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </ListItem>
                      </React.Fragment>
                    ))}
                  </List>
              }
            </Box>
          )}

          {/* Tab 3: Simulator */}
          {activeTab === 3 && (
            simulatorSessions.length === 0
              ? <Box sx={{ textAlign: 'center', py: 4 }}><Typography color="text.secondary">Sin sesiones de simulador</Typography></Box>
              : <List disablePadding>
                  {simulatorSessions.map((s, i) => (
                    <React.Fragment key={s.sessionId}>
                      {i > 0 && <Divider />}
                      <ListItem sx={{ py: 1.5, px: 0, gap: 2 }}>
                        <ListItemText
                          primary={s.isRealVentilator ? 'Ventilador físico' : 'Simulación virtual'}
                          secondary={format(new Date(s.startedAt), "dd/MM/yyyy HH:mm")}
                        />
                        <Chip label={s.isRealVentilator ? 'Real' : 'Virtual'} size="small" color={s.isRealVentilator ? 'warning' : 'info'} variant="outlined" />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
          )}
        </Box>
      </Paper>

      {/* Score dialog */}
      <ScoreDialog
        open={scoreDialogOpen}
        onClose={() => setScoreDialogOpen(false)}
        onSave={fetchData}
        studentId={studentId}
        initialScore={editingScore}
      />
    </Box>
  );
}
