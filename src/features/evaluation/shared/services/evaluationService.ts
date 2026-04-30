/*
 * Funcionalidad: Servicio de Evaluación — quizzes y actividades
 * Descripción: Funciones para consultar quizzes, actividades y enviar intentos al backend;
 *              cubre los endpoints /api/evaluation/* del servidor VentyLab
 * Versión: 1.1
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que
 *        integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { httpSlow } from '@/shared/services/api/http';
import type { Activity } from '../../evaluation.types';

// ─── Auth note ───────────────────────────────────────────────────────────────
// The `http` Axios instance attaches "Authorization: Bearer <token>" automatically
// via its request interceptor (reads "ventilab_auth_token" from localStorage).
// No manual header injection is needed here.

// ─── Quiz-specific types ─────────────────────────────────────────────────────

export interface QuizOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false';
  text: string;
  options: QuizOption[];
  explanation?: string;
}

export interface Quiz {
  id: string;
  type: string;
  title: string;
  description?: string;
  moduleId?: string;
  level?: string;
  passingScore: number;
  questions: QuizQuestion[];
}

export interface Answer {
  questionId: string;
  optionId: string;
}

export interface AttemptResult {
  score: number;
  passed: boolean;
  correctCount: number;
  totalCount: number;
  feedback?: string[];
}

// ─── Quiz endpoints ──────────────────────────────────────────────────────────

/**
 * Fetch all quizzes, optionally filtered by moduleId.
 * Returns [] on 404; throws on 500.
 */
export async function fetchQuizzes(moduleId?: string): Promise<Quiz[]> {
  try {
    const query = moduleId ? `?moduleId=${encodeURIComponent(moduleId)}` : '';
    const { data } = await httpSlow.get(`/api/evaluation/quizzes${query}`);
    return data.quizzes ?? [];
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number } };
    if (axiosErr?.response?.status === 404) return [];
    throw err;
  }
}

/**
 * Fetch a single quiz by its ID.
 * Throws on any error (including 404 — quiz must exist to render).
 */
export async function fetchQuizById(quizId: string): Promise<Quiz> {
  const { data } = await httpSlow.get(`/api/evaluation/quizzes/${encodeURIComponent(quizId)}`);
  return data.quiz;
}

/**
 * Submit a student's answers for a quiz attempt.
 * Returns the scored result from the backend.
 */
export async function submitQuizAttempt(
  quizId: string,
  answers: Answer[],
): Promise<AttemptResult> {
  const { data } = await httpSlow.post(
    `/api/evaluation/quizzes/${encodeURIComponent(quizId)}/attempt`,
    { answers },
  );
  return data.result;
}

// ─── Activity endpoints ──────────────────────────────────────────────────────

/**
 * Fetch activities from the evaluation-specific endpoint.
 * Optionally filter by type ('EXAM' | 'TALLER').
 * Returns [] on 404; throws on 500.
 */
export async function fetchActivities(type?: 'EXAM' | 'TALLER'): Promise<Activity[]> {
  try {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    const { data } = await httpSlow.get(`/api/evaluation/activities${query}`);
    return data.activities ?? [];
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number } };
    if (axiosErr?.response?.status === 404) return [];
    throw err;
  }
}
