/*
* Funcionalidad: LessonResolver
* Descripción: Invisible helper of /me/notes: reads the lesson of a note (`GET /api/lessons/{id}` through useNoteLesson, cached and deduplicated by SWR) and reports its NoteLessonInfo to the page once, so the page can group the notes by module (NoteDTO carries only the lessonId). Renders nothing. Depends on React and the useNoteLesson hook.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useEffect } from "react";
import type { NoteLessonInfo } from "../entities/my-notes.entity";
import { useNoteLesson } from "../hooks/use-note-lesson";

export type LessonResolverProps = {
  lessonId: string
  onResolved: (lesson: NoteLessonInfo) => void
};

export function LessonResolver({ lessonId, onResolved }: LessonResolverProps) {
  const { lesson } = useNoteLesson(lessonId);

  useEffect(() => {
    if (lesson) {
      onResolved(lesson);
    }
  }, [lesson, onResolved]);

  return null;
}
