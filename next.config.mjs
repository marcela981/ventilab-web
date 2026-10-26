// next.config.mjs
// Configuración optimizada para deployment en Vercel
// v1.1 (B3.8, D5): redirects() sirve todas las redirecciones legadas desde config/legacy-redirects.mjs.
// v1.2 (B5): headers() sirve las cabeceras de seguridad y la CSP de config/csp.mjs en todas las rutas
//   (CSP en modo Report-Only salvo CSP_REPORT_ONLY=false).
// v1.3 (A7): se elimina serverExternalPackages (@prisma/client, prisma, bcryptjs); la web ya no usa Prisma.

import { LEGACY_REDIRECTS } from './config/legacy-redirects.mjs';
import { buildSecurityHeaders } from './config/csp.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración optimizada para deployment en Vercel
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configuración para archivos estáticos
  trailingSlash: false,
  // Legacy routes → new routes. Temporary (307) until after the thesis defense; then switch to permanent (308).
  async redirects() {
    return LEGACY_REDIRECTS.map((rule) => ({ ...rule }));
  },
  // Security headers and CSP on every route; the policy is derived from the environment at build/start time.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: buildSecurityHeaders(process.env, { isDev: process.env.NODE_ENV !== 'production' }),
      },
    ];
  },
  // Configuración para imágenes
  images: {
    unoptimized: true,
  },
  // Habilitar Turbopack (default en Next.js 16)
  turbopack: {
    // Configuración para manejar archivos .md
    rules: {
      '*.md': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
