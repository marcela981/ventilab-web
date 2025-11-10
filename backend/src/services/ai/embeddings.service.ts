/**
 * =============================================================================
 * Embeddings Service
 * =============================================================================
 * 
 * Servicio para calcular embeddings usando OpenAI embeddings API.
 * Soporta text-embedding-3-small y calcula cosine similarity.
 * 
 * @module
 */

/**
 * Embedding vector (array de números)
 */
export type Embedding = number[];

/**
 * Resultado de embedding con metadata
 */
export interface EmbeddingResult {
  embedding: Embedding;
  model: string;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * Calcular cosine similarity entre dos embeddings
 * @param embedding1 - Primer embedding
 * @param embedding2 - Segundo embedding
 * @returns Cosine similarity (0-1)
 */
export function cosineSimilarity(embedding1: Embedding, embedding2: Embedding): number {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return 0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Obtener embedding de un texto usando OpenAI API
 * @param text - Texto a convertir en embedding
 * @param apiKey - API key de OpenAI
 * @param model - Modelo de embeddings (default: text-embedding-3-small)
 * @returns Embedding result
 */
export async function getEmbedding(
  text: string,
  apiKey: string,
  model: string = 'text-embedding-3-small'
): Promise<EmbeddingResult> {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text is required for embedding');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: text.trim(),
        model: model,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`
      );
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error('Invalid response from OpenAI API');
    }

    const embedding = data.data[0].embedding;
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Invalid embedding format');
    }

    return {
      embedding,
      model: data.model || model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
    };
  } catch (error: any) {
    if (error.message.includes('OpenAI API error')) {
      throw error;
    }
    throw new Error(`Failed to get embedding: ${error.message}`);
  }
}

/**
 * Obtener embeddings para múltiples textos en batch
 * @param texts - Array de textos a convertir en embeddings
 * @param apiKey - API key de OpenAI
 * @param model - Modelo de embeddings (default: text-embedding-3-small)
 * @returns Array de embedding results
 */
export async function getEmbeddingsBatch(
  texts: string[],
  apiKey: string,
  model: string = 'text-embedding-3-small'
): Promise<EmbeddingResult[]> {
  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  // Filtrar textos vacíos
  const validTexts = texts.filter(t => t && typeof t === 'string' && t.trim().length > 0);
  if (validTexts.length === 0) {
    return [];
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: validTexts,
        model: model,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`
      );
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid response from OpenAI API');
    }

    return data.data.map((item: any, index: number) => ({
      embedding: item.embedding,
      model: data.model || model,
      usage: index === 0 && data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
    }));
  } catch (error: any) {
    if (error.message.includes('OpenAI API error')) {
      throw error;
    }
    throw new Error(`Failed to get embeddings batch: ${error.message}`);
  }
}

/**
 * Re-rankear candidatos usando embeddings y cosine similarity
 * @param seed - Texto semilla (query del usuario)
 * @param candidates - Array de candidatos a rankear
 * @param apiKey - API key de OpenAI
 * @param model - Modelo de embeddings (default: text-embedding-3-small)
 * @param topK - Número de resultados a retornar (default: 6)
 * @returns Array de candidatos rankeados con scores
 */
export async function rerankWithEmbeddings(
  seed: string,
  candidates: Array<{ id: string; text: string }>,
  apiKey: string,
  model: string = 'text-embedding-3-small',
  topK: number = 6
): Promise<Array<{ id: string; text: string; score: number }>> {
  if (!seed || seed.trim().length === 0 || !candidates || candidates.length === 0) {
    return candidates.slice(0, topK).map(c => ({ ...c, score: 0 }));
  }

  try {
    // Obtener embedding del seed
    const seedEmbeddingResult = await getEmbedding(seed.trim(), apiKey, model);
    const seedEmbedding = seedEmbeddingResult.embedding;

    // Obtener embeddings de los candidatos en batch
    const candidateTexts = candidates.map(c => c.text);
    const candidateEmbeddingsResults = await getEmbeddingsBatch(candidateTexts, apiKey, model);

    if (candidateEmbeddingsResults.length !== candidates.length) {
      throw new Error('Mismatch between candidates and embeddings');
    }

    // Calcular cosine similarity para cada candidato
    const scored = candidates.map((candidate, index) => {
      const candidateEmbedding = candidateEmbeddingsResults[index].embedding;
      const similarity = cosineSimilarity(seedEmbedding, candidateEmbedding);
      return {
        ...candidate,
        score: similarity,
      };
    });

    // Ordenar por score descendente y retornar top-K
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  } catch (error: any) {
    // Si falla, lanzar error para que el controlador pueda hacer fallback
    throw new Error(`Embeddings reranking failed: ${error.message}`);
  }
}

