/**
 * AI Tutor Routes
 * HTTP endpoints for AI tutor functionality
 */

import { Router } from 'express';
import {
  getCachedResponse,
  storeCachedResponse,
  getProviders,
  getSuggestions,
  getHistory,
  getHealth,
} from '../controllers/ai-tutor.controller';
import { expandTopic } from '../controllers/ai/expandTopic.controller';
import { suggestQuestions } from '../controllers/ai/suggestQuestions.controller';
import { chatCompletions } from '../controllers/ai/chatCompletions.controller';
import { authenticate } from '../middleware/auth';
import { createRateLimiter, createCompoundRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Rate limiter for AI tutor endpoints (60 requests per minute)
const tutorLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  60, // 60 requests
  'Demasiadas solicitudes al tutor IA. Por favor, espera un momento.'
);

// Rate limiter for AI expand topic: 10/min and 100/day
// Uses compound rate limiter to check both limits
const expandTopicLimiter = createCompoundRateLimiter(
  [
    { windowMs: 60 * 1000, max: 10 }, // 10 requests per minute
    { windowMs: 24 * 60 * 60 * 1000, max: 100 }, // 100 requests per day
  ],
  'Demasiadas solicitudes de expansión de temas. Por favor, espera un momento.'
);

// Health check (no auth required, no rate limit)
router.get('/health', getHealth);

// All other routes require authentication
router.use(authenticate);

// Cache endpoints
router.get('/cache', tutorLimiter, getCachedResponse);
router.post('/cache', tutorLimiter, storeCachedResponse);

// Provider endpoints
router.get('/providers', tutorLimiter, getProviders);

// Suggestions endpoint
router.get('/tutor/suggestions', tutorLimiter, getSuggestions);

// History endpoint
router.get('/tutor/history', tutorLimiter, getHistory);

// Unified chat completions endpoint (streaming and non-streaming)
router.post('/chat/completions', tutorLimiter, chatCompletions);

// Expand topic endpoint (with specific rate limiter)
router.post('/expand-topic', expandTopicLimiter, expandTopic);

// Suggest questions endpoint (optional, for server mode with embeddings)
// Rate limit: 20 requests per minute per IP
const suggestQuestionsLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  20, // 20 requests per minute
  'Demasiadas solicitudes de sugerencias. Por favor, espera un momento.'
);
router.post('/suggest-questions', suggestQuestionsLimiter, suggestQuestions);

export default router;

