/**
 * GhostCard — Tarjeta fantasma para creación rápida en Modo Edición.
 *
 * Aparece al final de una lista de lecciones o módulos cuando
 * isEditMode === true. El borde discontinuo y el fondo semitransparente
 * indican al docente que puede agregar contenido nuevo.
 *
 * Clases BEM: .ghost-card  /  .ghost-card__icon  /  .ghost-card__label
 * Sin sx props — toda la UI está en ui/GhostCard.module.css.
 */
import React from 'react';
import AddIcon from '@mui/icons-material/Add';
import styles from './ui/GhostCard.module.css';

export default function GhostCard({ label, onCreate }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCreate?.();
    }
  };

  return (
    <div
      className={styles['ghost-card']}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onCreate}
      onKeyDown={handleKeyDown}
    >
      <AddIcon className={styles['ghost-card__icon']} fontSize="small" />
      <span className={styles['ghost-card__label']}>{label}</span>
    </div>
  );
}

