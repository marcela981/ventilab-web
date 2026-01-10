/**
 * =============================================================================
 * NextAuth.js API Route Handler
 * =============================================================================
 * This file only exports the NextAuth handler.
 * Configuration is in lib/auth.ts for shared access across both
 * Pages Router and App Router API routes.
 * =============================================================================
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// Re-export authOptions for backwards compatibility
export { authOptions };

// Export NextAuth handler
export default NextAuth(authOptions);
