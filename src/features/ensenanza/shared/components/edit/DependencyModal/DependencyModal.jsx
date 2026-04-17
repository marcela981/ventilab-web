/**
 * DependencyModal — Modal de dos columnas para editar los prerequisitos de un módulo.
 *
 * Columna izquierda : módulo de origen (solo lectura).
 * Columna derecha   : checklist de todos los módulos del currículo agrupados por nivel,
 *                     excluyendo el módulo actual.
 *
 * Props:
 *   open        {boolean}  — controla la visibilidad del Dialog
 *   onClose     {func}     — cierra sin guardar
 *   onSave      {func}     — recibe el array de IDs seleccionados como prerequisitos
 *   module      {object}   — módulo que se está editando ({ id, title, level, prerequisites, … })
 *   allModules  {object}   — mapa id→module de curriculumData.modules
 *   levels      {Array}    — array de niveles de curriculumData.levels (para orden/labels)
 *
 * BEM root: dep-modal  /  dep-switch
 * Estilos : ui/DependencyModal.module.css
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import styles from './ui/DependencyModal.module.css';

export default function DependencyModal({ open, onClose, onSave, module, allModules, levels }) {
  const [selected, setSelected] = useState([]);

  // Sync cuando cambia el módulo o se abre el modal
  useEffect(() => {
    if (open) {
      setSelected(module?.prerequisites || []);
    }
  }, [open, module]);

  // Construir lista de candidatos agrupados por nivel (excluir módulo actual)
  const grouped = useMemo(() => {
    if (!allModules || !module) return [];
    const levelOrder = (levels || []).map(l => l.id);

    const byLevel = {};
    Object.values(allModules).forEach(mod => {
      if (mod.id === module.id) return; // excluir el módulo actual
      const lvl = mod.level || 'other';
      if (!byLevel[lvl]) byLevel[lvl] = [];
      byLevel[lvl].push(mod);
    });

    // Ordenar grupos según el array levels; los no reconocidos van al final
    const sortedLevels = Object.keys(byLevel).sort((a, b) => {
      const ia = levelOrder.indexOf(a);
      const ib = levelOrder.indexOf(b);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    return sortedLevels.map(lvlId => {
      const levelMeta = (levels || []).find(l => l.id === lvlId);
      return {
        levelId: lvlId,
        levelTitle: levelMeta?.title || lvlId,
        modules: byLevel[lvlId].sort((a, b) => (a.order || 0) - (b.order || 0)),
      };
    });
  }, [allModules, module, levels]);

  const toggle = useCallback((modId) => {
    setSelected(prev =>
      prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId]
    );
  }, []);

  const handleSave = () => {
    if (onSave) onSave(selected);
    // TODO Fase 3: PATCH /api/modules/{module.id}/prerequisites  body: { prerequisites: selected }
    onClose();
  };

  const levelLabel = useMemo(() => {
    if (!module || !levels) return '';
    return (levels.find(l => l.id === module.level) || {}).title || module.level || '';
  }, [module, levels]);

  if (!module) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="dep-modal-title"
      PaperProps={{ style: { borderRadius: 10, overflow: 'hidden' } }}
    >
      {/* ─── Encabezado ────────────────────────────────────────────────────── */}
      <DialogTitle
        id="dep-modal-title"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.9rem',
          fontWeight: 700,
          padding: '14px 20px',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <AccountTreeOutlinedIcon style={{ fontSize: 18, color: '#0BBAF4' }} />
        Editar Prerequisitos
        <IconButton
          onClick={onClose}
          size="small"
          aria-label="Cerrar"
          style={{ marginLeft: 'auto', color: 'rgba(0,0,0,0.4)' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* ─── Cuerpo ─────────────────────────────────────────────────────────── */}
      <DialogContent style={{ padding: '20px 24px' }}>
        <div className={styles['dep-modal__columns']}>

          {/* ── Columna izquierda: módulo de origen ── */}
          <div className={styles['dep-modal__col']}>
            <p className={styles['dep-modal__col-title']}>
              Contenido
            </p>

            <div className={styles['dep-modal__module-card']}>
              {levelLabel && (
                <span className={styles['dep-modal__module-badge']}>{levelLabel}</span>
              )}
              <p className={styles['dep-modal__module-title']}>{module.title}</p>
              {module.description && (
                <p className={styles['dep-modal__hint']}>{module.description}</p>
              )}
            </div>

            <p className={styles['dep-modal__hint']}>
              Este módulo quedará bloqueado para los estudiantes que no hayan completado los prerequisitos seleccionados.
            </p>
          </div>

          {/* ── Columna derecha: checklist ── */}
          <div className={`${styles['dep-modal__col']} ${styles['dep-modal__col--depends']}`}>
            <p className={styles['dep-modal__col-title']}>
              Depende de
              {selected.length > 0 && (
                <span className={styles['dep-modal__count']}>{selected.length}</span>
              )}
            </p>

            <div className={styles['dep-modal__checklist']}>
              {grouped.length === 0 && (
                <p className={styles['dep-modal__empty']}>No hay otros módulos disponibles.</p>
              )}

              {grouped.map(group => (
                <React.Fragment key={group.levelId}>
                  <p className={styles['dep-modal__level-label']}>{group.levelTitle}</p>
                  {group.modules.map(mod => {
                    const isChecked = selected.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`${styles['dep-modal__check-item']} ${isChecked ? styles['dep-modal__check-item--checked'] : ''}`}
                        onClick={() => toggle(mod.id)}
                      >
                        <input
                          type="checkbox"
                          className={styles['dep-modal__checkbox']}
                          checked={isChecked}
                          onChange={() => toggle(mod.id)}
                          onClick={e => e.stopPropagation()}
                        />
                        <span className={styles['dep-modal__check-label']}>{mod.title}</span>
                      </label>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* ─── Acciones ───────────────────────────────────────────────────────── */}
      <DialogActions style={{ padding: '12px 24px', borderTop: '1px solid rgba(0,0,0,0.08)', gap: 8 }}>
        <Button onClick={onClose} size="small" style={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.78rem' }}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          size="small"
          variant="contained"
          disableElevation
          style={{ background: '#0BBAF4', color: '#fff', fontSize: '0.78rem', borderRadius: 20, padding: '4px 18px' }}
        >
          Guardar prerequisitos
        </Button>
      </DialogActions>
    </Dialog>
  );
}

