/*
 * Funcionalidad: Utilidad de agrupación de evaluaciones
 * Descripción: Clasifica actividades y quizzes por tipo (quiz/taller/examen),
 *              track (mecánica/ventylab) y nivel (principiante/intermedio/avanzado)
 *              usando patrones de id y el campo level del item.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 */

import type { Activity } from '../../evaluation.types';
import type { Quiz } from '../services/evaluationService';

// ─── Public types ────────────────────────────────────────────────────────────

export type Level = 'principiante' | 'intermedio' | 'avanzado';
export type Track = 'mecanica' | 'ventylab';
export type ItemType = 'QUIZ' | 'TALLER' | 'EXAM';

export interface EvaluationItem {
  id: string;
  title: string;
  itemType: ItemType;
  description?: string | null;
  maxScore?: number;
  isPublished?: boolean;
  passingScore?: number;
  level: Level;
  track: Track;
}

export interface ByLevel {
  principiante: EvaluationItem[];
  intermedio: EvaluationItem[];
  avanzado: EvaluationItem[];
}

export interface GroupedEvaluations {
  quizzes:  { mecanica: ByLevel; ventylab: ByLevel };
  talleres: { mecanica: ByLevel; ventylab: ByLevel };
  examenes: { mecanica: ByLevel; ventylab: ByLevel };
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function emptyByLevel(): ByLevel {
  return { principiante: [], intermedio: [], avanzado: [] };
}

/**
 * Detects difficulty level from the item's level field, then id, then moduleId.
 * Priority: explicit level field > l1/l2/l3 in id > keyword in moduleId.
 */
function detectLevel(id: string, levelField?: string, moduleId?: string): Level {
  // Primary: level field present in JSON (e.g. "level01-principiante")
  if (levelField) {
    if (levelField.includes('principiante')) return 'principiante';
    if (levelField.includes('intermedio'))   return 'intermedio';
    if (levelField.includes('avanzado'))     return 'avanzado';
  }

  const src = id.toLowerCase();
  const mod = (moduleId ?? '').toLowerCase();

  // id pattern: l1, l2, l3
  if (/\bl1\b/.test(src)) return 'principiante';
  if (/\bl2\b/.test(src)) return 'intermedio';
  if (/\bl3\b/.test(src)) return 'avanzado';

  // moduleId keywords
  if (/beginner|principiante/.test(mod)) return 'principiante';
  if (/intermedio/.test(mod))             return 'intermedio';
  if (/avanzado/.test(mod))               return 'avanzado';

  return 'principiante'; // fallback
}

/**
 * Detects content track from id and moduleId.
 * VentyLab checked first since its ids also contain "module-0" patterns.
 */
function detectTrack(id: string, moduleId?: string): Track {
  const src = id.toLowerCase();
  const mod = (moduleId ?? '').toLowerCase();

  if (/ventylab/.test(src) || mod.startsWith('ventylab')) return 'ventylab';
  if (/mecanica/.test(src) || /module-0/.test(mod))        return 'mecanica';

  return 'mecanica'; // fallback
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function groupEvaluations(
  activities: Activity[],
  quizzes: Quiz[],
): GroupedEvaluations {
  const result: GroupedEvaluations = {
    quizzes:  { mecanica: emptyByLevel(), ventylab: emptyByLevel() },
    talleres: { mecanica: emptyByLevel(), ventylab: emptyByLevel() },
    examenes: { mecanica: emptyByLevel(), ventylab: emptyByLevel() },
  };

  // ── Quizzes (from /evaluation/quizzes endpoint) ──────────────────────────
  for (const q of quizzes) {
    const levelField = (q as any).level as string | undefined;
    const level = detectLevel(q.id, levelField, q.moduleId);
    const track = detectTrack(q.id, q.moduleId);
    result.quizzes[track][level].push({
      id: q.id,
      title: q.title,
      itemType: 'QUIZ',
      description: q.description,
      isPublished: true, // quizzes served from API are always live
      passingScore: q.passingScore,
      level,
      track,
    });
  }

  // ── Activities (from /evaluation/activities endpoint) ────────────────────
  for (const a of activities) {
    const type = (a.type ?? '').toUpperCase();
    const level = detectLevel(a.id);
    const track = detectTrack(a.id);
    const base: Omit<EvaluationItem, 'itemType'> = {
      id: a.id,
      title: a.title,
      description: a.description,
      maxScore: a.maxScore,
      isPublished: a.isPublished,
      level,
      track,
    };

    if (type === 'TALLER' || type === 'WORKSHOP') {
      result.talleres[track][level].push({ ...base, itemType: 'TALLER' });
    } else if (type === 'EXAM') {
      result.examenes[track][level].push({ ...base, itemType: 'EXAM' });
    } else if (type === 'QUIZ') {
      result.quizzes[track][level].push({ ...base, itemType: 'QUIZ' });
    }
  }

  return result;
}
