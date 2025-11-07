/**
 * Google Provider (Gemini)
 * Implements streaming with Google Gemini API
 */

import { AIProvider, StreamParams, StreamChunk } from '../AIProviderFactory';

export class GoogleProvider implements AIProvider {
  name = 'google';
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string, model: string = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async *stream(params: StreamParams): AsyncGenerator<StreamChunk, void, unknown> {
    const { messages, system, temperature = 0.7, top_p = 1.0 } = params;

    // Google Gemini uses a different message format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const requestBody: any = {
      contents,
      generationConfig: {
        temperature,
        topP: top_p,
      },
    };

    if (system) {
      requestBody.systemInstruction = {
        parts: [{ text: system }],
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:streamGenerateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        yield {
          type: 'error',
          error: error.error?.message || `HTTP ${response.status}`,
        };
        return;
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;

          try {
            const parsed = JSON.parse(line);

            // Extract text delta
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              // Gemini may send the full text, so we need to extract only the delta
              const delta = text.slice(fullContent.length);
              if (delta) {
                fullContent = text;
                yield {
                  type: 'token',
                  delta,
                };
              }
            }

            // Extract usage
            if (parsed.usageMetadata) {
              usage = {
                promptTokens: parsed.usageMetadata.promptTokenCount || 0,
                completionTokens: parsed.usageMetadata.candidatesTokenCount || 0,
                totalTokens: parsed.usageMetadata.totalTokenCount || 0,
              };
            }

            // Check if this is the final chunk
            if (parsed.candidates?.[0]?.finishReason) {
              yield {
                type: 'end',
                messageId,
                usage,
              };
              return;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }

      // Final end event
      yield {
        type: 'end',
        messageId,
        usage,
      };
    } catch (error: any) {
      yield {
        type: 'error',
        error: error.message || 'Google API error',
      };
    }
  }
}

