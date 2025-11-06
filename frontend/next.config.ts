import type { NextConfig } from "next";

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
  // Configuración de webpack para manejar archivos .md
  webpack: (config, { isServer }) => {
    // Manejar archivos .md como assets de texto para evitar errores de módulo desconocido
    // Esto evita que Next.js intente procesar archivos .md como módulos JavaScript
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    });
    
    return config;
  },
};

export default nextConfig;
