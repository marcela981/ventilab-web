/*
* Funcionalidad: RichTextEditor
* Descripción: Tiptap editor of the evaluation builder (description, question prompts and scenario contents): StarterKit (paragraphs, headings, lists, bold/italic, code, quotes; its Link extension without click navigation) plus Placeholder, with a small toolbar (bold, italic, bullet and numbered lists). Starts from a Tiptap document or plain text and emits the Tiptap JSON document on every change, the format the backend sanitizes and stores. This module is ONLY reached through React.lazy (RichTextField): Tiptap/ProseMirror stay out of every bundle except the builder's on-demand chunk. Depends on @tiptap/react, @tiptap/starter-kit, @tiptap/extension-placeholder, MUI and the builder CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import IconButton from "@mui/material/IconButton";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { cx } from "@shared/lib/class-names";
import { BUILDER_COPY } from "../../entities/builder-copy";
import type { RichDoc, RichTextValue } from "../../entities/builder-rich-text";
import styles from "../../../UI/builder.module.css";

export type RichTextEditorProps = {
  label: string
  initialValue: RichTextValue | null
  placeholder?: string | undefined
  disabled?: boolean | undefined
  onChange: (doc: RichDoc) => void
};

export function RichTextEditor({ label, initialValue, placeholder = "", disabled = false, onChange }: RichTextEditorProps) {
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
    content: initialValue ?? "",
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "role": "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        "class": cx(styles.editorContent),
      },
    },
    onUpdate: ({ editor: current }) => onChangeRef.current(current.getJSON() as RichDoc),
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const tools = [
    { label: BUILDER_COPY.bold, icon: <FormatBoldIcon fontSize="small" />, active: "bold", run: () => editor?.chain().focus().toggleBold().run() },
    { label: BUILDER_COPY.italic, icon: <FormatItalicIcon fontSize="small" />, active: "italic", run: () => editor?.chain().focus().toggleItalic().run() },
    { label: BUILDER_COPY.bulletList, icon: <FormatListBulletedIcon fontSize="small" />, active: "bulletList", run: () => editor?.chain().focus().toggleBulletList().run() },
    { label: BUILDER_COPY.orderedList, icon: <FormatListNumberedIcon fontSize="small" />, active: "orderedList", run: () => editor?.chain().focus().toggleOrderedList().run() },
  ];

  return (
    <div className={cx(styles.editor)}>
      {disabled ? null : (
        <div className={cx(styles.editorToolbar)} role="toolbar" aria-label={label}>
          {tools.map((tool) => (
            <IconButton
              key={tool.active}
              size="small"
              aria-label={tool.label}
              aria-pressed={editor?.isActive(tool.active) ?? false}
              onClick={tool.run}
            >
              {tool.icon}
            </IconButton>
          ))}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
