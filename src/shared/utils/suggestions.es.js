/**
 * =============================================================================
 * Motor de Sugerencias Determinista
 * =============================================================================
 * 
 * Utilidades para generar y rankear sugerencias de preguntas de forma
 * determinista y rápida, sin dependencias pesadas.
 * 
 * @module suggestions.es
 */

/**
 * Stopwords en español (palabras comunes a ignorar)
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
  'muy', 'mucho', 'poco', 'más', 'menos', 'muy',
  'todo', 'toda', 'todos', 'todas', 'cada', 'alguno', 'algunos',
]);

/**
 * Normalizar texto: limpiar, lowercase, quitar acentos básicos
 * @param {string} text - Texto a normalizar
 * @returns {string} Texto normalizado
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .trim()
    .replace(/\s+/g, ' '); // Normalizar espacios
}

/**
 * Tokenizar texto: dividir en palabras, filtrar stopwords y palabras cortas
 * @param {string} text - Texto a tokenizar
 * @returns {string[]} Array de tokens
 */
function tokenize(text) {
  if (!text) return [];
  
  const normalized = normalizeText(text);
  return normalized
    .split(/\s+/)
    .filter(token => {
      // Filtrar stopwords, palabras muy cortas (< 2 chars) y números solos
      return token.length >= 2 && 
             !STOPWORDS_ES.has(token) && 
             !/^\d+$/.test(token);
    });
}

/**
 * Extraer keywords (sustantivos y términos clave) de un texto
 * @param {string} text - Texto del cual extraer keywords
 * @param {number} maxKeywords - Número máximo de keywords a extraer
 * @returns {string[]} Array de keywords
 */
function extractKeywords(text, maxKeywords = 12) {
  if (!text) return [];
  
  const tokens = tokenize(text);
  const keywordFreq = {};
  
  // Contar frecuencia de tokens (palabras de 3+ caracteres tienen más peso)
  tokens.forEach(token => {
    if (token.length >= 3) {
      keywordFreq[token] = (keywordFreq[token] || 0) + (token.length >= 5 ? 2 : 1);
    }
  });
  
  // Ordenar por frecuencia y longitud
  const sorted = Object.entries(keywordFreq)
    .sort((a, b) => {
      // Primero por frecuencia, luego por longitud
      if (b[1] !== a[1]) return b[1] - a[1];
      return b[0].length - a[0].length;
    })
    .slice(0, maxKeywords)
    .map(([word]) => word);
  
  return sorted;
}

/**
 * Calcular distancia de Levenshtein simple (para detectar near-duplicates)
 * @param {string} str1 - Primera cadena
 * @param {string} str2 - Segunda cadena
 * @returns {number} Distancia de Levenshtein
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  
  // Optimización: si la diferencia de longitud es muy grande, retornar distancia máxima
  if (Math.abs(len1 - len2) > Math.max(len1, len2) * 0.5) {
    return Math.max(len1, len2);
  }
  
  // Matriz de distancia
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  // Inicializar primera fila y columna
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  // Calcular distancia
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // eliminación
        matrix[i][j - 1] + 1,      // inserción
        matrix[i - 1][j - 1] + cost // sustitución
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Generar bigramas de un texto
 * @param {string[]} tokens - Array de tokens
 * @returns {string[]} Array de bigramas
 */
function generateBigrams(tokens) {
  if (tokens.length < 2) return [];
  
  const bigrams = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return bigrams;
}

/**
 * Calcular similitud usando Jaccard sobre tokens + bonus por bigramas
 * @param {string} query - Texto de consulta del usuario
 * @param {string} candidate - Texto candidato (sugerencia)
 * @returns {number} Score de similitud (0-1)
 */
function similarityScore(query, candidate) {
  if (!query || !candidate) return 0;
  
  const queryTokens = new Set(tokenize(query));
  const candidateTokens = new Set(tokenize(candidate));
  
  if (queryTokens.size === 0 || candidateTokens.size === 0) return 0;
  
  // Calcular intersección y unión para Jaccard
  const intersection = new Set([...queryTokens].filter(x => candidateTokens.has(x)));
  const union = new Set([...queryTokens, ...candidateTokens]);
  
  const jaccardScore = intersection.size / union.size;
  
  // Bonus por bigramas presentes
  const queryBigrams = generateBigrams([...queryTokens]);
  const candidateBigrams = generateBigrams([...candidateTokens]);
  
  let bigramBonus = 0;
  if (queryBigrams.length > 0 && candidateBigrams.length > 0) {
    const commonBigrams = queryBigrams.filter(bg => candidateBigrams.includes(bg)).length;
    bigramBonus = commonBigrams / Math.max(queryBigrams.length, candidateBigrams.length) * 0.3;
  }
  
  // Bonus si el query está contenido en el candidato (normalizado)
  const normalizedQuery = normalizeText(query);
  const normalizedCandidate = normalizeText(candidate);
  const containsBonus = normalizedCandidate.includes(normalizedQuery) ? 0.2 : 0;
  
  return Math.min(1, jaccardScore + bigramBonus + containsBonus);
}

/**
 * Plantillas de preguntas genéricas con keywords
 */
const QUESTION_TEMPLATES = [
  (kw) => `¿Cuándo ajustar ${kw} y por qué?`,
  (kw) => `¿Errores comunes al interpretar ${kw}?`,
  (kw) => `¿Ejemplo práctico con ${kw} paso a paso?`,
  (kw) => `¿Cómo se mide ${kw} en la práctica?`,
  (kw) => `¿Qué factores afectan ${kw}?`,
  (kw) => `¿Cómo se relaciona ${kw} con otros parámetros?`,
  (kwA, kwB) => `¿Diferencias entre ${kwA} y ${kwB} en este contexto?`,
  (kwA, kwB) => `¿Cómo interactúan ${kwA} y ${kwB}?`,
];

/**
 * Plantillas específicas para títulos de lecciones
 */
const LESSON_TITLE_TEMPLATES = [
  (title) => `¿Cómo funciona ${title}?`,
  (title) => `¿Qué es ${title}?`,
  (title) => `¿Cuándo se utiliza ${title}?`,
  (title) => `¿Qué ventajas tiene ${title}?`,
  (title) => `¿Cómo se configura ${title}?`,
  (title) => `¿Qué parámetros son importantes en ${title}?`,
  (title) => `¿Cuáles son las indicaciones de ${title}?`,
  (title) => `¿Qué cuidados hay que tener con ${title}?`,
];

/**
 * Plantillas específicas para títulos de secciones (más específicas)
 */
const SECTION_TITLE_TEMPLATES = [
  (title) => `¿Qué es ${title}?`,
  (title) => `¿Cómo se aplica ${title}?`,
  (title) => `¿Qué parámetros son importantes en ${title}?`,
  (title) => `¿Cuál es el valor típico de ${title}?`,
  (title) => `¿Cómo se interpreta ${title}?`,
  (title) => `¿Qué factores afectan ${title}?`,
  (title) => `¿Cómo se ajusta ${title}?`,
  (title) => `¿Cuándo modificar ${title}?`,
];

/**
 * Extraer parámetros/variables del texto (palabras que parecen valores, unidades, etc.)
 */
function extractParameters(text) {
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
  
  // Patrones para identificar parámetros
  const parameterPatterns = [
    // Parámetros comunes (case-insensitive)
    new RegExp(`\\b(${commonParameters.join('|')})\\b`, 'gi'),
    // Valores con unidades: "10 cmH2O", "500 ml", "21%"
    /\b(\d+\s*(cmH2O|ml|L|mmHg|%|lpm|bpm|bpm|rpm))\b/gi,
    // Parámetros mencionados con contexto: "el PEEP", "la FiO2", "el volumen tidal"
    /\b(el|la|los|las|un|una)\s+([A-Z][a-z]+(?:\s+[a-z]+)*)\b/gi,
  ];
  
  const parameters = new Set();
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
  const valueMatches = [...text.matchAll(/\b(\d+)\s*(cmH2O|ml|L|mmHg|%|lpm|bpm)\b/gi)];
  if (valueMatches.length > 0) {
    valueMatches.forEach(match => {
      const unit = match[2];
      const matchIndex = match.index || 0;
      
      // Buscar parámetro en contexto cercano (20 caracteres antes y después)
      const contextStart = Math.max(0, matchIndex - 20);
      const contextEnd = Math.min(text.length, matchIndex + match[0].length + 20);
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
      const unitMap = {
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
 * @param {Object} context - Contexto de la sección/lección
 * @param {string[]} bankFromMetadata - Banco opcional desde metadata
 * @returns {Array<{id: string, text: string}>} Array de sugerencias candidatas
 */
function buildCandidateBank(context, bankFromMetadata = null) {
  const candidates = [];
  const usedTexts = new Set();
  
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
  const visibleText = context.visibleText || context.visibleTextBlock || context.sectionContent || '';
  const selectionText = context.selectionText || context.userSelection || '';
  
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
      const allParams = [...new Set([...sectionParams, ...visibleTextParams])].slice(0, 8);
      
      // Si el título es sobre parámetros, generar preguntas específicas sobre esos parámetros
      if (isAboutParameters && allParams.length > 0) {
        // Priorizar preguntas sobre parámetros específicos
        allParams.slice(0, 4).forEach((param, index) => {
          // Construir contexto para la pregunta (incluir lección si es relevante)
          const contextSuffix = lessonContext ? ` en ${lessonContext}` : '';
          
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
 * Re-rankear candidatos basándose en query del usuario
 * @param {string} query - Texto de consulta del usuario
 * @param {Array<{id: string, text: string}>} candidates - Array de candidatos
 * @param {number} topK - Número de resultados a retornar
 * @returns {Array<{id: string, text: string, score: number}>} Array de candidatos rankeados
 */
function rerankCandidates(query, candidates, topK = 2) {
  if (!candidates || candidates.length === 0) return [];
  
  // Si no hay query, retornar top-K por orden original (diversidad por contexto)
  if (!query || query.trim().length === 0) {
    return candidates.slice(0, topK).map(c => ({ ...c, score: 0 }));
  }
  
  // Calcular scores de similitud
  const scored = candidates.map(candidate => ({
    ...candidate,
    score: similarityScore(query, candidate.text),
  }));
  
  // Ordenar por score descendente
  scored.sort((a, b) => b.score - a.score);
  
  // Aplicar diversidad: evitar near-duplicates
  const diverse = [];
  const usedTexts = new Set();
  
  for (const candidate of scored) {
    const normalized = normalizeText(candidate.text);
    let isDuplicate = false;
    
    // Verificar si es near-duplicate de algún candidato ya seleccionado
    for (const usedText of usedTexts) {
      const distance = levenshteinDistance(normalized, usedText);
      const maxLen = Math.max(normalized.length, usedText.length);
      
      // Si la distancia es menor al 30% de la longitud máxima, considerar duplicate
      if (maxLen > 0 && distance / maxLen < 0.3) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      diverse.push(candidate);
      usedTexts.add(normalized);
      
      if (diverse.length >= topK) break;
    }
  }
  
  // Si no hay suficientes diversos, completar con los mejores restantes
  if (diverse.length < topK) {
    const remaining = scored.filter(c => !diverse.find(d => d.id === c.id));
    diverse.push(...remaining.slice(0, topK - diverse.length));
  }
  
  return diverse.slice(0, topK);
}

export {
  buildCandidateBank,
  similarityScore,
  rerankCandidates,
  normalizeText,
  tokenize,
  extractKeywords,
  levenshteinDistance,
};

