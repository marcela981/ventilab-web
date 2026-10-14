/*
* Funcionalidad: Media blocks
* Descripción: IMAGE (figure from the resolved mediaUrl with alt and caption), FILE (download link) and VIDEO blocks. A VIDEO with `content.url` becomes a privacy-friendly YouTube (youtube-nocookie) or Vimeo (dnt) iframe built from a validated id, or a plain link when the URL cannot be embedded; a VIDEO upload uses the native player. In print mode every video renders as a visible link with its URL. Media URLs other than http/https are dropped. Captions are rendered as text, never as HTML. Depends on react and video-source.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { readString } from "./content-block.types";
import type { ContentBlockMode } from "./content-block.types";
import { isSafeMediaUrl, parseVideoEmbed } from "./video-source";
import styles from "../UI/content-blocks.module.css";

export type MediaBlockProps = {
  content: unknown
  mediaUrl?: string | null | undefined
  title?: string | null | undefined
};

export type VideoBlockProps = MediaBlockProps & {
  mode: ContentBlockMode
};

function Caption({ text }: { text: string | null }) {
  return text === null ? null : <figcaption className={styles.caption}>{text}</figcaption>;
}

function Unavailable({ label }: { label: string }) {
  return <p className={styles.unavailable}>{label}</p>;
}

export function ImageBlock({ content, mediaUrl, title }: MediaBlockProps) {
  if (!isSafeMediaUrl(mediaUrl)) {
    return <Unavailable label="Imagen no disponible." />;
  }

  const caption = readString(content, "caption");
  const alt = readString(content, "alt") ?? caption ?? title ?? "";

  return (
    <figure className={styles.figure}>
      {/* Media URLs are storage URLs resolved by the backend; next/image would need a remote host config. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.image} src={mediaUrl} alt={alt} loading="lazy" />
      <Caption text={caption} />
    </figure>
  );
}

export function FileBlock({ content, mediaUrl, title }: MediaBlockProps) {
  if (!isSafeMediaUrl(mediaUrl)) {
    return <Unavailable label="Archivo no disponible." />;
  }

  const label = readString(content, "caption") ?? title ?? "Archivo adjunto";

  return (
    <p className={styles.file}>
      <a href={mediaUrl} download target="_blank" rel="noopener noreferrer">
        Descargar: {label}
      </a>
    </p>
  );
}

function VideoLink({ url, caption }: { url: string, caption: string | null }) {
  return (
    <figure className={styles.figure}>
      <p className={styles.videoLink}>
        Video: <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
      </p>
      <Caption text={caption} />
    </figure>
  );
}

export function VideoBlock({ content, mediaUrl, title, mode }: VideoBlockProps) {
  const caption = readString(content, "caption");
  const url = readString(content, "url");

  if (url !== null) {
    const embed = parseVideoEmbed(url);

    if (mode === "print" || !embed) {
      return isSafeMediaUrl(url) ? <VideoLink url={url} caption={caption} /> : <Unavailable label="Video no disponible." />;
    }

    return (
      <figure className={styles.figure}>
        <div className={styles.videoFrame}>
          <iframe
            src={embed.embedUrl}
            title={title ?? caption ?? "Video"}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
        <Caption text={caption} />
      </figure>
    );
  }

  if (!isSafeMediaUrl(mediaUrl)) {
    return <Unavailable label="Video no disponible." />;
  }

  if (mode === "print") {
    return <VideoLink url={mediaUrl} caption={caption} />;
  }

  return (
    <figure className={styles.figure}>
      <video className={styles.video} src={mediaUrl} controls preload="metadata" aria-label={title ?? caption ?? "Video"} />
      <Caption text={caption} />
    </figure>
  );
}
