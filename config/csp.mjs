/*
* Funcionalidad: Security headers and Content Security Policy
* Descripción: Pure builder of the security headers served by next.config.mjs `headers()` for every route. buildContentSecurityPolicy derives the policy from the environment: the backend origin (NEXT_PUBLIC_BACKEND_URL, else NEXT_PUBLIC_API_URL without `/api`, else http://localhost:4000, as src/shared/lib/env.ts) for HTTP, SSE (connect-src) and Socket.io (its ws/wss twin), the optional media origin (NEXT_PUBLIC_MEDIA_ORIGIN, signed Supabase Storage URLs) for images and video, Google Identity Services (script https://accounts.google.com/gsi/client; frame, connect and style https://accounts.google.com/gsi/), Google profile pictures, the YouTube (nocookie) and Vimeo players of the VIDEO blocks, self-hosted fonts (next/font, KaTeX; `data:` allowed), `style-src 'unsafe-inline'` (MUI/Emotion inject style tags), `script-src 'self'` (the Pages Router needs no inline script; development adds 'unsafe-eval' for React Refresh), web workers from self and blob:, and an optional report-uri (CSP_REPORT_URI). buildSecurityHeaders adds X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin, X-Content-Type-Options nosniff and a minimal Permissions-Policy, and sends the policy as Content-Security-Policy-Report-Only unless CSP_REPORT_ONLY is "false" (Report-Only is the default until the author validates the policy in production). No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export const DEFAULT_BACKEND_ORIGIN = "http://localhost:4000";

const GOOGLE_GSI = "https://accounts.google.com/gsi/";
const GOOGLE_GSI_CLIENT = "https://accounts.google.com/gsi/client";
const GOOGLE_GSI_STYLE = "https://accounts.google.com/gsi/style";
const GOOGLE_AVATARS = "https://*.googleusercontent.com";
const VIDEO_PLAYERS = ["https://www.youtube-nocookie.com", "https://player.vimeo.com"];

/** Origin (scheme://host[:port]) of a URL, or null when it is missing or not http(s). */
export function toOrigin(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  try {
    const url = new URL(value.trim());

    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

/** Public backend origin, with the same precedence the browser bundle uses (src/shared/lib/env.ts). */
export function resolvePublicBackendOrigin(env) {
  const legacy = typeof env.NEXT_PUBLIC_API_URL === "string" ? env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "") : undefined;

  return toOrigin(env.NEXT_PUBLIC_BACKEND_URL) ?? toOrigin(legacy) ?? DEFAULT_BACKEND_ORIGIN;
}

/** WebSocket twin of an http(s) origin (Socket.io upgrades to it). */
export function toWebSocketOrigin(origin) {
  return origin.replace(/^http(s?):/, "ws$1:");
}

function unique(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value !== ""))];
}

export function isReportOnly(env) {
  return String(env.CSP_REPORT_ONLY ?? "").trim().toLowerCase() !== "false";
}

export function buildContentSecurityPolicy(env, { isDev = false } = {}) {
  const backend = resolvePublicBackendOrigin(env);
  const media = toOrigin(env.NEXT_PUBLIC_MEDIA_ORIGIN);
  const reportUri = typeof env.CSP_REPORT_URI === "string" ? env.CSP_REPORT_URI.trim() : "";

  const directives = [
    ["default-src", ["'self'"]],
    ["base-uri", ["'self'"]],
    ["object-src", ["'none'"]],
    ["frame-ancestors", ["'none'"]],
    ["form-action", ["'self'"]],
    ["script-src", unique(["'self'", isDev ? "'unsafe-eval'" : "", GOOGLE_GSI_CLIENT])],
    ["style-src", ["'self'", "'unsafe-inline'", GOOGLE_GSI_STYLE]],
    ["img-src", unique(["'self'", "data:", "blob:", backend, media, GOOGLE_AVATARS])],
    ["media-src", unique(["'self'", "blob:", backend, media])],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", unique(["'self'", backend, toWebSocketOrigin(backend), GOOGLE_GSI])],
    ["frame-src", [GOOGLE_GSI, ...VIDEO_PLAYERS]],
    ["worker-src", ["'self'", "blob:"]],
    ["manifest-src", ["'self'"]],
  ];

  if (reportUri !== "") {
    directives.push(["report-uri", [reportUri]]);
  }

  return directives.map(([name, sources]) => `${name} ${sources.join(" ")}`).join("; ");
}

export const PERMISSIONS_POLICY = "camera=(), microphone=(), geolocation=(), payment=(), usb=()";

export function buildSecurityHeaders(env, { isDev = false } = {}) {
  return [
    { key: isReportOnly(env) ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy", value: buildContentSecurityPolicy(env, { isDev }) },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  ];
}
