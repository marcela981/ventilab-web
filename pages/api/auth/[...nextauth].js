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

// Export NextAuth handler only. Import authOptions from @/lib/auth elsewhere.
export default NextAuth(authOptions);
