// frontend/src/services/http.ts

import { debug } from '@/utils/debug';
import { newRequestId } from '@/utils/requestId';

// Get API URL from environment (Next.js uses process.env, Vite uses import.meta.env)
function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: check both Next.js and Vite env vars
    const apiUrl = (
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof (window as any).__VENTY_ENV !== 'undefined' && (window as any).__VENTY_ENV?.VITE_API_URL) ||
      'http://localhost:3001/api'
    );
    
    // Debug: Print API URL once on module load (client-side only)
    console.debug('[http] API Base URL:', apiUrl);
    console.debug('[http] NEXT_PUBLIC_API_URL env:', process.env.NEXT_PUBLIC_API_URL);
    
    return apiUrl;
  }
  // Server-side: only Next.js env vars are available
  return process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001/api';
}

const BASE_URL = getApiUrl();

export async function http(path: string, options: RequestInit & { authToken?: string } = {}) {
  const rid = newRequestId();
  const url = `${BASE_URL}${path}`;
  const start = debug.now();
  const g = debug.group(`HTTP ${options.method||'GET'} ${path} rid=${rid}`);

  const headers: Record<string,string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string,string> || {}),
    'x-request-id': rid,
  };
  if (options.authToken) {
    headers['Authorization'] = `Bearer ${options.authToken}`;
  }

  g.info('→ request', { url, hasToken: !!options.authToken, tokenPreview: options.authToken ? debug.short(options.authToken) : 'none' });

  let res: Response;
  try {
    // Evitar cache del navegador y 304 en dev
    res = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        ...headers,
        'cache-control': 'no-cache',
        ...(options.headers as Record<string,string> || {}),
      },
    });
  } catch (e:any) {
    g.error('✖ network error', e?.message);
    g.end();
    throw e;
  }

  const dur = (debug.now() - start).toFixed(1);
  const ct = res.headers.get('content-type') || '';
  const respRid = res.headers.get('x-request-id');

  g.info('← response', { status: res.status, ok: res.ok, contentType: ct, ridEcho: respRid, durMs: dur });

  // Manejar 304 sin intentar parsear JSON vacío
  if (res.status === 304) {
    g.info('304 Not Modified - returning undefined');
    g.end();
    return { res, data: undefined, rid };
  }

  let data: any = null;
  try {
    data = ct.includes('application/json') ? await res.json() : await res.text();
  } catch (e:any) {
    g.warn('parse body error', e?.message);
  }

  if (!res.ok) {
    g.error('HTTP error payload', data);
  } else {
    g.info('payload (short)', truncateForLog(data));
  }

  g.end();
  return { res, data, rid };
}

function truncateForLog(obj:any) {
  try {
    const s = JSON.stringify(obj);
    return s.length > 1200 ? s.slice(0,1200)+'…(trunc)' : obj;
  } catch { return obj; }
}

