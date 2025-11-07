/**
 * OpenAI Provider
 * Implements streaming with OpenAI API
 */

import { AIProvider, StreamParams, StreamChunk } from '../AIProviderFactory';

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async *stream(params: StreamParams): AsyncGenerator<StreamChunk, void, unknown> {
    const { messages, system, temperature = 0.7, top_p = 1.0 } = params;

    // Build messages array with system message if provided
    const apiMessages: Array<{ role: string; content: string }> = [];
    if (system) {
      apiMessages.push({ role: 'system', content: system });
    }
    apiMessages.push(...messages);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: apiMessages,
          temperature,
          top_p,
          stream: true,
        }),
      });

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
          if (line.trim() === '' || line.startsWith(':')) continue;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield {
                type: 'end',
                messageId,
                usage,
              };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              
              if (delta) {
                fullContent += delta;
                yield {
                  type: 'token',
                  delta,
                };
              }

              // Extract usage if available
              if (parsed.usage) {
                usage = {
                  promptTokens: parsed.usage.prompt_tokens || 0,
                  completionTokens: parsed.usage.completion_tokens || 0,
                  totalTokens: parsed.usage.total_tokens || 0,
                };
              }

              // Extract message ID
              if (parsed.id) {
                messageId = parsed.id;
              }
            } catch (e) {
              // Skip invalid JSON
            }
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
        error: error.message || 'OpenAI API error',
      };
    }
  }
}

