import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Configuración optimizada para deployment en Vercel
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configuración para archivos estáticos
  trailingSlash: false,
  // Configuración para imágenes
  images: {
    unoptimized: true,
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
  // Configuración de webpack para manejar archivos .md y path aliases
  webpack: (config, { isServer }) => {
    // Manejar archivos .md como assets de texto para evitar errores de módulo desconocido
    // Esto evita que Next.js intente procesar archivos .md como módulos JavaScript
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    });
    
    // Configurar path aliases para resolver imports con @/
    if (!config.resolve) {
      config.resolve = {};
    }
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    
    // Set up @ alias to point to src directory
    // This allows imports like @/lib/auth-config to resolve to src/lib/auth-config
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    
    return config;
  },
};

export default nextConfig;
