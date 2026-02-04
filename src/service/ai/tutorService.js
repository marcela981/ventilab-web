/**
 * COMPATIBILITY SHIM
 * This file re-exports from the canonical location.
 * Import from '@/services/ai/tutorService' instead.
 * @deprecated Use @/services/ai/tutorService
 */
import tutorService from '@/services/ai/tutorService';
export default tutorService;
export * from '@/services/ai/tutorService';
