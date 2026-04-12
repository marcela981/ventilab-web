import NextAuth from 'next-auth';
import { authOptions } from '../../../lib/auth';

/**
 * NextAuth.js API Route Handler
 * Wraps NextAuth in an explicit handler function with error handling
 * to prevent silent module-level crashes from returning 404.
 */
let handler;
try {
    handler = NextAuth(authOptions);
} catch (error) {
    console.error('[NextAuth] Failed to initialize handler:', error);
}

export default async function auth(req, res) {
    if (!handler) {
        // Retry initialization in case of transient startup errors
        try {
            handler = NextAuth(authOptions);
        } catch (error) {
            console.error('[NextAuth] Retry initialization failed:', error);
            return res.status(500).json({
                error: 'Authentication service unavailable',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            });
        }
    }
    return handler(req, res);
}
