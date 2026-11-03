/*
* Funcionalidad: cropAvatarImage
* Descripción: Browser-only step of the photo upload (DISENO_BLOQUE4 §2.8, no library): decodes the chosen file with createImageBitmap, draws its centered square on a canvas of at most 512 px (avatar entity geometry) and encodes it (png stays png, jpeg/webp become jpeg at 0.9). Rejects when the browser cannot decode or encode the image. Kept apart from useAvatar so tests can replace it (jsdom has no canvas). Depends on the avatar entity.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { avatarOutputType, centeredSquareCrop } from "../entities/avatar.entity";

export type CroppedAvatar = {
  blob: Blob
  fileName: string
};

const JPEG_QUALITY = 0.9;

export async function cropAvatarImage(file: Blob): Promise<CroppedAvatar> {
  const bitmap = await createImageBitmap(file);

  try {
    const crop = centeredSquareCrop(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");

    canvas.width = crop.outputSize;
    canvas.height = crop.outputSize;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas 2D context unavailable");
    }

    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, crop.sx, crop.sy, crop.side, crop.side, 0, 0, crop.outputSize, crop.outputSize);

    const type = avatarOutputType(file.type);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, type, JPEG_QUALITY);
    });

    if (!blob) {
      throw new Error("Canvas encoding failed");
    }

    return { blob, fileName: type === "image/png" ? "avatar.png" : "avatar.jpg" };
  } finally {
    bitmap.close();
  }
}
