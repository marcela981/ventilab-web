/**
 * WebSocket Tutor Service
 * Handles WebSocket connections for AI tutor streaming
 */

import { WebSocket } from 'ws';
import { streamTutorResponse, saveMessage, getHistory, LessonContext } from './TutorService';
import { IncomingMessage } from 'http';
import { parse } from 'url';

export interface WSMessage {
  type: 'user_message' | 'ping' | 'pong';
  message?: string;
  lessonContext?: LessonContext;
  provider?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface WSResponse {
  type: 'start' | 'token' | 'end' | 'suggestions' | 'error';
  delta?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  suggestions?: string[];
  error?: string;
}

/**
 * Handle WebSocket connection for AI tutor
 */
export function handleTutorWebSocket(
  ws: WebSocket,
  req: IncomingMessage
): void {
  const { query } = parse(req.url || '', true);
  const lessonId = query.lessonId as string;
  const sessionId = query.sessionId as string;
  const provider = (query.provider as string) || 'google';

  // Validate required parameters
  if (!lessonId || !sessionId) {
    ws.send(JSON.stringify({
      type: 'error',
      error: 'Faltan parámetros requeridos: lessonId y sessionId',
    }));
    ws.close();
    return;
  }

  console.log(`🔌 WebSocket connected: lessonId=${lessonId}, sessionId=${sessionId}, provider=${provider}`);

  // Ping/pong para mantener conexión viva (cada 25 segundos en producción)
  let pingInterval: NodeJS.Timeout | null = null;
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 25000); // 25 segundos
  }

  let lessonContext: LessonContext | null = null;
  let conversationHistory: Array<{ role: string; content: string }> = [];
  let isStreaming = false;
  let streamController: AbortController | null = null;

  // Load conversation history
  getHistory(lessonId, sessionId).then(history => {
    conversationHistory = history;
  }).catch(err => {
    console.error('Error loading history:', err);
  });

  // Handle incoming messages
  ws.on('message', async (data: Buffer) => {
    try {
      const message: WSMessage = JSON.parse(data.toString());

      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      if (message.type === 'cancel') {
        // Cancelar stream en curso
        console.log(`🚫 Stream cancelled: sessionId=${sessionId}`);
        isStreaming = false;
        if (streamController) {
          streamController.abort();
          streamController = null;
        }
        ws.send(JSON.stringify({
          type: 'end',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        }));
        return;
      }

      if (message.type === 'user_message') {
        if (!message.message) {
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Mensaje vacío',
          }));
          return;
        }

        // Update lesson context if provided
        if (message.lessonContext) {
          lessonContext = message.lessonContext;
        }

        // Use provided conversation history or loaded one
        const history = message.conversationHistory || conversationHistory;

        // Validate message length
        if (message.message.length > 2000) {
          ws.send(JSON.stringify({
            type: 'error',
            error: 'El mensaje excede el límite de 2000 caracteres',
          }));
          return;
        }

        // Save user message
        if (lessonContext) {
          await saveMessage(sessionId, lessonId, provider, 'user', message.message);
        }

        // Add to conversation history
        conversationHistory.push({
          role: 'user',
          content: message.message,
        });

        // Stream response
        if (!lessonContext) {
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Contexto de lección no proporcionado',
          }));
          return;
        }

        let assistantResponse = '';
        isStreaming = true;
        streamController = new AbortController();

        await streamTutorResponse(
          message.message,
          lessonContext,
          provider,
          conversationHistory,
          {
            onStart: () => {
              if (streamController?.signal.aborted) return;
              ws.send(JSON.stringify({ type: 'start' }));
            },
            onToken: (delta: string) => {
              if (streamController?.signal.aborted) return;
              assistantResponse += delta;
              ws.send(JSON.stringify({
                type: 'token',
                delta,
              }));
            },
            onEnd: (usage) => {
              isStreaming = false;
              if (streamController?.signal.aborted) return;
              ws.send(JSON.stringify({
                type: 'end',
                usage,
              }));
              
              // Save assistant response after streaming completes
              if (assistantResponse) {
                saveMessage(sessionId, lessonId, provider, 'assistant', assistantResponse)
                  .catch(err => console.error('Error saving assistant message:', err));
                
                // Add to conversation history
                conversationHistory.push({
                  role: 'assistant',
                  content: assistantResponse,
                });
              }
              streamController = null;
            },
            onSuggestions: (suggestions) => {
              if (streamController?.signal.aborted) return;
              ws.send(JSON.stringify({
                type: 'suggestions',
                suggestions,
              }));
            },
            onError: (error: string) => {
              isStreaming = false;
              ws.send(JSON.stringify({
                type: 'error',
                error,
              }));
              streamController = null;
            },
          }
        );
      }
    } catch (error: any) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message || 'Error al procesar el mensaje',
      }));
    }
  });

  // Handle pong response
  ws.on('pong', () => {
    // Connection is alive
  });

  // Handle connection close
  ws.on('close', () => {
    console.log(`🔌 WebSocket disconnected: sessionId=${sessionId}`);
    if (pingInterval) {
      clearInterval(pingInterval);
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    if (pingInterval) {
      clearInterval(pingInterval);
    }
  });

  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'start',
  }));
}

