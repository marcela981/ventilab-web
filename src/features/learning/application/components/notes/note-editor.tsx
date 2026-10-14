/*
* Funcionalidad: NoteEditor
* Descripción: Lightweight Tiptap editor of a lesson note: StarterKit (paragraphs, headings, lists, bold/italic, code, quotes; its bundled Link extension configured without click navigation and with autolink) plus Placeholder. Emits the Tiptap JSON document on every change and notifies blur so the autosave can flush. This module is ONLY reached through React.lazy (note-composer): Tiptap/ProseMirror stay out of the viewer route's First Load JS and load when the user creates or edits a note. Depends on @tiptap/react, @tiptap/starter-kit, @tiptap/extension-placeholder and the notes CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { cx } from "@shared/lib/class-names";
import type { NoteDoc } from "../../entities/note.entity";
import styles from "../../../UI/notes-panel.module.css";

export type NoteEditorProps = {
  initialContent: NoteDoc | null
  label: string
  placeholder: string
  onChange: (doc: NoteDoc) => void
  onBlur: () => void
};

export function NoteEditor({ initialContent, label, placeholder, onChange, onBlur }: NoteEditorProps) {
  // The editor is created once: read the latest callbacks through a ref.
  const callbacks = useRef({ onChange, onBlur });

  useEffect(() => {
    callbacks.current = { onChange, onBlur };
  }, [onChange, onBlur]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent ?? "",
    immediatelyRender: false,
    autofocus: "end",
    editorProps: {
      attributes: {
        "role": "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        "class": cx(styles.editorContent),
      },
    },
    onUpdate: ({ editor: current }) => callbacks.current.onChange(current.getJSON() as NoteDoc),
    onBlur: () => callbacks.current.onBlur(),
  });

  return <EditorContent editor={editor} className={cx(styles.editor)} />;
}
