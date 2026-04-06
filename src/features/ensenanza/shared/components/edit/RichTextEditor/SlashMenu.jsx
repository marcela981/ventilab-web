import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import styles from './ui/SlashMenu.module.css';

/** Catálogo completo de comandos disponibles con el / */
const ALL_COMMANDS = [
  { id: 'h1',        icon: 'H1', label: 'Título 1',          desc: 'Encabezado grande',           keywords: ['titulo', 'heading', 'h1'],
    cmd: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run() },
  { id: 'h2',        icon: 'H2', label: 'Título 2',          desc: 'Encabezado mediano',          keywords: ['subtitulo', 'heading', 'h2'],
    cmd: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run() },
  { id: 'h3',        icon: 'H3', label: 'Título 3',          desc: 'Encabezado pequeño',          keywords: ['subtitulo', 'h3'],
    cmd: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run() },
  { id: 'bold',      icon: 'B',  label: 'Negrita',           desc: 'Texto en negrita',            keywords: ['bold', 'negrita', 'fuerte'],
    cmd: (ed) => ed.chain().focus().toggleBold().run() },
  { id: 'italic',    icon: 'I',  label: 'Cursiva',           desc: 'Texto en cursiva',            keywords: ['italic', 'cursiva', 'inclinado'],
    cmd: (ed) => ed.chain().focus().toggleItalic().run() },
  { id: 'ul',        icon: '•',  label: 'Lista de viñetas',  desc: 'Lista sin orden',             keywords: ['lista', 'viñetas', 'bullet', 'ul'],
    cmd: (ed) => ed.chain().focus().toggleBulletList().run() },
  { id: 'ol',        icon: '1.', label: 'Lista numerada',    desc: 'Lista con números',           keywords: ['numerada', 'ordenada', 'ol', 'lista'],
    cmd: (ed) => ed.chain().focus().toggleOrderedList().run() },
  { id: 'todo',      icon: '☑',  label: 'Lista de tareas',   desc: 'Checklist interactivo',       keywords: ['todo', 'tarea', 'checklist', 'check'],
    cmd: (ed) => ed.chain().focus().toggleTaskList().run() },
  { id: 'quote',     icon: '"',  label: 'Cita',              desc: 'Bloque de cita',              keywords: ['cita', 'quote', 'blockquote'],
    cmd: (ed) => ed.chain().focus().toggleBlockquote().run() },
  { id: 'code',      icon: '<>', label: 'Código inline',     desc: 'Texto como código',           keywords: ['codigo', 'code', 'inline'],
    cmd: (ed) => ed.chain().focus().toggleCode().run() },
  { id: 'codeblock', icon: '{}', label: 'Bloque de código',  desc: 'Bloque de código multi-línea', keywords: ['codeblock', 'codigo', 'bloque'],
    cmd: (ed) => ed.chain().focus().toggleCodeBlock().run() },
  { id: 'divider',   icon: '—',  label: 'Línea divisoria',   desc: 'Separador horizontal',        keywords: ['linea', 'divider', 'separador', 'hr'],
    cmd: (ed) => ed.chain().focus().setHorizontalRule().run() },
  { id: 'highlight', icon: '🖊', label: 'Resaltar',          desc: 'Resaltar texto',              keywords: ['resaltar', 'highlight', 'marcador'],
    cmd: (ed) => ed.chain().focus().toggleHighlight().run() },
];

const SlashMenu = ({ query, position, onSelect, onClose }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef(null);

  const filtered = ALL_COMMANDS.filter(c =>
    !query ||
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.keywords.some(k => k.includes(query.toLowerCase()))
  );

  useEffect(() => { setActiveIdx(0); }, [query]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (filtered[activeIdx]) onSelect(filtered[activeIdx].cmd);
        return;
      }
      setActiveIdx(prev => {
        if (e.key === 'ArrowDown') return Math.min(prev + 1, filtered.length - 1);
        return Math.max(prev - 1, 0);
      });
    };
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [filtered, activeIdx, onSelect, onClose]);

  // Scroll activo en vista
  useEffect(() => {
    const el = listRef.current?.children[activeIdx];
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (filtered.length === 0) return null;

  return (
    <div
      className={styles['slash-menu']}
      style={{ top: position.top, left: Math.max(0, position.left) }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <p className={styles['slash-menu__hint']}>
        Bloques — <kbd className={styles['slash-menu__kbd']}>↑↓</kbd> navegar ·{' '}
        <kbd className={styles['slash-menu__kbd']}>Enter</kbd> insertar ·{' '}
        <kbd className={styles['slash-menu__kbd']}>Esc</kbd> cerrar
      </p>
      <div className={styles['slash-menu__list']} ref={listRef}>
        {filtered.map((cmd, i) => (
          <button
            key={cmd.id}
            type="button"
            className={`${styles['slash-menu__item']} ${i === activeIdx ? styles['slash-menu__item--active'] : ''}`}
            onMouseEnter={() => setActiveIdx(i)}
            onClick={() => onSelect(cmd.cmd)}
          >
            <span className={styles['slash-menu__icon']}>{cmd.icon}</span>
            <span className={styles['slash-menu__body']}>
              <span className={styles['slash-menu__label']}>{cmd.label}</span>
              <span className={styles['slash-menu__desc']}>{cmd.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

SlashMenu.propTypes = {
  query: PropTypes.string,
  position: PropTypes.shape({ top: PropTypes.number, left: PropTypes.number }).isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SlashMenu;
