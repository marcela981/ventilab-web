import React, { useEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import SlashMenu from './SlashMenu';
import styles from './ui/RichTextEditor.module.css';

/* ─── Toolbar button helper ──────────────────────────────────────────────── */
const Btn = ({ onClick, active, disabled, title, children }) => (
  <button
    type="button"
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    disabled={disabled}
    title={title}
    aria-label={title}
    aria-pressed={active}
    className={`${styles['rte__btn']} ${active ? styles['rte__btn--active'] : ''}`}
  >
    {children}
  </button>
);

Btn.propTypes = {
  onClick: PropTypes.func.isRequired,
  active: PropTypes.bool,
  disabled: PropTypes.bool,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
};

/* ─── Divider helper ─────────────────────────────────────────────────────── */
const Sep = () => <span className={styles['rte__sep']} aria-hidden="true" />;

/* ─── RichTextEditor ─────────────────────────────────────────────────────── */
/**
 * RichTextEditor — editor Notion-style completo construido sobre Tiptap.
 *
 * Características:
 *  - Toolbar fija con todos los formatos (Bold, Italic, Underline, Strike,
 *    Highlight, Code, H1–H3, Listas, Checklist, Blockquote, Divider, Link)
 *  - BubbleMenu flotante sobre la selección de texto
 *  - SlashMenu: escribe `/` para abrir el menú de bloques
 *  - Placeholder configurable
 *  - onChange(html) cuando el contenido cambia
 */
const RichTextEditor = ({ content = '', onChange, placeholder = 'Escribe aquí… o usa / para insertar un bloque', autoFocus = false }) => {
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });
  const [slashQuery, setSlashQuery] = useState('');
  const wrapperRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: { HTMLAttributes: { class: 'rte-inline-code' } },
        codeBlock: { HTMLAttributes: { class: 'rte-code-block' } },
      }),
      Underline,
      TaskList.configure({ HTMLAttributes: { class: 'rte-task-list' } }),
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'rte-link' } }),
      Placeholder.configure({ placeholder }),
      TextStyle,
      Color,
    ],
    content,
    autofocus: autoFocus,
    onUpdate({ editor: ed }) {
      onChange?.(ed.getHTML());

      // Detectar comando slash: mirar si la palabra actual empieza con /
      const { from } = ed.state.selection;
      const text = ed.state.doc.textBetween(
        Math.max(0, from - 30),
        from,
        '\n',
        '\0',
      );
      const slashMatch = text.match(/(?:^|\n)\/(\w*)$/);
      if (slashMatch) {
        const coords = ed.view.coordsAtPos(from);
        const wrapper = wrapperRef.current?.getBoundingClientRect();
        if (wrapper) {
          setSlashPos({
            top: coords.bottom - wrapper.top + 4,
            left: Math.min(coords.left - wrapper.left, wrapper.width - 260),
          });
        }
        setSlashQuery(slashMatch[1]);
        setSlashMenuOpen(true);
      } else {
        setSlashMenuOpen(false);
      }
    },
  }, []);

  // Sync content cuando cambia externamente (ej. cuando se abre el editor por primera vez)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content && content !== current) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  const handleSlashSelect = useCallback((command) => {
    if (!editor) return;
    setSlashMenuOpen(false);

    // Eliminar el "/" y el texto de búsqueda escrito
    const { from } = editor.state.selection;
    const text = editor.state.doc.textBetween(Math.max(0, from - 30), from, '\n', '\0');
    const slashMatch = text.match(/(?:^|\n)\/(\w*)$/);
    if (slashMatch) {
      const deleteLen = 1 + slashMatch[1].length;
      editor.chain().focus()
        .deleteRange({ from: from - deleteLen, to: from })
        .run();
    }

    command(editor);
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={styles['rte']} ref={wrapperRef}>
      {/* ── Toolbar fija ── */}
      <div className={styles['rte__toolbar']} role="toolbar" aria-label="Herramientas de formato">

        {/* Headings */}
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })} title="Título 1 (H1)">H1</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })} title="Título 2 (H2)">H2</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })} title="Título 3 (H3)">H3</Btn>
        <Sep />

        {/* Inline format */}
        <Btn onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')} title="Negrita (Ctrl+B)"><b>B</b></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')} title="Cursiva (Ctrl+I)"><i>I</i></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')} title="Subrayado (Ctrl+U)"><u>U</u></Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')} title="Tachado"><s>S</s></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive('highlight')} title="Resaltar">🖊</Btn>
        <Btn onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')} title="Código inline">{`</>`}</Btn>
        <Sep />

        {/* Lists */}
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')} title="Lista de viñetas">• —</Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')} title="Lista numerada">1. —</Btn>
        <Btn onClick={() => editor.chain().focus().toggleTaskList().run()}
          active={editor.isActive('taskList')} title="Lista de tareas (checklist)">☑</Btn>
        <Sep />

        {/* Blocks */}
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')} title="Cita">"</Btn>
        <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')} title="Bloque de código">{ '{ }' }</Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Línea divisoria">—</Btn>
        <Sep />

        {/* Link */}
        <Btn
          onClick={() => {
            const prev = editor.getAttributes('link').href ?? '';
            const url = window.prompt('URL del enlace:', prev);
            if (url === null) return;
            if (url === '') {
              editor.chain().focus().extendMarkRange('link').unsetLink().run();
            } else {
              editor.chain().focus().extendMarkRange('link')
                .setLink({ href: url, target: '_blank' }).run();
            }
          }}
          active={editor.isActive('link')} title="Enlace">🔗</Btn>
        <Sep />

        {/* History */}
        <Btn onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()} title="Deshacer (Ctrl+Z)">↩</Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()} title="Rehacer (Ctrl+Y)">↪</Btn>
      </div>

      {/* ── BubbleMenu: aparece sobre la selección ── */}
      <BubbleMenu editor={editor} tippyOptions={{ duration: 120 }}>
        <div className={styles['rte__bubble']}>
          <Btn onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')} title="Negrita"><b>B</b></Btn>
          <Btn onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')} title="Cursiva"><i>I</i></Btn>
          <Btn onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')} title="Subrayado"><u>U</u></Btn>
          <Btn onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')} title="Tachado"><s>S</s></Btn>
          <Btn onClick={() => editor.chain().focus().toggleHighlight().run()}
            active={editor.isActive('highlight')} title="Resaltar">🖊</Btn>
          <Btn onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')} title="Código">{`</>`}</Btn>
          <Btn
            onClick={() => {
              const prev = editor.getAttributes('link').href ?? '';
              const url = window.prompt('URL del enlace:', prev);
              if (url === null) return;
              if (url === '') {
                editor.chain().focus().extendMarkRange('link').unsetLink().run();
              } else {
                editor.chain().focus().extendMarkRange('link')
                  .setLink({ href: url, target: '_blank' }).run();
              }
            }}
            active={editor.isActive('link')} title="Enlace">🔗</Btn>
        </div>
      </BubbleMenu>

      {/* ── SlashMenu emergente ── */}
      {slashMenuOpen && (
        <SlashMenu
          query={slashQuery}
          position={slashPos}
          onSelect={handleSlashSelect}
          onClose={() => setSlashMenuOpen(false)}
        />
      )}

      {/* ── Área de edición ── */}
      <EditorContent editor={editor} className={styles['rte__content']} />
    </div>
  );
};

RichTextEditor.propTypes = {
  content: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  autoFocus: PropTypes.bool,
};

export default RichTextEditor;
