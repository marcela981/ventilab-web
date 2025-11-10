/**
 * =============================================================================
 * Suggestions Service (Backend)
 * =============================================================================
 * 
 * Servicio para generar sugerencias de preguntas usando el mismo motor
 * determinista que el frontend. Soporta modo cliente (determinista) y
 * modo servidor con embeddings (opcional, para futura implementación).
 * 
 * @module
 */

/**
 * Contexto para generar sugerencias
 */
export interface SuggestionsContext {
  moduleId?: string | null;
  lessonId?: string | null;
  sectionId?: string | null;
  sectionTitle?: string | null;
  lessonTitle?: string | null;
  visibleText?: string | null;
  selectionText?: string | null;
}

/**
 * Sugerencia de pregunta
 */
export interface QuestionSuggestion {
  id: string;
  text: string;
  score?: number;
}

/**
 * Stopwords en español
 */
const STOPWORDS_ES = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'al', 'a', 'en', 'por', 'para', 'con', 'sin',
  'sobre', 'bajo', 'entre', 'hasta', 'desde', 'durante',
  'que', 'cual', 'cuales', 'quien', 'quienes', 'cuando', 'donde',
  'como', 'porque', 'si', 'no', 'sí', 'también', 'tampoco',
  'y', 'o', 'pero', 'mas', 'sin embargo', 'además',
  'es', 'son', 'está', 'están', 'ser', 'estar', 'haber',
  'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
  'su', 'sus', 'se', 'le', 'les', 'lo', 'la', 'los', 'las',
  'me', 'te', 'nos', 'os',
  'muy', 'mucho', 'poco', 'más', 'menos',
  'todo', 'toda', 'todos', 'todas', 'cada', 'alguno', 'algunos',
]);

/**
 * Normalizar texto
 */
function normalizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .trim()
    .replace(/\s+/g, ' '); // Normalizar espacios
}

/**
 * Tokenizar texto
 */
function tokenize(text: string): string[] {
  if (!text) return [];
  
  const normalized = normalizeText(text);
  return normalized
    .split(/\s+/)
    .filter(token => {
      return token.length >= 2 && 
             !STOPWORDS_ES.has(token) && 
             !/^\d+$/.test(token);
    });
}

/**
 * Extraer keywords de un texto
 */
function extractKeywords(text: string, maxKeywords: number = 12): string[] {
  if (!text) return [];
  
  const tokens = tokenize(text);
  const keywordFreq: Record<string, number> = {};
  
  // Contar frecuencia de tokens
  tokens.forEach(token => {
    if (token.length >= 3) {
      keywordFreq[token] = (keywordFreq[token] || 0) + (token.length >= 5 ? 2 : 1);
    }
  });
  
  // Ordenar por frecuencia y longitud
  return Object.entries(keywordFreq)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return b[0].length - a[0].length;
    })
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Plantillas de preguntas genéricas con keywords
 */
const QUESTION_TEMPLATES = [
  (kw: string) => `¿Cuándo ajustar ${kw} y por qué?`,
  (kw: string) => `¿Errores comunes al interpretar ${kw}?`,
  (kw: string) => `¿Ejemplo práctico con ${kw} paso a paso?`,
  (kw: string) => `¿Cómo se mide ${kw} en la práctica?`,
  (kw: string) => `¿Qué factores afectan ${kw}?`,
  (kw: string) => `¿Cómo se relaciona ${kw} con otros parámetros?`,
  (kwA: string, kwB: string) => `¿Diferencias entre ${kwA} y ${kwB} en este contexto?`,
  (kwA: string, kwB: string) => `¿Cómo interactúan ${kwA} y ${kwB}?`,
];

/**
 * Plantillas específicas para títulos de lecciones
 */
const LESSON_TITLE_TEMPLATES = [
  (title: string) => `¿Cómo funciona ${title}?`,
  (title: string) => `¿Qué es ${title}?`,
  (title: string) => `¿Cuándo se utiliza ${title}?`,
  (title: string) => `¿Qué ventajas tiene ${title}?`,
  (title: string) => `¿Cómo se configura ${title}?`,
  (title: string) => `¿Qué parámetros son importantes en ${title}?`,
  (title: string) => `¿Cuáles son las indicaciones de ${title}?`,
  (title: string) => `¿Qué cuidados hay que tener con ${title}?`,
];

/**
 * Plantillas específicas para títulos de secciones (más específicas)
 */
const SECTION_TITLE_TEMPLATES = [
  (title: string) => `¿Qué es ${title}?`,
  (title: string) => `¿Cómo se aplica ${title}?`,
  (title: string) => `¿Qué parámetros son importantes en ${title}?`,
  (title: string) => `¿Cuál es el valor típico de ${title}?`,
  (title: string) => `¿Cómo se interpreta ${title}?`,
  (title: string) => `¿Qué factores afectan ${title}?`,
  (title: string) => `¿Cómo se ajusta ${title}?`,
  (title: string) => `¿Cuándo modificar ${title}?`,
];

/**
 * Extraer parámetros/variables del texto (palabras que parecen valores, unidades, etc.)
 */
function extractParameters(text: string): string[] {
  if (!text) return [];
  
  // Parámetros comunes en ventilación mecánica (lista completa)
  const commonParameters = [
    'PEEP', 'FiO2', 'VT', 'FR', 'I:E', 'PIP', 'Pplat', 
    'compliance', 'resistencia', 'volumen tidal', 'frecuencia respiratoria', 
    'relación I:E', 'presión', 'volumen', 'flujo', 'tiempo', 'frecuencia',
    'presión inspiratoria', 'presión espiratoria', 'presión pico', 'presión meseta',
    'volumen corriente', 'tidal volume', 'rate', 'frecuencia', 'tiempo inspiratorio',
    'tiempo espiratorio', 'Ti', 'Te', 'PCV', 'VCV', 'PRVC', 'SIMV', 'PSV',
    'CPAP', 'BiPAP', 'APRV', 'tidal volume', 'minute volume', 'ventilación minuto',
  ];
  
  const parameters = new Set<string>();
  const textLower = text.toLowerCase();
  
  // Buscar parámetros comunes
  commonParameters.forEach(param => {
    const paramLower = param.toLowerCase();
    // Buscar el parámetro completo (palabra completa)
    const regex = new RegExp(`\\b${paramLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(text)) {
      parameters.add(param);
    }
  });
  
  // Buscar valores con unidades y extraer parámetros del contexto cercano
  const valueMatches = Array.from(text.matchAll(/\b(\d+)\s*(cmH2O|ml|L|mmHg|%|lpm|bpm)\b/gi));
  if (valueMatches.length > 0) {
    valueMatches.forEach(match => {
      const unit = match[2];
      const matchIndex = match.index || 0;
      
      // Buscar parámetro en contexto cercano (20 caracteres antes y después)
      const contextStart = Math.max(0, matchIndex - 20);
      const contextEnd = Math.min(text.length, matchIndex + (match[0]?.length || 0) + 20);
      const context = text.substring(contextStart, contextEnd);
      
      // Buscar parámetros conocidos en el contexto
      commonParameters.forEach(param => {
        const paramLower = param.toLowerCase();
        const contextLower = context.toLowerCase();
        if (contextLower.includes(paramLower)) {
          parameters.add(param);
        }
      });
      
      // Intentar inferir el parámetro desde la unidad si no se encontró en contexto
      const unitMap: Record<string, string> = {
        'cmh2o': 'PEEP',
        'ml': 'volumen tidal',
        'l': 'volumen',
        'mmhg': 'presión',
        '%': 'FiO2',
        'lpm': 'flujo',
        'bpm': 'frecuencia respiratoria',
        'rpm': 'frecuencia respiratoria',
      };
      const inferredParam = unitMap[unit.toLowerCase()];
      if (inferredParam && !parameters.has(inferredParam)) {
        parameters.add(inferredParam);
      }
    });
  }
  
  // Buscar menciones de parámetros en el texto (ej: "el PEEP", "la frecuencia")
  const mentionMatches = text.match(/\b(el|la|los|las)\s+([A-Z][a-z]+(?:\s+[a-z]+){0,2})\b/g);
  if (mentionMatches) {
    mentionMatches.forEach(match => {
      const param = match.replace(/\b(el|la|los|las)\s+/i, '').trim();
      if (param.length >= 3 && param.length <= 30) {
        // Verificar si es un parámetro conocido o similar
        const paramLower = param.toLowerCase();
        const isKnownParam = commonParameters.some(p => 
          p.toLowerCase() === paramLower || 
          paramLower.includes(p.toLowerCase()) ||
          p.toLowerCase().includes(paramLower)
        );
        if (isKnownParam || /^(presión|volumen|flujo|tiempo|frecuencia|compliance|resistencia)/i.test(param)) {
          parameters.add(param);
        }
      }
    });
  }
  
  return Array.from(parameters).slice(0, 8); // Aumentar a 8 para más opciones
}

/**
 * Construir banco de candidatos de preguntas
 */
export function buildCandidateBank(
  context: SuggestionsContext,
  bankFromMetadata: string[] | null = null
): QuestionSuggestion[] {
  const candidates: Array<QuestionSuggestion & { priority?: number }> = [];
  const usedTexts = new Set<string>();
  
  // 1. Si hay bankFromMetadata, usarlo primero (prioridad alta)
  if (bankFromMetadata && Array.isArray(bankFromMetadata)) {
    bankFromMetadata.forEach((question, index) => {
      if (typeof question === 'string' && question.trim().length >= 10) {
        const normalized = normalizeText(question);
        if (!usedTexts.has(normalized)) {
          candidates.push({
            id: `metadata-${index}`,
            text: question.trim(),
            priority: 10, // Alta prioridad
          });
          usedTexts.add(normalized);
        }
      }
    });
  }
  
  const sectionTitle = context.sectionTitle || '';
  const lessonTitle = context.lessonTitle || '';
  const visibleText = context.visibleText || '';
  const selectionText = context.selectionText || '';
  
  // 2. PRIORIDAD ALTA: Preguntas específicas sobre el título de la LECCIÓN
  if (lessonTitle) {
    const normalizedTitle = normalizeText(lessonTitle);
    if (normalizedTitle.length >= 3) {
      // Usar plantillas específicas para lecciones
      LESSON_TITLE_TEMPLATES.slice(0, 6).forEach((template, index) => {
        try {
          const question = template(lessonTitle);
          const normalized = normalizeText(question);
          
          if (question.length >= 10 && question.length <= 80 && !usedTexts.has(normalized)) {
            candidates.push({
              id: `lesson-title-${index}`,
              text: question,
              priority: 9, // Alta prioridad para título de lección
            });
            usedTexts.add(normalized);
          }
        } catch (e) {
          // Ignorar errores
        }
      });
    }
  }
  
  // 3. PRIORIDAD ALTA: Preguntas específicas sobre el título de la SECCIÓN
  if (sectionTitle) {
    const normalizedTitle = normalizeText(sectionTitle);
    if (normalizedTitle.length >= 3) {
      // Detectar si el título menciona "parámetros", "valores", etc.
      const isAboutParameters = /parámetros?|valores?|ajuste|configuración|settings/i.test(sectionTitle);
      
      // Extraer contexto de la lección y sección (modos ventilatorios, etc.)
      // Buscar acrónimos entre paréntesis: "Ventilación Controlada por Presión (PCV)" -> "PCV"
      let lessonContext = '';
      
      // Primero buscar en el título de la lección
      if (lessonTitle) {
        // Buscar acrónimos entre paréntesis
        const acronymMatch = lessonTitle.match(/\(([A-Z]{2,5})\)/);
        if (acronymMatch) {
          lessonContext = acronymMatch[1];
        } else {
          // Buscar modos ventilatorios en el título
          const modes = lessonTitle.match(/\b(PCV|VCV|PRVC|SIMV|PSV|CPAP|BiPAP|APRV)\b/gi);
          if (modes && modes.length > 0) {
            lessonContext = modes[0];
          } else {
            // Extraer concepto clave (palabras importantes del título, excluyendo stopwords)
            const importantWords = lessonTitle.split(/\s+/).filter(w => 
              w.length >= 4 && 
              !/^(por|con|de|la|el|los|las|un|una|en|del|por|que|como|para)$/i.test(w)
            ).slice(0, 3).join(' ');
            if (importantWords.length > 0 && importantWords.length <= 50) {
              lessonContext = importantWords;
            }
          }
        }
      }
      
      // Si no se encontró contexto en la lección, buscar en el título de la sección
      if (!lessonContext && sectionTitle) {
        const sectionAcronymMatch = sectionTitle.match(/\(([A-Z]{2,5})\)/);
        if (sectionAcronymMatch) {
          lessonContext = sectionAcronymMatch[1];
        } else {
          const sectionModes = sectionTitle.match(/\b(PCV|VCV|PRVC|SIMV|PSV|CPAP|BiPAP|APRV)\b/gi);
          if (sectionModes && sectionModes.length > 0) {
            lessonContext = sectionModes[0];
          }
        }
      }
      
      // Extraer parámetros del título y del contenido visible
      // Si el título es sobre parámetros, buscar más agresivamente en el contenido visible
      const visibleTextLength = isAboutParameters ? 2000 : 1500;
      const sectionParams = extractParameters(sectionTitle);
      const visibleTextParams = extractParameters(visibleText.substring(0, visibleTextLength));
      // Combinar y priorizar parámetros del título, luego del contenido visible
      const allParams = Array.from(new Set([...sectionParams, ...visibleTextParams])).slice(0, 8);
      
      // Si el título es sobre parámetros, generar preguntas específicas sobre esos parámetros
      if (isAboutParameters && allParams.length > 0) {
        // Priorizar preguntas sobre parámetros específicos
        allParams.slice(0, 4).forEach((param, index) => {
          // Construir contexto para la pregunta (incluir lección si es relevante y no hace la pregunta muy larga)
          const contextSuffix = lessonContext && (param.length + lessonContext.length + 30) <= 70 
            ? ` en ${lessonContext}` 
            : '';
          
          const questions = [
            `¿Cuál es el valor típico de ${param}${contextSuffix}?`,
            `¿Cómo se ajusta ${param}${contextSuffix}?`,
            `¿Qué factores afectan ${param}${contextSuffix}?`,
            `¿Cómo se interpreta ${param}${contextSuffix}?`,
          ];
          
          questions.slice(0, 2).forEach((question, qIndex) => {
            const normalized = normalizeText(question);
            if (question.length >= 10 && question.length <= 80 && !usedTexts.has(normalized)) {
              candidates.push({
                id: `section-param-${index}-${qIndex}`,
                text: question,
                priority: 8, // Alta prioridad para parámetros de sección
              });
              usedTexts.add(normalized);
            }
          });
        });
      } else {
        // Si no es sobre parámetros, usar plantillas generales sobre el título
        SECTION_TITLE_TEMPLATES.slice(0, 4).forEach((template, index) => {
          try {
            const question = template(sectionTitle);
            const normalized = normalizeText(question);
            
            if (question.length >= 10 && question.length <= 80 && !usedTexts.has(normalized)) {
              candidates.push({
                id: `section-title-${index}`,
                text: question,
                priority: 8, // Alta prioridad para título de sección
              });
              usedTexts.add(normalized);
            }
          } catch (e) {
            // Ignorar errores
          }
        });
      }
      
      // Si hay parámetros identificados (incluso si no es sobre parámetros), agregar algunas preguntas
      if (allParams.length > 0) {
        allParams.slice(0, 2).forEach((param, index) => {
          // Construir contexto solo si no hace la pregunta muy larga
          const contextSuffix = lessonContext && (param.length + lessonContext.length + 30) <= 70 
            ? ` en ${lessonContext}` 
            : '';
          const questions = [
            `¿Cuál es el valor típico de ${param}${contextSuffix}?`,
            `¿Cómo se ajusta ${param}${contextSuffix}?`,
          ];
          
          questions.forEach((question, qIndex) => {
            const normalized = normalizeText(question);
            if (question.length >= 10 && question.length <= 80 && !usedTexts.has(normalized)) {
              candidates.push({
                id: `section-context-param-${index}-${qIndex}`,
                text: question,
                priority: isAboutParameters ? 8 : 7, // Alta prioridad si es sobre parámetros
              });
              usedTexts.add(normalized);
            }
          });
        });
      }
    }
  }
  
  // 4. Extraer keywords y parámetros del contenido visible
  const textForKeywords = [
    sectionTitle,
    lessonTitle,
    selectionText,
    visibleText.substring(0, 1000), // Limitar para performance
  ].filter(Boolean).join(' ');
  
  const keywords = extractKeywords(textForKeywords, 10);
  const parameters = extractParameters(textForKeywords);
  
  // 5. Generar preguntas con keywords extraídos (prioridad media)
  if (keywords.length > 0) {
    keywords.slice(0, 5).forEach((keyword, index) => {
      QUESTION_TEMPLATES.slice(0, 4).forEach((template, tIndex) => {
        try {
          const question = template(keyword);
          const normalized = normalizeText(question);
          
          if (question.length >= 10 && question.length <= 80 && !usedTexts.has(normalized)) {
            candidates.push({
              id: `keyword-${index}-${tIndex}`,
              text: question,
              priority: 5, // Prioridad media
            });
            usedTexts.add(normalized);
          }
        } catch (e) {
          // Ignorar errores
        }
      });
    });
  }
  
  // 6. Generar preguntas sobre parámetros específicos del contenido
  if (parameters.length > 0) {
    parameters.slice(0, 4).forEach((param, index) => {
      const paramQuestions = [
        `¿Cuál es el valor típico de ${param}?`,
        `¿Cómo se interpreta ${param}?`,
        `¿Qué factores afectan ${param}?`,
      ];
      
      paramQuestions.forEach((question, qIndex) => {
        const normalized = normalizeText(question);
        if (question.length >= 10 && question.length <= 80 && !usedTexts.has(normalized)) {
          candidates.push({
            id: `param-${index}-${qIndex}`,
            text: question,
            priority: 6, // Prioridad media-alta para parámetros
          });
          usedTexts.add(normalized);
        }
      });
    });
  }
  
  // 7. Preguntas genéricas de ventilación mecánica (fallback, baja prioridad)
  // Solo se agregan si no hay suficientes candidatos contextuales
  if (candidates.length < 8) {
    const genericFallbacks = [
      '¿Puedes explicar la relación entre presión, volumen y compliance?',
      '¿Qué diferencias hay entre los distintos modos ventilatorios?',
      '¿Cómo interpretar los parámetros en una curva de presión?',
      '¿Qué factores afectan la oxigenación del paciente?',
      '¿Cómo se calcula y ajusta la PEEP?',
      '¿Qué errores comunes debo evitar en la configuración?',
    ];
    
    genericFallbacks.forEach((question, index) => {
      const normalized = normalizeText(question);
      if (!usedTexts.has(normalized)) {
        candidates.push({
          id: `generic-${index}`,
          text: question,
          priority: 1, // Baja prioridad para fallback
        });
        usedTexts.add(normalized);
      }
    });
  }
  
  // Ordenar por prioridad (mayor a menor) y luego por orden de creación
  candidates.sort((a, b) => {
    const priorityDiff = (b.priority || 0) - (a.priority || 0);
    if (priorityDiff !== 0) return priorityDiff;
    return 0; // Mantener orden original si tienen misma prioridad
  });
  
  // Limitar a 16 candidatos máximo y asegurar longitud mínima
  return candidates
    .filter(c => c.text.length >= 10 && c.text.length <= 80)
    .slice(0, 16)
    .map(c => ({
      id: c.id,
      text: c.text,
      // Remover priority del resultado final (solo usado para ordenar)
    }));
}

/**
 * Calcular similitud usando Jaccard
 */
function similarityScore(query: string, candidate: string): number {
  if (!query || !candidate) return 0;
  
  const queryTokens = new Set(tokenize(query));
  const candidateTokens = new Set(tokenize(candidate));
  
  if (queryTokens.size === 0 || candidateTokens.size === 0) return 0;
  
  // Calcular intersección y unión para Jaccard
  const intersection = new Set([...queryTokens].filter(x => candidateTokens.has(x)));
  const union = new Set([...queryTokens, ...candidateTokens]);
  
  const jaccardScore = intersection.size / union.size;
  
  // Bonus si el query está contenido en el candidato
  const normalizedQuery = normalizeText(query);
  const normalizedCandidate = normalizeText(candidate);
  const containsBonus = normalizedCandidate.includes(normalizedQuery) ? 0.2 : 0;
  
  return Math.min(1, jaccardScore + containsBonus);
}

/**
 * Re-rankear candidatos basándose en query del usuario (heurístico)
 */
export function rerankCandidates(
  query: string,
  candidates: QuestionSuggestion[],
  topK: number = 2
): QuestionSuggestion[] {
  if (!candidates || candidates.length === 0) return [];
  
  // Si no hay query, retornar top-K por orden original
  if (!query || query.trim().length === 0) {
    return candidates.slice(0, topK);
  }
  
  // Calcular scores de similitud
  const scored = candidates.map(candidate => ({
    ...candidate,
    score: similarityScore(query, candidate.text),
  }));
  
  // Ordenar por score descendente
  scored.sort((a, b) => (b.score || 0) - (a.score || 0));
  
  return scored.slice(0, topK);
}

/**
 * Generar sugerencias de preguntas
 */
export function generateSuggestions(
  context: SuggestionsContext,
  seed: string = '',
  bankFromMetadata: string[] | null = null
): QuestionSuggestion[] {
  // Construir banco de candidatos
  const candidates = buildCandidateBank(context, bankFromMetadata);
  
  // Re-rankear si hay seed
  if (seed && seed.trim().length > 0) {
    return rerankCandidates(seed.trim(), candidates, candidates.length);
  }
  
  // Retornar todas las candidatas ordenadas
  return candidates;
}

