/*
* Funcionalidad: Video URL parser
* Descripción: Turns a stored VIDEO block URL (https YouTube or Vimeo, the hosts the backend allows) into a privacy-friendly embed URL built only from a validated id: youtube-nocookie.com/embed/{11-char id} and player.vimeo.com/video/{numeric id}?dnt=1. Anything else returns null so the caller shows a plain link. Also exposes isSafeMediaUrl for media URLs (http/https only). No dependencies.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

export type VideoEmbed = {
  provider: "youtube" | "vimeo"
  id: string
  embedUrl: string
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{1,12}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com"]);
const YOUTUBE_PATH = /^\/(?:embed|shorts|live|v)\/([^/]+)/;

function parseUrl(value: string): URL | null {
  try {
    const url = new URL(value);

    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function youtubeId(url: URL): string | null {
  if (url.hostname === "youtu.be") {
    return url.pathname.split("/")[1] ?? null;
  }

  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    return null;
  }

  return url.pathname === "/watch" ? url.searchParams.get("v") : (YOUTUBE_PATH.exec(url.pathname)?.[1] ?? null);
}

function vimeoId(url: URL): string | null {
  if (url.hostname === "player.vimeo.com") {
    return /^\/video\/([^/]+)/.exec(url.pathname)?.[1] ?? null;
  }

  return VIMEO_HOSTS.has(url.hostname) ? (url.pathname.split("/")[1] ?? null) : null;
}

export function parseVideoEmbed(value: unknown): VideoEmbed | null {
  const url = typeof value === "string" ? parseUrl(value.trim()) : null;

  if (!url) {
    return null;
  }

  // URL already lowercases the hostname.
  const youtube = youtubeId(url);

  if (youtube !== null && YOUTUBE_ID.test(youtube)) {
    return { provider: "youtube", id: youtube, embedUrl: `https://www.youtube-nocookie.com/embed/${youtube}` };
  }

  const vimeo = vimeoId(url);

  if (vimeo !== null && VIMEO_ID.test(vimeo)) {
    return { provider: "vimeo", id: vimeo, embedUrl: `https://player.vimeo.com/video/${vimeo}?dnt=1` };
  }

  return null;
}

export function isSafeMediaUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const { protocol } = new URL(value);

    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
