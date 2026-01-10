import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuración optimizada para deployment en Vercel
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configuración para archivos estáticos
  trailingSlash: false,
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
  // Rewrites para evitar CORS y puertos cruzados en dev
  // Proxy SOLO cuando el path empieza por /backend (aislado del espacio /api de NextAuth)
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
