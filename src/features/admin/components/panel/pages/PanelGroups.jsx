/**
 * PanelGroups - Group Management Page
 * CRUD for groups/subgroups (max 3 levels), member management, simulator lead.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, Tooltip, Chip,
  TextField, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, ListItemAvatar, Avatar, ListItemSecondaryAction,
  Accordion, AccordionSummary, AccordionDetails, Select, MenuItem, InputLabel, FormControl,
  Divider, Skeleton, CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Group as GroupIcon, PersonAdd as PersonAddIcon, Person as PersonIcon,
  ExpandMore as ExpandMoreIcon, Star as StarIcon, StarBorder as StarBorderIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import groupsService from '@/features/admin/services/groupsService';

// ── Group Form Dialog ─────────────────────────────────────────────────────────

function GroupFormDialog({ open, onClose, onSave, parentGroup, editGroup }) {
  const isEdit = !!editGroup;
  const [name, setName] = useState(editGroup?.name || '');
  const [description, setDescription] = useState(editGroup?.description || '');
  const [semester, setSemester] = useState(editGroup?.semester || '');
  const [maxStudents, setMaxStudents] = useState(editGroup?.maxStudents || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setName(editGroup?.name || '');
      setDescription(editGroup?.description || '');
      setSemester(editGroup?.semester || '');
      setMaxStudents(editGroup?.maxStudents || '');
      setErr('');
    }
  }, [open, editGroup]);

  const handleSave = async () => {
    if (!name.trim()) return setErr('El nombre es requerido');
    setSaving(true);
    setErr('');
    const payload = { name: name.trim(), description: description.trim() || undefined, semester: semester.trim() || undefined, maxStudents: maxStudents ? Number(maxStudents) : undefined };
    const result = isEdit
      ? await groupsService.updateGroup(editGroup.id, payload)
      : await groupsService.createGroup({ ...payload, parentGroupId: parentGroup?.id });
    setSaving(false);
    if (result.success) { onSave(); onClose(); }
    else setErr(result.error?.message || 'Error al guardar');
  };

  const levelLabels = ['Grupo principal', 'Subgrupo', 'Sub-subgrupo'];
  const depth = isEdit ? (editGroup?.depth ?? 0) : (parentGroup ? parentGroup.depth + 1 : 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Editar grupo' : `Nuevo ${levelLabels[depth] || 'grupo'}`}{parentGroup && !isEdit && <Typography variant="caption" display="block" color="text.secondary">Dentro de: {parentGroup.name}</Typography>}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {err && <Alert severity="error">{err}</Alert>}
        <TextField label="Nombre *" size="small" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Descripción" size="small" multiline rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField label="Semestre" size="small" value={semester} onChange={(e) => setSemester(e.target.value)} sx={{ flex: 1 }} />
          <TextField label="Máx. estudiantes" size="small" type="number" value={maxStudents} onChange={(e) => setMaxStudents(e.target.value)} sx={{ flex: 1 }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? <CircularProgress size={20} /> : 'Guardar'}</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Add Member Dialog ─────────────────────────────────────────────────────────

function AddMemberDialog({ open, onClose, onSave, groupId }) {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { if (open) { setUserId(''); setRole('STUDENT'); setErr(''); } }, [open]);

  const handleAdd = async () => {
    if (!userId.trim()) return setErr('Ingresa el ID o email del usuario');
    setSaving(true);
    const result = await groupsService.addMember(groupId, userId.trim(), role);
    setSaving(false);
    if (result.success) { onSave(); onClose(); }
    else setErr(result.error?.message || 'Error al agregar');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Agregar miembro</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {err && <Alert severity="error">{err}</Alert>}
        <TextField label="ID del usuario" size="small" value={userId} onChange={(e) => setUserId(e.target.value)} helperText="Pega el ID del usuario a agregar" />
        <FormControl size="small" fullWidth>
          <InputLabel>Rol en el grupo</InputLabel>
          <Select value={role} label="Rol en el grupo" onChange={(e) => setRole(e.target.value)}>
            <MenuItem value="STUDENT">Estudiante</MenuItem>
            <MenuItem value="TEACHER">Profesor</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleAdd} disabled={saving}>Agregar</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Group Card ────────────────────────────────────────────────────────────────

function GroupCard({ group, onEdit, onDelete, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [subgroupFormOpen, setSubgroupFormOpen] = useState(false);

  const loadMembers = async () => {
    setLoadingMembers(true);
    const res = await groupsService.getGroupMembers(group.id);
    if (res.success) setMembers(res.data.members || []);
    setLoadingMembers(false);
  };

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && members.length === 0) loadMembers();
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('¿Remover este miembro del grupo?')) return;
    await groupsService.removeMember(group.id, userId);
    loadMembers();
  };

  const handleSetLead = async (userId) => {
    const isAlreadyLead = group.simulatorLeaderId === userId;
    await groupsService.setSimulatorLead(group.id, isAlreadyLead ? null : userId);
    onRefresh();
  };

  const canCreateSubgroup = (group.depth ?? 0) < 2;

  return (
    <>
      <Accordion expanded={expanded} onChange={handleExpand} elevation={0}
        sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, mb: 1, '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
            <GroupIcon color={group.depth === 0 ? 'primary' : group.depth === 1 ? 'secondary' : 'action'} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight="bold" noWrap>{group.name}</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.3 }}>
                {group.enrollmentCode && <Chip label={group.enrollmentCode} size="small" variant="outlined" />}
                {group.semester && <Chip label={group.semester} size="small" />}
                <Chip label={`${group._count?.members ?? 0} miembros`} size="small" color="primary" variant="outlined" />
                {group.leader && <Chip icon={<StarIcon />} label={`Líder: ${group.leader.name || group.leader.email}`} size="small" color="warning" />}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }} onClick={(e) => e.stopPropagation()}>
              {canCreateSubgroup && <Tooltip title="Crear subgrupo"><IconButton size="small" onClick={() => setSubgroupFormOpen(true)}><AddIcon fontSize="small" /></IconButton></Tooltip>}
              <Tooltip title="Editar"><IconButton size="small" onClick={() => onEdit(group)}><EditIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => onDelete(group)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
            </Box>
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ pt: 0 }}>
          {group.description && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{group.description}</Typography>}

          {/* Subgroups */}
          {group.subGroups?.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Subgrupos</Typography>
              {group.subGroups.map((sg) => (
                <Chip key={sg.id} icon={<ChevronRightIcon />} label={`${sg.name} (${sg._count?.members ?? 0})`} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
              ))}
            </Box>
          )}

          {/* Members */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold">Miembros</Typography>
            <Button size="small" startIcon={<PersonAddIcon />} onClick={() => setAddMemberOpen(true)}>Agregar</Button>
          </Box>

          {loadingMembers
            ? <Box sx={{ py: 2, textAlign: 'center' }}><CircularProgress size={24} /></Box>
            : members.length === 0
              ? <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>Sin miembros aún</Typography>
              : <List dense disablePadding>
                  {members.map((m, i) => (
                    <React.Fragment key={m.id}>
                      {i > 0 && <Divider component="li" />}
                      <ListItem sx={{ px: 0 }}>
                        <ListItemAvatar sx={{ minWidth: 36 }}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>{(m.user.name || m.user.email || '?')[0].toUpperCase()}</Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={m.user.name || m.user.email} secondary={`${m.role} · ${m.user.email}`} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {m.role === 'STUDENT' && (
                            <Tooltip title={group.simulatorLeaderId === m.user.id ? 'Quitar como líder' : 'Designar como líder del simulador'}>
                              <IconButton size="small" color={group.simulatorLeaderId === m.user.id ? 'warning' : 'default'} onClick={() => handleSetLead(m.user.id)}>
                                {group.simulatorLeaderId === m.user.id ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Remover del grupo">
                            <IconButton size="small" color="error" onClick={() => handleRemoveMember(m.user.id)}><DeleteIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </Box>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
          }
        </AccordionDetails>
      </Accordion>

      <AddMemberDialog open={addMemberOpen} onClose={() => setAddMemberOpen(false)} onSave={() => { loadMembers(); onRefresh(); }} groupId={group.id} />
      <GroupFormDialog open={subgroupFormOpen} onClose={() => setSubgroupFormOpen(false)} onSave={onRefresh} parentGroup={group} />
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PanelGroups() {
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editGroup, setEditGroup] = useState(null);

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await groupsService.getGroups({ isActive: true, parentGroupId: null });
    if (res.success) setGroups(res.data.groups || []);
    else setError(res.error?.message || 'Error al cargar grupos');
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const handleDelete = async (group) => {
    if (!window.confirm(`¿Eliminar el grupo "${group.name}"? Esta acción no se puede deshacer.`)) return;
    const res = await groupsService.deleteGroup(group.id);
    if (res.success) fetchGroups();
    else alert(res.error?.message || 'Error al eliminar');
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Gestión de Grupos</Typography>
          <Typography variant="body2" color="text.secondary">
            Crea y administra grupos, subgrupos y la asignación del líder del simulador.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Nuevo Grupo
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Groups list */}
      {isLoading ? (
        [1, 2, 3].map((i) => <Skeleton key={i} variant="rectangular" height={72} sx={{ mb: 1, borderRadius: 2 }} />)
      ) : groups.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
          <GroupIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6">No hay grupos creados</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>Crea tu primer grupo para organizar a tus estudiantes.</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>Crear primer grupo</Button>
        </Paper>
      ) : (
        groups.map((g) => (
          <GroupCard key={g.id} group={g} onEdit={setEditGroup} onDelete={handleDelete} onRefresh={fetchGroups} />
        ))
      )}

      {/* Create dialog */}
      <GroupFormDialog open={createOpen} onClose={() => setCreateOpen(false)} onSave={fetchGroups} />

      {/* Edit dialog */}
      {editGroup && (
        <GroupFormDialog open={!!editGroup} onClose={() => setEditGroup(null)} onSave={() => { setEditGroup(null); fetchGroups(); }} editGroup={editGroup} />
      )}
    </Box>
  );
}
