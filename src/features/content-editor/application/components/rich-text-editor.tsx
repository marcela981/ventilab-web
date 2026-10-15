/*
* Funcionalidad: RichTextEditor
* Descripción: Tiptap editor of a rich text block of the page editor: StarterKit (paragraphs, headings, lists, bold/italic, code, quotes; its bundled Link extension without click navigation and with autolink) plus Placeholder, and a small toolbar (bold, italic, heading, bulleted and numbered list). Emits the Tiptap JSON document on every change (the block content `doc`, the shape the shared TiptapDocView renders). This module is ONLY reached through React.lazy (block-fields): Tiptap/ProseMirror load when a page with rich text is opened in the editor and never reach the /learn bundles. Depends on @tiptap/react, @tiptap/starter-kit, @tiptap/extension-placeholder, MUI and the page editor CSS Module.
* Versión: 1.0 (C4)
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import TitleIcon from "@mui/icons-material/Title";
import IconButton from "@mui/material/IconButton";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { cx } from "@shared/lib/class-names";
import styles from "../../UI/page-editor.module.css";

export type RichTextEditorProps = {
  initialDoc: Record<string, unknown>
  label: string
  placeholder: string
  onChange: (doc: Record<string, unknown>) => void
};

type ToolbarAction = { label: string, icon: ReactNode, run: (editor: Editor) => void };

// TODO(i18n): move to a content-editor namespace in src/i18n.
const TOOLBAR: readonly ToolbarAction[] = [
  { label: "Negrita", icon: <FormatBoldIcon fontSize="small" />, run: (editor) => editor.chain().focus().toggleBold().run() },
  { label: "Cursiva", icon: <FormatItalicIcon fontSize="small" />, run: (editor) => editor.chain().focus().toggleItalic().run() },
  { label: "Título", icon: <TitleIcon fontSize="small" />, run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "Lista", icon: <FormatListBulletedIcon fontSize="small" />, run: (editor) => editor.chain().focus().toggleBulletList().run() },
  { label: "Lista numerada", icon: <FormatListNumberedIcon fontSize="small" />, run: (editor) => editor.chain().focus().toggleOrderedList().run() },
];

export function RichTextEditor({ initialDoc, label, placeholder, onChange }: RichTextEditorProps) {
  // The editor is created once: read the latest callback through a ref.
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialDoc,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "role": "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        "class": cx(styles.editorContent),
      },
    },
    onUpdate: ({ editor: current }) => onChangeRef.current(current.getJSON() as Record<string, unknown>),
  });

  return (
    <div className={cx(styles.richText)}>
      <div className={cx(styles.toolbar)} role="toolbar" aria-label={`Formato: ${label}`}>
        {TOOLBAR.map((action) => (
          <IconButton
            key={action.label}
            size="small"
            aria-label={action.label}
            disabled={!editor}
            onClick={() => (editor ? action.run(editor) : undefined)}
          >
            {action.icon}
          </IconButton>
        ))}
      </div>
      <EditorContent editor={editor} className={cx(styles.editor)} />
    </div>
  );
}
