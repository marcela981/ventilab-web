/**
 * AI Tutor Service
 * Main service for handling AI tutor interactions
 */

import { AIProviderFactory } from './AIProviderFactory';
import { generateSuggestions, LessonContext } from './TutorPromptService';
import { buildPrompt as buildPromptTemplate, getPromptTemplateVersion as getTemplateVersion } from './prompts/lessonTemplates';
import { getCache, setCache } from './AICacheService';
import crypto from 'crypto';
import prisma from '../../config/database';

export interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TutorStreamCallbacks {
  onStart?: () => void;
  onToken?: (delta: string) => void;
  onEnd?: (usage?: { promptTokens: number; completionTokens: number; totalTokens: number }) => void;
  onSuggestions?: (suggestions: string[]) => void;
  onError?: (error: string) => void;
}

/**
 * Normalize question for cache key generation
 */
function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

/**
 * Generate cache hash
 */
async function generateCacheHash(
  question: string,
  context: LessonContext,
  provider: string
): Promise<string> {
  const normalizedQuestion = normalizeQuestion(question);
  const promptVersion = getTemplateVersion(); // Use template library version
  const cacheString = `${normalizedQuestion}|${context.lessonId}|${provider}|${promptVersion}`;

  return crypto.createHash('sha256').update(cacheString).digest('hex');
}

/**
 * Trim conversation history to last N messages
 */
function trimHistory(messages: TutorMessage[], maxMessages: number = 20): TutorMessage[] {
  if (messages.length <= maxMessages) {
    return messages;
  }
  // Keep first message (system context) and last N-1 messages
  return messages.slice(0, 1).concat(messages.slice(-(maxMessages - 1)));
}

/**
 * Stream AI tutor response
 */
export async function streamTutorResponse(
  userMessage: string,
  lessonContext: LessonContext,
  provider: string,
  conversationHistory: TutorMessage[] = [],
  callbacks: TutorStreamCallbacks = {}
): Promise<void> {
  const { onStart, onToken, onEnd, onSuggestions, onError } = callbacks;

  // Validate message length
  if (userMessage.length > 2000) {
    onError?.('El mensaje excede el límite de 2000 caracteres');
    return;
  }

  // Get provider
  const aiProvider = AIProviderFactory.getProvider(provider);
  if (!aiProvider) {
    onError?.(`Proveedor "${provider}" no disponible`);
    return;
  }

  // Check cache first
  const cacheHash = await generateCacheHash(userMessage, lessonContext, provider);
  const cached = await getCache(cacheHash);
  
  if (cached && !cached.noCache) {
    // Return cached response
    onStart?.();
    // Stream cached answer token by token (simulate streaming)
    for (let i = 0; i < cached.answer.length; i += 10) {
      const chunk = cached.answer.slice(i, i + 10);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for realism
      onToken?.(chunk);
    }
    onEnd?.(cached.usage);
    // Generate suggestions
    const suggestions = generateSuggestions(lessonContext);
    onSuggestions?.(suggestions);
    return;
  }

  // Build system prompt using template library
  // Note: buildPromptTemplate expects messages without the current user message
  const trimmedHistory = trimHistory(conversationHistory);
  const promptData = buildPromptTemplate(
    provider as 'openai' | 'anthropic' | 'google',
    lessonContext,
    trimmedHistory,
    lessonContext.tipoDeLeccion
  );
  const systemPrompt = promptData.system;

  // Build messages array from template (includes trimmed history)
  const messages = [...promptData.messages];

  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage,
  });

  try {
    onStart?.();

    let fullContent = '';
    let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;
    let noCache: boolean = false;

    // Stream from provider
    for await (const chunk of aiProvider.stream({
      messages,
      system: systemPrompt,
      temperature: 0.7,
      top_p: 1.0,
    })) {
      if (chunk.type === 'token' && chunk.delta) {
        fullContent += chunk.delta;
        onToken?.(chunk.delta);
      } else if (chunk.type === 'end') {
        usage = chunk.usage;
        noCache = chunk.noCache ?? false;
        onEnd?.(chunk.usage);
      } else if (chunk.type === 'error') {
        onError?.(chunk.error || 'Error desconocido');
        return;
      }
    }

    // Cache the response (if not marked as no-cache and length >= 30)
    if (fullContent.length >= 30 && !noCache) {
      await setCache(cacheHash, fullContent, usage, noCache ?? false);
    }

    // Generate and send suggestions
    const suggestions = generateSuggestions(lessonContext);
    onSuggestions?.(suggestions);
  } catch (error: any) {
    onError?.(error.message || 'Error al procesar la solicitud');
  }
}

/**
 * Save message to database
 */
export async function saveMessage(
  sessionId: string,
  lessonId: string,
  provider: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  try {
    // Find or create session
    // @ts-ignore - Prisma models will be available after running prisma generate
    let session = await prisma.aiChatSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      // @ts-ignore - Prisma models will be available after running prisma generate
      session = await prisma.aiChatSession.create({
        data: {
          lessonId,
          sessionId,
          provider,
        },
      });
    }

    // Save message
    // @ts-ignore - Prisma models will be available after running prisma generate
    await prisma.aiMessage.create({
      data: {
        sessionId: session.id,
        role,
        content,
      },
    });

    // Trim old messages (keep last 20)
    // @ts-ignore - Prisma models will be available after running prisma generate
    const messages = await prisma.aiMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      skip: 20,
    });

    if (messages.length > 0) {
      // @ts-ignore - Prisma models will be available after running prisma generate
      await prisma.aiMessage.deleteMany({
        where: {
          id: { in: messages.map((m: { id: string }) => m.id) },
        },
      });
    }
  } catch (error) {
    console.error('Error saving message to database:', error);
    // Don't throw - message saving is optional
  }
}

/**
 * Get conversation history
 */
export async function getHistory(
  lessonId: string,
  sessionId: string
): Promise<TutorMessage[]> {
  try {
    // @ts-ignore - Prisma models will be available after running prisma generate
    const session = await prisma.aiChatSession.findUnique({
      where: { sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 20,
        },
      },
    });

    if (!session || session.lessonId !== lessonId) {
      return [];
    }

    return session.messages.map((msg: { role: string; content: string }) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));
  } catch (error) {
    console.error('Error getting history:', error);
    return [];
  }
}

