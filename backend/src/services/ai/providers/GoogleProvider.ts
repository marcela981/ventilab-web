/**
 * Google Provider (Gemini)
 * Implements streaming with Google Gemini API
 */

import { AIProvider, StreamParams, StreamChunk } from '../AIProviderFactory';

export class GoogleProvider implements AIProvider {
  name = 'google';
  private apiKey: string;
  private model: string;
  // Usar v1 para modelos más nuevos, v1beta como fallback para compatibilidad
  // v1 es el endpoint recomendado para gemini-2.0-flash y modelos más nuevos
  private baseUrl = 'https://generativelanguage.googleapis.com/v1';

  constructor(apiKey: string, model: string = 'gemini-2.0-flash') {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Google API key is required');
    }
    this.apiKey = apiKey;
    // Lista de modelos a intentar en orden de preferencia
    // gemini-2.0-flash es más estable y ampliamente disponible
    this.model = model;
    console.log(`[GoogleProvider] Initialized with model: ${model}, baseUrl: ${this.baseUrl}`);
  }

  async *stream(params: StreamParams): AsyncGenerator<StreamChunk, void, unknown> {
    const { messages, system, temperature = 0.7, top_p = 1.0 } = params;

    // Google Gemini uses a different message format
    // Note: v1 API doesn't support systemInstruction, so we prepend it to the first user message
    const contents = messages.map((msg, index) => {
      let text = msg.content;

      // Prepend system instruction to first user message if present
      if (index === 0 && system && msg.role === 'user') {
        text = `${system}\n\n${msg.content}`;
      }

      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text }],
      };
    });

    const requestBody: any = {
      contents,
      generationConfig: {
        temperature,
        topP: top_p,
      },
    };

    try {
      // Construir URL del endpoint
      // Formato: https://generativelanguage.googleapis.com/v1/models/{model}:streamGenerateContent?key={apiKey}
      let url = `${this.baseUrl}/models/${this.model}:streamGenerateContent?key=${this.apiKey}`;
      console.log(`[GoogleProvider] Making request to: ${url.replace(this.apiKey, 'KEY_HIDDEN')}`);
      console.log(`[GoogleProvider] Model: ${this.model}, Request body keys:`, Object.keys(requestBody));
      
      let response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // Si recibimos un 404, intentar con v1beta como fallback
      if (response.status === 404 && this.baseUrl.includes('/v1')) {
        console.warn(`[GoogleProvider] 404 with v1 endpoint, trying v1beta as fallback...`);
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?key=${this.apiKey}`;
        console.log(`[GoogleProvider] Trying fallback URL: ${fallbackUrl.replace(this.apiKey, 'KEY_HIDDEN')}`);
        
        response = await fetch(fallbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        // Si el fallback también falla, intentar con un modelo alternativo
        if (response.status === 404 && this.model.includes('gemini-2')) {
          console.warn(`[GoogleProvider] 404 with v1beta, trying fallback model 'gemini-2.0-flash'...`);
          const fallbackModel = 'gemini-2.0-flash';
          const fallbackModelUrl = `https://generativelanguage.googleapis.com/v1/models/${fallbackModel}:streamGenerateContent?key=${this.apiKey}`;
          console.log(`[GoogleProvider] Trying fallback model URL: ${fallbackModelUrl.replace(this.apiKey, 'KEY_HIDDEN')}`);

          response = await fetch(fallbackModelUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });
        }
      }

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        let errorDetails: any = null;
        
        try {
          const errorData = await response.json();
          errorDetails = errorData;
          
          // Google API puede tener diferentes formatos de error
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.error?.details?.[0]?.message) {
            errorMessage = errorData.error.details[0].message;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
          
          console.error(`[GoogleProvider] Error ${response.status} from ${this.baseUrl}:`, errorMessage);
          console.error(`[GoogleProvider] Error details:`, JSON.stringify(errorData, null, 2));
          console.error(`[GoogleProvider] Model used: ${this.model}`);
          console.error(`[GoogleProvider] Full URL (key hidden): ${url.replace(this.apiKey, 'KEY_HIDDEN')}`);
          
          // Si es un 404, podría ser que el modelo no existe o el endpoint es incorrecto
          if (response.status === 404) {
            console.error(`[GoogleProvider] 404 Error - Possible causes:`);
            console.error(`  - Model '${this.model}' may not be available`);
            console.error(`  - Endpoint '${this.baseUrl}' may be incorrect`);
            console.error(`  - API key may not have access to this model`);
            console.error(`  - Try using 'gemini-pro' or 'gemini-1.5-pro' as fallback models`);
            console.error(`  - Verify your API key has access to Gemini API`);
          }
        } catch (parseError) {
          // Si no se puede parsear el error, intentar leer el texto
          try {
            const errorText = await response.text();
            errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
            console.error(`[GoogleProvider] Error ${response.status}:`, errorMessage);
          } catch (textError) {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            console.error(`[GoogleProvider] Error ${response.status}:`, errorMessage);
          }
        }
        
        // Lanzar error con más información
        const fullError = new Error(errorMessage);
        (fullError as any).status = response.status;
        (fullError as any).details = errorDetails;
        (fullError as any).model = this.model;
        (fullError as any).endpoint = this.baseUrl;
        throw fullError;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { type: 'error', error: 'No response body' };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let messageId = `msg-${Date.now()}`;
      let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
      }

      // Google Gemini returns a JSON array of chunks: [{...}, {...}, ...]
      // Parse the complete buffer as a JSON array
      try {
        const chunks = JSON.parse(buffer);

        if (!Array.isArray(chunks)) {
          console.error('[GoogleProvider] Response is not an array:', typeof chunks);
          yield { type: 'error', error: 'Invalid response format from Google Gemini' };
          return;
        }

        console.log(`[GoogleProvider] Parsed ${chunks.length} chunks from response`);

        for (const chunk of chunks) {
          chunkCount++;

          try {
            // Extract text from this chunk
            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              fullContent += text;
              yield {
                type: 'token',
                delta: text,
              };
            }

            // Extract usage metadata (usually in the last chunk)
            if (chunk.usageMetadata) {
              usage = {
                promptTokens: chunk.usageMetadata.promptTokenCount || 0,
                completionTokens: chunk.usageMetadata.candidatesTokenCount || 0,
                totalTokens: chunk.usageMetadata.totalTokenCount || 0,
              };
            }

            // Check if this is the final chunk
            if (chunk.candidates?.[0]?.finishReason) {
              yield {
                type: 'end',
                messageId,
                usage,
              };
              return;
            }
          } catch (e) {
            console.error('[GoogleProvider] Error processing chunk:', e);
          }
        }
      } catch (parseError) {
        console.error('[GoogleProvider] Error parsing JSON response:', parseError);
        console.error('[GoogleProvider] Buffer length:', buffer.length);
        console.error('[GoogleProvider] Buffer preview:', buffer.substring(0, 500));
        yield { type: 'error', error: 'Failed to parse Google Gemini response' };
        return;
      }

      // Final end event
      yield {
        type: 'end',
        messageId,
        usage,
      };
    } catch (error: any) {
      const errorMessage = error.message || error.error || 'Google API error';
      const errorStatus = error.status || error.statusCode || 500;
      
      console.error('[GoogleProvider] Exception caught:', {
        message: errorMessage,
        status: errorStatus,
        details: error.details,
        stack: error.stack,
      });
      
      yield {
        type: 'error',
        error: errorMessage,
      };
    }
  }
}

