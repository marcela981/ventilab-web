/**
 * PanelSimulator - Ventilator Reservation Page
 * First-come-first-served reservation with group/leader support.
 * Uses /api/simulation/reserve, /api/simulation/status, /api/groups.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Divider, Card, CardContent,
  List, ListItem, ListItemText, ListItemAvatar, Avatar, Stack,
} from '@mui/material';
import {
  MonitorHeart as SimulatorIcon, Lock as LockIcon, LockOpen as LockOpenIcon,
  Person as PersonIcon, Group as GroupIcon, Warning as WarningIcon,
  CheckCircle as CheckCircleIcon, Cancel as CancelIcon,
} from '@mui/icons-material';
import groupsService from '@/features/admin/services/groupsService';
import { useAuth } from '@/shared/contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('ventilab_auth_token');
  const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...(options.headers || {}) };
  try {
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) return { success: false, data: null, error: { message: data.message || 'Error', statusCode: res.status } };
    return { success: true, data, error: null };
  } catch { return { success: false, data: null, error: { message: 'Error de conexión', statusCode: 0 } }; }
}

// ── Reserve Dialog ────────────────────────────────────────────────────────────

function ReserveDialog({ open, onClose, onReserved, myGroups }) {
  const [mode, setMode] = useState('self'); // 'self' | 'group'
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedLead, setSelectedLead] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);
  const [duration, setDuration] = useState(30);
  const [purpose, setPurpose] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) { setMode('self'); setSelectedGroup(''); setSelectedLead(''); setDuration(30); setPurpose(''); setErr(''); }
  }, [open]);

  useEffect(() => {
    const g = myGroups.find((g) => g.id === selectedGroup);
    const students = (g?.members || []).filter((m) => m.role === 'STUDENT').map((m) => m.user);
    setGroupMembers(students);
    // Auto-select group lead if set
    if (g?.simulatorLeaderId) setSelectedLead(g.simulatorLeaderId);
    else setSelectedLead('');
  }, [selectedGroup, myGroups]);

  const handleReserve = async () => {
    if (mode === 'group' && !selectedGroup) return setErr('Selecciona un grupo');
    if (mode === 'group' && !selectedLead) return setErr('Selecciona el líder que recibirá los datos');
    if (!duration || duration < 1) return setErr('La duración debe ser mayor a 0');
    setSaving(true);
    setErr('');
    const payload = { durationMinutes: Number(duration), purpose: purpose || undefined };
    if (mode === 'group') { payload.groupId = selectedGroup; payload.leaderId = selectedLead; }
    const result = await apiRequest('/simulation/reserve', { method: 'POST', body: JSON.stringify(payload) });
    setSaving(false);
    if (result.success) { onReserved(); onClose(); }
    else setErr(result.error?.message || 'No se pudo reservar el ventilador');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reservar ventilador</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {err && <Alert severity="error">{err}</Alert>}

        <FormControl size="small" fullWidth>
          <InputLabel>Reservar para</InputLabel>
          <Select value={mode} label="Reservar para" onChange={(e) => setMode(e.target.value)}>
            <MenuItem value="self"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><PersonIcon fontSize="small" /> Para mí</Box></MenuItem>
            <MenuItem value="group"><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><GroupIcon fontSize="small" /> Para un grupo</Box></MenuItem>
          </Select>
        </FormControl>

        {mode === 'group' && (
          <>
            <FormControl size="small" fullWidth>
              <InputLabel>Grupo</InputLabel>
              <Select value={selectedGroup} label="Grupo" onChange={(e) => setSelectedGroup(e.target.value)}>
                {myGroups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
              </Select>
            </FormControl>
            {selectedGroup && (
              <FormControl size="small" fullWidth>
                <InputLabel>Líder (recibe datos del simulador)</InputLabel>
                <Select value={selectedLead} label="Líder (recibe datos del simulador)" onChange={(e) => setSelectedLead(e.target.value)}>
                  {groupMembers.length === 0
                    ? <MenuItem disabled>Sin estudiantes en el grupo</MenuItem>
                    : groupMembers.map((u) => <MenuItem key={u.id} value={u.id}>{u.name || u.email}</MenuItem>)
                  }
                </Select>
              </FormControl>
            )}
          </>
        )}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField label="Duración (minutos)" size="small" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} sx={{ flex: 1 }} inputProps={{ min: 1, max: 480 }} />
          <TextField label="Propósito (opcional)" size="small" value={purpose} onChange={(e) => setPurpose(e.target.value)} sx={{ flex: 2 }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color="primary" onClick={handleReserve} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Reservar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PanelSimulator() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [myGroups, setMyGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    const res = await apiRequest('/simulation/status');
    if (res.success) setStatus(res.data);
    else setError(res.error?.message || 'Error al obtener estado');
  }, []);

  const fetchGroups = useCallback(async () => {
    const res = await groupsService.getGroups({ myGroups: true, isActive: true });
    if (res.success) {
      // Also load members for each group so the ReserveDialog can list them
      const enriched = await Promise.all((res.data.groups || []).map(async (g) => {
        const mRes = await groupsService.getGroupMembers(g.id);
        return { ...g, members: mRes.success ? mRes.data.members : [] };
      }));
      setMyGroups(enriched);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await Promise.all([fetchStatus(), fetchGroups()]);
      setIsLoading(false);
    })();
    // Poll status every 15s
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchGroups]);

  const handleRelease = async () => {
    if (!window.confirm('¿Liberar la reserva del ventilador?')) return;
    setReleasing(true);
    await apiRequest('/simulation/reserve', { method: 'DELETE' });
    setReleasing(false);
    fetchStatus();
  };

  const isMine = status?.currentUser === user?.id;
  const isReserved = status?.isReserved;
  const endsAt = status?.reservationEndsAt ? new Date(status.reservationEndsAt) : null;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Simulador - Reserva de Ventilador</Typography>
        <Typography variant="body2" color="text.secondary">
          El ventilador físico solo puede usarlo una persona a la vez. Solo el líder designado recibirá los datos en tiempo real.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {isLoading ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Consultando estado del ventilador...</Typography>
        </Paper>
      ) : (
        <>
          {/* Status card */}
          <Paper elevation={0} sx={{ p: 3, mb: 3, border: '2px solid', borderColor: isReserved ? (isMine ? 'warning.main' : 'error.light') : 'success.main', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                {isReserved ? <LockIcon color={isMine ? 'warning' : 'error'} sx={{ fontSize: 48 }} /> : <LockOpenIcon color="success" sx={{ fontSize: 48 }} />}
                <Box>
                  <Typography variant="h5" fontWeight="bold" color={isReserved ? (isMine ? 'warning.main' : 'error.main') : 'success.main'}>
                    {isReserved ? (isMine ? 'Reservado por ti' : 'Ocupado') : 'Disponible'}
                  </Typography>
                  {isReserved && endsAt && (
                    <Typography variant="body2" color="text.secondary">
                      Liberación estimada: {endsAt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  )}
                  {isReserved && status.groupId && (
                    <Typography variant="body2" color="text.secondary">
                      Grupo: {myGroups.find((g) => g.id === status.groupId)?.name || status.groupId}
                    </Typography>
                  )}
                  {isReserved && status.leaderId && (
                    <Chip icon={<PersonIcon />} label={`Líder: ${status.leaderId}`} size="small" color="warning" variant="outlined" sx={{ mt: 0.5 }} />
                  )}
                </Box>
              </Box>

              <Stack direction="row" spacing={1}>
                {!isReserved && (
                  <Button variant="contained" color="primary" startIcon={<LockIcon />} onClick={() => setReserveOpen(true)}>
                    Reservar
                  </Button>
                )}
                {isMine && (
                  <Button variant="outlined" color="error" startIcon={releasing ? <CircularProgress size={16} /> : <CancelIcon />} onClick={handleRelease} disabled={releasing}>
                    Liberar
                  </Button>
                )}
                <Button variant="outlined" size="small" onClick={fetchStatus}>Actualizar</Button>
              </Stack>
            </Box>
          </Paper>

          {/* Alert if occupied by someone else */}
          {isReserved && !isMine && (
            <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
              El ventilador está siendo usado por otro profesor. Deberás esperar a que lo libere para hacer tu reserva.
            </Alert>
          )}

          {/* My groups */}
          {myGroups.length > 0 && (
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>Mis Grupos</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Al reservar para un grupo, solo el líder designado recibirá los datos del ventilador.
              </Typography>
              {myGroups.map((g) => (
                <Card key={g.id} elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', mb: 1 }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                      <Box>
                        <Typography fontWeight="bold">{g.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{(g.members || []).filter((m) => m.role === 'STUDENT').length} estudiantes</Typography>
                      </Box>
                      {g.simulatorLeaderId
                        ? <Chip icon={<PersonIcon />} label={`Líder: ${(g.members || []).find((m) => m.user.id === g.simulatorLeaderId)?.user?.name || g.simulatorLeaderId}`} size="small" color="warning" />
                        : <Chip label="Sin líder asignado" size="small" variant="outlined" />
                      }
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Paper>
          )}
        </>
      )}

      <ReserveDialog open={reserveOpen} onClose={() => setReserveOpen(false)} onReserved={fetchStatus} myGroups={myGroups} />
    </Box>
  );
}
