/**
 * GhostAccordion — Acordeón fantasma para creación rápida de Niveles en Modo Edición.
 *
 * Aparece al final de la lista de niveles/subniveles del currículum
 * cuando isEditMode === true. Se oculta automáticamente cuando se
 * alcanza la profundidad máxima permitida (3 niveles).
 *
 * Jerarquía de profundidad:
 *   depth 0 → Nivel raíz
 *   depth 1 → Subnivel
 *   depth 2 → Módulo (último nivel en el que tiene sentido agregar)
 *   depth 3+ → No se renderiza (tope de jerarquía)
 *
 * Clases BEM: .ghost-accordion  /  .ghost-accordion__icon  /  .ghost-accordion__label
 * Sin sx props — toda la UI está en ui/GhostAccordion.module.css.
 */
import React from 'react';
import AddIcon from '@mui/icons-material/Add';
import styles from './ui/GhostAccordion.module.css';

const MAX_DEPTH = 3;

export default function GhostAccordion({ label, depth, onCreate }) {
  // Guardia de profundidad máxima: 3 niveles (0, 1, 2)
  if (depth >= MAX_DEPTH) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCreate?.();
    }
  };

  const depthClass = depth > 0 ? styles[`ghost-accordion--depth-${depth}`] : '';

  return (
    <div
      className={`${styles['ghost-accordion']} ${depthClass}`.trim()}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onCreate}
      onKeyDown={handleKeyDown}
    >
      <AddIcon className={styles['ghost-accordion__icon']} fontSize="small" />
      <span className={styles['ghost-accordion__label']}>{label}</span>
    </div>
  );
}

