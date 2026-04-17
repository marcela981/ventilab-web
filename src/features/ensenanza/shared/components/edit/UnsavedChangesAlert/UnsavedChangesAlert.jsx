import React from 'react';
import styles from './ui/UnsavedChangesAlert.module.css';

/**
 * UnsavedChangesAlert — diálogo de confirmación cuando hay cambios sin guardar.
 *
 * Aparece cuando el usuario intenta:
 *  - Navegar a otra lección (LessonViewer llama a onNavigate)
 *  - Salir del modo edición
 *  - Cerrar la pestaña (handled via beforeunload en el padre)
 *
 * Props:
 *  open       — boolean, controla visibilidad
 *  onSave     — callback "Guardar y continuar"
 *  onDiscard  — callback "Descartar y continuar"
 *  onCancel   — callback "Volver a editar"
 */
const UnsavedChangesAlert = ({ open, onSave, onDiscard, onCancel }) => {
  if (!open) return null;

  return (
    <div
      className={styles['unsaved-overlay']}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-title"
      aria-describedby="unsaved-desc"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
    >
      <div className={styles['unsaved-dialog']}>
        {/* Ícono */}
        <div className={styles['unsaved-dialog__icon']} aria-hidden="true">⚠️</div>

        {/* Textos */}
        <h2 id="unsaved-title" className={styles['unsaved-dialog__title']}>
          Cambios sin guardar
        </h2>
        <p id="unsaved-desc" className={styles['unsaved-dialog__desc']}>
          Tienes modificaciones en esta lección que aún no has guardado.
          ¿Qué deseas hacer?
        </p>

        {/* Acciones */}
        <div className={styles['unsaved-dialog__actions']}>
          <button
            type="button"
            className={`${styles['unsaved-dialog__btn']} ${styles['unsaved-dialog__btn--save']}`}
            onClick={onSave}
            autoFocus
          >
            <span aria-hidden="true">💾</span>
            Guardar cambios
          </button>
          <button
            type="button"
            className={`${styles['unsaved-dialog__btn']} ${styles['unsaved-dialog__btn--discard']}`}
            onClick={onDiscard}
          >
            <span aria-hidden="true">🗑️</span>
            Descartar
          </button>
          <button
            type="button"
            className={`${styles['unsaved-dialog__btn']} ${styles['unsaved-dialog__btn--cancel']}`}
            onClick={onCancel}
          >
            Volver a editar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesAlert;
