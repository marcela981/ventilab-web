/**
 * =============================================================================
 * Next.js App Router API Route - Lessons
 * =============================================================================
 * API endpoints for managing lessons
 * =============================================================================
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Lessons API endpoint' });
}

