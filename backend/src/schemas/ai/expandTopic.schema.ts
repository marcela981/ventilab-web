/**
 * =============================================================================
 * Expand Topic Schema
 * =============================================================================
 * 
 * Schema de validación para el endpoint de expansión de temas con IA.
 * Valida el contexto de la sección y la pregunta del usuario.
 * 
 * Límites de validación:
 * - userInput: máximo 1000 caracteres
 * - visibleText (sectionContent/visibleTextBlock): máximo 4000 caracteres
 * - selectionText (userSelection): máximo 1500 caracteres
 * 
 * @module
 */

import { z } from 'zod';

/**
 * Schema para breadcrumb
 */
const BreadcrumbSchema = z.object({
  label: z.string().trim(),
  id: z.string().trim(),
  type: z.enum(['module', 'lesson', 'section']),
});

/**
 * Schema para el contexto de la sección
 * Valida y sanitiza los campos de texto con límites específicos
 */
const SectionContextSchema = z.object({
  moduleId: z.string().trim().nullable().optional(),
  lessonId: z.string().trim().min(1, 'lessonId es requerido'),
  sectionId: z.string().trim().nullable().optional(),
  moduleTitle: z.string().trim().nullable().optional(),
  lessonTitle: z.string().trim().nullable().optional(),
  sectionTitle: z.string().trim().nullable().optional(),
  route: z.string().trim().nullable().optional(),
  breadcrumbs: z.array(BreadcrumbSchema).optional(),
  pageType: z.string().trim().nullable().optional(),
  // sectionContent y visibleTextBlock: máximo 4000 caracteres
  sectionContent: z
    .string()
    .trim()
    .max(4000, 'sectionContent no puede exceder 4000 caracteres')
    .nullable()
    .optional(),
  sectionType: z.string().trim().nullable().optional(),
  // userSelection: máximo 1500 caracteres
  userSelection: z
    .string()
    .trim()
    .max(1500, 'userSelection no puede exceder 1500 caracteres')
    .nullable()
    .optional(),
  // visibleTextBlock: máximo 4000 caracteres (alias de sectionContent)
  visibleTextBlock: z
    .string()
    .trim()
    .max(4000, 'visibleTextBlock no puede exceder 4000 caracteres')
    .nullable()
    .optional(),
  lessonDescription: z.string().trim().nullable().optional(),
  sectionOrder: z.number().int().nullable().optional(),
  estimatedTime: z.number().int().min(0).nullable().optional(),
});

/**
 * Schema para la solicitud de expansión de tema
 * 
 * @contract
 * - userInput: Input del usuario, máximo 1000 caracteres
 * - question: Input del usuario (compatibilidad con código existente)
 * - Ambos campos son opcionales y pueden ser null
 */
export const ExpandTopicRequestSchema = z.object({
  context: SectionContextSchema,
  // userInput: máximo 1000 caracteres
  userInput: z
    .string()
    .trim()
    .max(1000, 'userInput no puede exceder 1000 caracteres')
    .nullable()
    .optional(),
  // question: compatibilidad, mismo límite que userInput
  question: z
    .string()
    .trim()
    .max(1000, 'question no puede exceder 1000 caracteres')
    .nullable()
    .optional(),
});

/**
 * Tipo TypeScript para la solicitud
 */
export type ExpandTopicRequest = z.infer<typeof ExpandTopicRequestSchema>;

/**
 * Schema para la respuesta de expansión de tema
 */
export const ExpandTopicResponseSchema = z.object({
  expandedExplanation: z.string(),
  keyPoints: z.array(z.string()).optional(),
  // Recursos sugeridos como strings (sin URLs, solo títulos/genéricos)
  suggestedReferences: z.array(z.string()).optional(),
  internalLinks: z.array(z.object({
    title: z.string(),
    url: z.string(),
    description: z.string().optional(),
  })).optional(),
});

/**
 * Tipo TypeScript para la respuesta
 */
export type ExpandTopicResponse = z.infer<typeof ExpandTopicResponseSchema>;

