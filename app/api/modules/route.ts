/**
 * =============================================================================
 * Next.js App Router API Route - Modules
 * =============================================================================
 * API endpoints for managing learning modules
 * =============================================================================
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Modules API endpoint' });
}

