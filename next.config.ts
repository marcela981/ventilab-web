import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuración optimizada para deployment en Vercel
  typescript: {
    ignoreBuildErrors: true,
  },
  // Evitar que paquetes server-only se empaqueten y causen ESM/CommonJS en cliente
  serverExternalPackages: [
    '@prisma/client',
    'prisma',
    '@next-auth/prisma-adapter',
    'bcryptjs',
  ],
  // Transpilación de next-auth para evitar "Unexpected token export" en producción
  transpilePackages: ['next-auth'],
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
