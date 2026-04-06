import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styles from './ui/SaveProgressButton.module.css';

/**
 * SaveProgressButton — botón unificado de guardado para el Canvas de lección del estudiante.
 * Aparece al final del recorrido de elementos interactivos (Quiz, Prácticas, Simulador).
 * Llama a onSave (ej. triggerAutoCompletion) y confirma visualmente el guardado.
 */
const SaveProgressButton = ({ onSave, isSaving = false, isAlreadySaved = false }) => {
  const [justSaved, setJustSaved] = useState(false);

  const handleSave = async () => {
    if (justSaved || isSaving) return;
    try {
      await onSave?.();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 4000);
    } catch (_e) {
      // Silencioso; el padre maneja errores con Snackbar
    }
  };

  const showSuccess = justSaved || isAlreadySaved;

  return (
    <div className={styles['save-progress']}>
      <div className={styles['save-progress__divider']}>
        <span className={styles['save-progress__divider-dot']} aria-hidden="true" />
        <span className={styles['save-progress__divider-dot']} aria-hidden="true" />
        <span className={styles['save-progress__divider-dot']} aria-hidden="true" />
      </div>

      <div className={styles['save-progress__wrapper']}>
        <button
          type="button"
          className={`${styles['save-progress__btn']} ${showSuccess ? styles['save-progress__btn--saved'] : ''} ${isSaving ? styles['save-progress__btn--saving'] : ''}`}
          onClick={handleSave}
          disabled={isSaving || showSuccess}
          aria-label={showSuccess ? 'Progreso ya guardado' : 'Guardar progreso de la lección'}
        >
          <span className={styles['save-progress__icon']} aria-hidden="true">
            {showSuccess ? '✅' : isSaving ? '⏳' : '💾'}
          </span>
          <span className={styles['save-progress__label']}>
            {showSuccess
              ? '¡Progreso guardado!'
              : isSaving
              ? 'Guardando...'
              : 'Guardar Progreso'}
          </span>
        </button>

        {!showSuccess && !isSaving && (
          <p className={styles['save-progress__hint']}>
            Tu puntaje e interacciones quedarán registrados para revisión docente
          </p>
        )}

        {showSuccess && (
          <p className={styles['save-progress__hint--success']}>
            Tu avance ha sido registrado correctamente
          </p>
        )}
      </div>
    </div>
  );
};

SaveProgressButton.propTypes = {
  onSave: PropTypes.func,
  isSaving: PropTypes.bool,
  isAlreadySaved: PropTypes.bool,
};

export default SaveProgressButton;
