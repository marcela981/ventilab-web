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
};

export default nextConfig;
