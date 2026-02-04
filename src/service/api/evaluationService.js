/**
 * COMPATIBILITY SHIM
 * This file re-exports from the canonical location.
 * Import from '@/services/api/evaluationService' instead.
 * @deprecated Use @/services/api/evaluationService
 */
export { getCases, getCaseById, evaluateCase, getCaseAttempts, default } from '@/services/api/evaluationService';
