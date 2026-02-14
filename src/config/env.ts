// Centralized environment configuration for frontend/backend URLs
// Ensures consistent resolution between server (Node.js) and client (browser)

export const isServer = typeof window === 'undefined';

// Resolve backend base URL (without /api suffix)
// Priority:
// 1. BACKEND_URL / NEXT_PUBLIC_BACKEND_URL (new recommended)
// 2. NEXT_PUBLIC_API_URL (legacy, may already include /api)
// 3. Fallback to http://localhost:3001
function resolveBackendBaseUrl(): string {
  const serverEnv = process.env.BACKEND_URL;
  const clientEnv = process.env.NEXT_PUBLIC_BACKEND_URL;
  const legacyApiUrl = process.env.NEXT_PUBLIC_API_URL;

  let raw =
    (isServer ? serverEnv : clientEnv) ||
    // If only legacy API URL is defined, strip trailing /api if present
    (legacyApiUrl ? legacyApiUrl.replace(/\/api\/?$/, '') : '') ||
    'http://localhost:3001';

  // Normalize: no trailing slash
  raw = raw.replace(/\/+$/, '');

  return raw;
}

export const BACKEND_URL = resolveBackendBaseUrl();

// Convenience helper for common `/api` prefix used by the Express backend
export const BACKEND_API_URL = `${BACKEND_URL}/api`;

// Helper for temporary diagnostics in server logs
export function logEnvDiagnostics(context: string) {
  // Only log on the server to avoid leaking env info to the browser
  if (!isServer) return;

  // Only log keys existence, never values
  // These logs are safe to keep in production while debugging
  console.log(`[env] Diagnostics for ${context}`);
  console.log('[env] Runtime:', isServer ? 'server' : 'client');
  console.log('[env] BACKEND_URL defined:', !!process.env.BACKEND_URL);
  console.log('[env] NEXT_PUBLIC_BACKEND_URL defined:', !!process.env.NEXT_PUBLIC_BACKEND_URL);
  console.log('[env] NEXT_PUBLIC_API_URL defined:', !!process.env.NEXT_PUBLIC_API_URL);
  console.log('[env] Resolved BACKEND_URL:', BACKEND_URL);
  console.log('[env] Resolved BACKEND_API_URL:', BACKEND_API_URL);
}

