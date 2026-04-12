/**
 * API Route: Get Backend JWT Token
 * This route bridges NextAuth sessions with the backend API
 * Gets the NextAuth session and exchanges it for a backend JWT token
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { BACKEND_API_URL, isServer, logEnvDiagnostics } from '@/config/env';

export default async function handler(req, res) {
  // Prevent 304 Not Modified responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.removeHeader('ETag');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Environment diagnostics (server-side only)
    logEnvDiagnostics('pages/api/auth/backend-token');

    // Hard failure in production if BACKEND_URL is missing
    if (process.env.NODE_ENV === 'production' && !process.env.BACKEND_URL) {
      console.error('[backend-token] BACKEND_URL missing in production');
      return res.status(500).json({ error: 'Server misconfiguration: BACKEND_URL is not defined' });
    }

    if (!isServer) {
      // This route should never execute on the client
      console.error('[backend-token] Unexpected non-server runtime');
    }

    // Get NextAuth session
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id: userId, email } = session.user;

    if (!userId || !email) {
      return res.status(400).json({ error: 'Invalid session data' });
    }

    // Call backend to generate JWT token
    const backendResponse = await fetch(`${BACKEND_API_URL}/auth/nextauth-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        email,
      }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      console.error('[backend-token] Backend error:', errorData);
      return res.status(backendResponse.status).json({
        error: errorData.message || 'Failed to generate backend token',
      });
    }

    const data = await backendResponse.json();

    // Return token and user data
    // Force 200 status (already set headers above)
    return res.status(200).json({
      success: true,
      token: data.data?.token,
      user: data.data?.user,
    });
  } catch (error) {
    console.error('[backend-token] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

