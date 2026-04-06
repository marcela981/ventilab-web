import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from './ui/BlockInjector.module.css';

const BLOCK_TYPES = [
  {
    id: 'richtext',
    label: 'Texto Enriquecido',
    icon: '📝',
    description: 'Párrafo, encabezado o lista',
  },
  {
    id: 'miniquiz',
    label: 'Mini Quiz',
    icon: '❓',
    description: 'Pregunta de opción múltiple',
  },
  {
    id: 'simulator',
    label: 'Simulador',
    icon: '🔧',
    description: 'Bloque interactivo de simulación',
  },
];

/**
 * BlockInjector — separador interactivo estilo Notion entre secciones en Modo Edición.
 * Muestra una línea divisoria con un botón "+" central que, al hacer clic,
 * abre una paleta de tipos de bloque para insertar contenido nuevo.
 *
 * Solo debe renderizarse cuando isEditMode === true (el padre es responsable de esto).
 */
const BlockInjector = ({ afterPageIndex, onInsertBlock }) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (blockType) => {
    setOpen(false);
    onInsertBlock?.({ type: blockType.id, afterIndex: afterPageIndex });
    // TODO Fase 3: POST /api/lessons/{lessonId}/blocks { type, afterIndex }
    console.log('[BlockInjector] insert block:', { type: blockType.id, afterPageIndex });
  };

  return (
    <div
      className={`${styles['block-injector']} ${hovered || open ? styles['block-injector--active'] : ''}`}
      ref={containerRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { if (!open) setHovered(false); }}
    >
      <div className={styles['block-injector__row']}>
        <div className={styles['block-injector__line']} />
        <button
          type="button"
          className={`${styles['block-injector__trigger']} ${open ? styles['block-injector__trigger--open'] : ''}`}
          onClick={(e) => { e.stopPropagation(); setOpen(prev => !prev); }}
          aria-label="Insertar bloque de contenido"
          aria-expanded={open}
          title={open ? 'Cerrar menú' : 'Insertar bloque'}
        >
          <span className={styles['block-injector__plus']} aria-hidden="true">
            {open ? '×' : '+'}
          </span>
        </button>
        <div className={styles['block-injector__line']} />
      </div>

      {open && (
        <div
          className={styles['block-injector__palette']}
          onClick={(e) => e.stopPropagation()}
          role="menu"
          aria-label="Tipos de bloque disponibles"
        >
          <p className={styles['block-injector__palette-title']}>
            Insertar bloque
          </p>
          <div className={styles['block-injector__options']}>
            {BLOCK_TYPES.map(blockType => (
              <button
                key={blockType.id}
                type="button"
                className={styles['block-injector__option']}
                onClick={() => handleSelect(blockType)}
                role="menuitem"
              >
                <span className={styles['block-injector__option-icon']} aria-hidden="true">
                  {blockType.icon}
                </span>
                <span className={styles['block-injector__option-body']}>
                  <span className={styles['block-injector__option-label']}>
                    {blockType.label}
                  </span>
                  <span className={styles['block-injector__option-desc']}>
                    {blockType.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <p className={styles['block-injector__hint']}>
            También puedes escribir{' '}
            <kbd className={styles['block-injector__kbd']}>/</kbd>{' '}
            al inicio de cualquier bloque de texto
          </p>
        </div>
      )}
    </div>
  );
};

BlockInjector.propTypes = {
  afterPageIndex: PropTypes.number.isRequired,
  onInsertBlock: PropTypes.func,
};

export default BlockInjector;
