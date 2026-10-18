// next.config.mjs
// Configuración optimizada para deployment en Vercel
// v1.1 (B3.8, D5): redirects() sirve todas las redirecciones legadas desde config/legacy-redirects.mjs.

import { LEGACY_REDIRECTS } from './config/legacy-redirects.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración optimizada para deployment en Vercel
  typescript: {
    ignoreBuildErrors: true,
  },
  // Evitar que paquetes server-only se empaqueten y causen ESM/CommonJS en cliente
  serverExternalPackages: [
    '@prisma/client',
    'prisma',
    'bcryptjs',
  ],
  // Configuración para archivos estáticos
  trailingSlash: false,
  // Legacy routes → new routes. Temporary (307) until after the thesis defense; then switch to permanent (308).
  async redirects() {
    return LEGACY_REDIRECTS.map((rule) => ({ ...rule }));
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
