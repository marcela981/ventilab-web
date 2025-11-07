/**
 * Anthropic Provider
 * Implements streaming with Anthropic Claude API
 */

import { AIProvider, StreamParams, StreamChunk } from '../AIProviderFactory';

export class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor(apiKey: string, model: string = 'claude-3-5-haiku-20241022') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async *stream(params: StreamParams): AsyncGenerator<StreamChunk, void, unknown> {
    const { messages, system, temperature = 0.7, top_p = 1.0 } = params;

    // Anthropic uses a different message format
    const apiMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          messages: apiMessages,
          system: system || undefined,
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
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              // Handle different event types
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                const delta = parsed.delta.text;
                fullContent += delta;
                yield {
                  type: 'token',
                  delta,
                };
              }

              if (parsed.type === 'message_start' && parsed.message?.id) {
                messageId = parsed.message.id;
              }

              if (parsed.type === 'message_delta' && parsed.usage) {
                usage = {
                  promptTokens: parsed.usage.input_tokens || 0,
                  completionTokens: parsed.usage.output_tokens || 0,
                  totalTokens: (parsed.usage.input_tokens || 0) + (parsed.usage.output_tokens || 0),
                };
              }

              if (parsed.type === 'message_stop') {
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
        error: error.message || 'Anthropic API error',
      };
    }
  }
}

