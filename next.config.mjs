// next.config.mjs
// Configuración optimizada para deployment en Vercel

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
