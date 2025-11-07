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
import { authenticate } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import { Request, Response } from 'express';

const router = Router();

// Rate limiter for AI tutor endpoints (60 requests per minute)
const tutorLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  60, // 60 requests
  'Demasiadas solicitudes al tutor IA. Por favor, espera un momento.'
);

// Health check (no auth required, no rate limit)
router.get('/health', getHealth);

// All other routes require authentication
router.use(authenticate);
router.use(tutorLimiter);

// Cache endpoints
router.get('/cache', getCachedResponse);
router.post('/cache', storeCachedResponse);

// Provider endpoints
router.get('/providers', getProviders);

// Suggestions endpoint
router.get('/tutor/suggestions', getSuggestions);

// History endpoint
router.get('/tutor/history', getHistory);

export default router;

