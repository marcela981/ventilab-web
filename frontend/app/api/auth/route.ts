/**
 * =============================================================================
 * Next.js App Router API Route - Authentication
 * =============================================================================
 * This directory contains API routes for authentication using NextAuth.js
 * 
 * Note: NextAuth.js is currently configured in pages/api/auth/[...nextauth].js
 * This App Router route can be used for additional auth endpoints if needed.
 * =============================================================================
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Auth API endpoint',
    note: 'NextAuth.js is configured in pages/api/auth/[...nextauth].js'
  });
}

