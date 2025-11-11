// backend/src/middleware/progressLogger.ts

import { Request, Response, NextFunction } from 'express';

const enabled = process.env.DEBUG_PROGRESS === 'true';

function short(s?: string) {
  if (!s) return 'none';
  if (s.length <= 10) return s;
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

export function withRequestId(req: Request, res: Response, next: NextFunction) {
  const headerId = req.header('x-request-id');
  const rid = headerId || `${Math.random().toString(16).slice(2)}-${Date.now()}`;
  (req as any).rid = rid;
  res.setHeader('x-request-id', rid);
  next();
}

export function progressLogger(req: Request, res: Response, next: NextFunction) {
  if (!enabled) return next();

  const t0 = Date.now();
  const rid = (req as any).rid;
  const auth = req.header('authorization') || '';
  const tokenPreview = auth.startsWith('Bearer ') ? short(auth.slice(7)) : 'none';

  const log = (...a: any[]) => console.info('[progress]', ...a);

  log('→', req.method, req.originalUrl, { rid, hasToken: !!auth, tokenPreview });

  res.on('finish', () => {
    const dur = Date.now() - t0;
    log('←', req.method, req.originalUrl, { rid, status: res.statusCode, durMs: dur });
  });

  next();
}

