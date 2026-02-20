/**
 * =============================================================================
 * Lesson Context Builder
 * =============================================================================
 *
 * Utilidad centralizada para componer el contexto estructurado de una lección
 * y la página actual antes de invocar servicios de IA.
 *
 * Prioriza información pedagógica relevante:
 * - Objetivos de aprendizaje
 * - Resumen introductorio / puntos clave
 * - Contenido específico de la página
 * - Referencias bibliográficas
 *
 * Realiza un recorte inteligente (smartChunk) para mantener el contexto entre
 * 1600 y 2000 tokens aproximados.
 *
 * @module contextBuilder
 */

import { curriculumData } from '@/features/teaching/data/curriculumData';
import {
  loadLessonById,
  getCachedLesson,
} from '@/features/teaching/data/helpers/lessonLoader';

type Nullable<T> = T | null | undefined;

interface BuildLessonContextParams {
  moduleId?: Nullable<string>;
  lessonId?: Nullable<string>;
  pageId?: Nullable<string>;
}

interface ModuleSummary {
  id: Nullable<string>;
  title: Nullable<string>;
  level?: Nullable<string>;
  objectives?: string[];
}

interface LessonSummary {
  id: Nullable<string>;
  title: Nullable<string>;
  description?: Nullable<string>;
  tags?: string[];
}

interface PageSummary {
  id: Nullable<string>;
  title: Nullable<string>;
  type?: Nullable<string>;
}

export interface LessonContextPayload {
  module: ModuleSummary | null;
  lesson: LessonSummary | null;
  page: PageSummary | null;
  learningObjectives: string[];
  keyPoints: string[];
  pageTextChunk: string;
}

const TOKEN_TARGET_MIN = 1600;
const TOKEN_TARGET_MAX = 2000;
const APPROX_CHARS_PER_TOKEN = 4;

const slugify = (value?: Nullable<string>): string =>
  (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const markdownToPlainText = (markdown?: Nullable<string>): string => {
  if (!markdown) return '';
  let text = markdown;

  // Remove code blocks and inline code
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/`([^`]+)`/g, '$1');

  // Replace links and images with their descriptive text
  text = text.replace(/!\[[^\]]*]\([^)]*\)/g, '');
  text = text.replace(/\[([^\]]+)]\([^)]*\)/g, '$1');

  // Remove Markdown formatting characters
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  text = text.replace(/>+\s?/g, '');
  text = text.replace(/#+\s*/g, '');

  // Normalize bullet lists
  text = text.replace(/[-*]\s+/g, '- ');

  // Collapse whitespace
  text = text.replace(/\r?\n\s*\r?\n/g, '\n\n');
  text = text.replace(/\r?\n/g, ' ');
  text = text.replace(/\s+/g, ' ');

  return text.trim();
};

const normalizeList = (items?: Nullable<string[]>): string[] => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
};

const formatList = (items: string[], prefix = '- '): string =>
  items.length > 0 ? items.map((item) => `${prefix}${item}`).join('\n') : '';

const estimateTokens = (text: string): number =>
  Math.ceil(text.length / APPROX_CHARS_PER_TOKEN);

const truncateToTokens = (text: string, maxTokens: number): string => {
  const maxChars = Math.max(0, maxTokens * APPROX_CHARS_PER_TOKEN);
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  const safeCut = lastSpace > maxChars * 0.6 ? lastSpace : maxChars;
  return `${truncated.slice(0, safeCut).trim()}…`;
};

const smartChunk = (segments: Array<{ label: string; content: string }>): string => {
  let totalTokens = 0;
  const parts: string[] = [];

  for (const { label, content } of segments) {
    if (!content) continue;
    const sectionText = `${label}:\n${content.trim()}`;
    const sectionTokens = estimateTokens(sectionText);

    if (totalTokens + sectionTokens <= TOKEN_TARGET_MAX) {
      parts.push(sectionText);
      totalTokens += sectionTokens;
    } else {
      const remainingTokens = TOKEN_TARGET_MAX - totalTokens;
      if (remainingTokens > 0) {
        const truncated = truncateToTokens(sectionText, remainingTokens);
        if (truncated) {
          parts.push(truncated);
          totalTokens += estimateTokens(truncated);
        }
      }
      break;
    }
  }

  return parts.join('\n\n').trim();
};

const findModuleInCurriculum = (moduleId?: Nullable<string>) => {
  if (!moduleId) return null;
  return curriculumData.modules?.[moduleId] || null;
};

const findLessonInModules = (lessonId?: Nullable<string>, moduleId?: Nullable<string>) => {
  if (!lessonId) return null;

  const modules = curriculumData.modules || {};
  const moduleCandidates = moduleId
    ? [modules[moduleId]].filter(Boolean)
    : Object.values(modules);

  for (const module of moduleCandidates) {
    if (!module?.lessons) continue;
    const lessonEntry = module.lessons.find((lesson: any) => {
      const lessonIds = [
        lesson?.id,
        lesson?.lessonId,
        lesson?.lessonData?.id,
        lesson?.lessonData?.lessonId,
      ].filter(Boolean);
      return lessonIds.some((id: string) => id === lessonId);
    });

    if (lessonEntry) {
      return {
        module,
        lessonEntry,
        lessonData: lessonEntry.lessonData || lessonEntry,
      };
    }
  }

  return null;
};

const resolveLessonData = async (
  moduleId?: Nullable<string>,
  lessonId?: Nullable<string>
) => {
  if (!lessonId) return { module: null, lesson: null };

  const curriculumHit = findLessonInModules(lessonId, moduleId);
  if (curriculumHit?.lessonData) {
    return {
      module: curriculumHit.module ?? null,
      lesson: curriculumHit.lessonData,
    };
  }

  const candidateModuleId =
    moduleId ||
    curriculumHit?.module?.id ||
    curriculumHit?.lessonData?.moduleId ||
    undefined;

  const cached = getCachedLesson(lessonId);
  if (cached) {
    return { module: curriculumHit?.module ?? null, lesson: cached };
  }

  try {
    const loaded = await loadLessonById(lessonId, candidateModuleId || lessonId);
    return { module: curriculumHit?.module ?? null, lesson: loaded };
  } catch (error) {
    console.warn('[contextBuilder] Error loading lesson data:', error);
    return { module: curriculumHit?.module ?? null, lesson: null };
  }
};

const extractPageContent = (lesson: any, pageId?: Nullable<string>) => {
  if (!lesson || !pageId) return null;
  const normalizedId = slugify(pageId);

  const tryMatch = (collection: any[], idKey: string = 'id') => {
    if (!Array.isArray(collection)) return null;
    return collection.find((item) => {
      const candidateIds = [
        item?.[idKey],
        item?.id,
        item?.caseId,
        item?.sectionId,
        slugify(item?.title),
      ].filter(Boolean);
      return candidateIds.some((candidate: string) => slugify(candidate) === normalizedId);
    });
  };

  const theorySection =
    tryMatch(lesson?.content?.theory?.sections) ||
    tryMatch(lesson?.sections);

  if (theorySection) {
    return {
      id: theorySection.id || pageId,
      title: theorySection.title || theorySection.name || lesson?.title || pageId,
      type: theorySection.type || 'theory',
      text:
        markdownToPlainText(theorySection.content?.markdown) ||
        markdownToPlainText(theorySection.content?.text) ||
        '',
    };
  }

  const practicalCase = tryMatch(lesson?.content?.practicalCases, 'caseId');
  if (practicalCase) {
    return {
      id: practicalCase.caseId || practicalCase.id || pageId,
      title: practicalCase.title || practicalCase.name || 'Caso clínico',
      type: 'practical-case',
      text: markdownToPlainText(practicalCase.markdown || practicalCase.content?.markdown),
    };
  }

  if (normalizedId === 'header-intro' || normalizedId === 'introduction') {
    return {
      id: 'introduction',
      title: 'Introducción',
      type: 'introduction',
      text: markdownToPlainText(lesson?.content?.introduction?.text || lesson?.description),
    };
  }

  if (normalizedId === 'key-points') {
    const keyPoints = normalizeList(lesson?.content?.keyPoints);
    return {
      id: 'key-points',
      title: 'Puntos clave',
      type: 'key-points',
      text: formatList(keyPoints),
    };
  }

  if (normalizedId === 'references') {
    const references = lesson?.content?.references || lesson?.resources?.references || [];
    const referencesText = references
      .map((ref: any) => {
        const parts = [
          ref?.authors,
          ref?.year ? `(${ref.year})` : null,
          ref?.title,
          ref?.journal,
          ref?.doi || ref?.url,
        ].filter(Boolean);
        return parts.join(' ');
      })
      .filter(Boolean)
      .join('\n');

    return {
      id: 'references',
      title: 'Referencias',
      type: 'references',
      text: referencesText,
    };
  }

  // Fallback: try to match any section by slugified title
  const allSections = [
    ...(lesson?.content?.theory?.sections ?? []),
    ...(lesson?.sections ?? []),
  ];
  const fallbackSection = allSections.find((section: any) =>
    slugify(section?.title) === normalizedId
  );

  if (fallbackSection) {
    return {
      id: fallbackSection.id || pageId,
      title: fallbackSection.title,
      type: fallbackSection.type || 'section',
      text:
        markdownToPlainText(fallbackSection.content?.markdown) ||
        markdownToPlainText(fallbackSection.content?.text),
    };
  }

  return null;
};

const extractLearningObjectives = (lesson: any): string[] => {
  if (!lesson) return [];
  const objectives =
    lesson.learningObjectives ||
    lesson?.content?.introduction?.objectives ||
    [];
  return normalizeList(objectives);
};

const extractKeyPoints = (lesson: any): string[] => {
  const keyPointsRaw = lesson?.content?.keyPoints || lesson?.content?.summary?.keyPoints;
  if (Array.isArray(keyPointsRaw)) {
    return keyPointsRaw
      .map((point) => (typeof point === 'string' ? point.trim() : ''))
      .filter(Boolean);
  }
  return [];
};

const extractSummary = (lesson: any): string => {
  if (!lesson) return '';
  const parts = [
    markdownToPlainText(lesson?.description),
    markdownToPlainText(lesson?.content?.introduction?.text),
  ].filter(Boolean);
  return parts.join('\n\n').trim();
};

const extractReferences = (lesson: any): string => {
  const references = lesson?.content?.references || lesson?.resources?.references || [];
  if (!Array.isArray(references)) return '';

  const formatted = references
    .map((ref: any) => {
      const pieces = [
        ref?.authors,
        ref?.year ? `(${ref.year})` : null,
        ref?.title,
        ref?.journal,
        ref?.doi || ref?.url,
      ].filter(Boolean);
      return pieces.join(' ');
    })
    .filter(Boolean);

  return formatList(formatted, '- ');
};

export const buildLessonContext = async ({
  moduleId,
  lessonId,
  pageId,
}: BuildLessonContextParams): Promise<LessonContextPayload> => {
  const moduleFromCurriculum = findModuleInCurriculum(moduleId ?? undefined);
  const { module, lesson } = await resolveLessonData(moduleId, lessonId);

  const moduleSummary: ModuleSummary | null = module || moduleFromCurriculum
    ? {
        id: module?.id || moduleFromCurriculum?.id || moduleId || null,
        title: module?.title || moduleFromCurriculum?.title || null,
        level: module?.level || moduleFromCurriculum?.level || null,
        objectives:
          normalizeList(module?.learningObjectives || moduleFromCurriculum?.learningObjectives) || [],
      }
    : (moduleId || moduleFromCurriculum)
    ? {
        id: moduleId || null,
        title: moduleFromCurriculum?.title || null,
        level: moduleFromCurriculum?.level || null,
        objectives: normalizeList(moduleFromCurriculum?.learningObjectives),
      }
    : null;

  const lessonSummary: LessonSummary | null = lesson
    ? {
        id: lesson.lessonId || lesson.id || lessonId || null,
        title: lesson.title || null,
        description: lesson.description || null,
        tags: Array.isArray(lesson.metadata?.tags) ? lesson.metadata.tags : [],
      }
    : lessonId
    ? {
        id: lessonId,
        title: null,
      }
    : null;

  const learningObjectives = extractLearningObjectives(lesson);
  const keyPoints = extractKeyPoints(lesson);
  const summary = extractSummary(lesson);
  const pageContent = extractPageContent(lesson, pageId);
  const references = extractReferences(lesson);

  const pageSummary: PageSummary | null = pageContent
    ? {
        id: pageContent.id,
        title: pageContent.title,
        type: pageContent.type,
      }
    : pageId
    ? {
        id: pageId,
        title: null,
      }
    : null;

  const segments = [
    {
      label: 'Objetivos de aprendizaje',
      content: formatList(learningObjectives),
    },
    {
      label: 'Resumen',
      content: summary,
    },
    {
      label: 'Contenido de la página',
      content: pageContent?.text ?? '',
    },
    {
      label: 'Puntos clave',
      content: formatList(keyPoints),
    },
    {
      label: 'Referencias',
      content: references,
    },
  ];

  const pageTextChunk = smartChunk(segments);

  return {
    module: moduleSummary,
    lesson: lessonSummary,
    page: pageSummary,
    learningObjectives,
    keyPoints,
    pageTextChunk,
  };
};

/**
 * Convertir LessonContextPayload a formato TutorAI (LessonContext)
 * 
 * Este formato es el que espera el backend para construir el system prompt
 * usando buildPromptTemplate.
 * 
 * @param payload - Contexto de la lección en formato LessonContextPayload
 * @returns Contexto en formato TutorAI (LessonContext)
 */
export const toTutorAILessonContext = (payload: LessonContextPayload): {
  lessonId: string;
  title: string;
  objectives: string[];
  tags: string[];
  tipoDeLeccion: 'teoria' | 'caso_clinico' | 'simulacion' | 'evaluacion';
} => {
  // Determinar tipo de lección desde el tipo de página o default a 'teoria'
  const pageType = payload.page?.type;
  let tipoDeLeccion: 'teoria' | 'caso_clinico' | 'simulacion' | 'evaluacion' = 'teoria';
  
  if (pageType === 'practical-case' || pageType === 'caso_clinico') {
    tipoDeLeccion = 'caso_clinico';
  } else if (pageType === 'simulacion' || pageType === 'simulation') {
    tipoDeLeccion = 'simulacion';
  } else if (pageType === 'evaluacion' || pageType === 'evaluation') {
    tipoDeLeccion = 'evaluacion';
  }

  return {
    lessonId: payload.lesson?.id || '',
    title: payload.lesson?.title || payload.page?.title || '',
    objectives: payload.learningObjectives || [],
    tags: payload.lesson?.tags || [],
    tipoDeLeccion,
  };
};

export default buildLessonContext;

