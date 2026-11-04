/*
* Funcionalidad: useAvatar
* Descripción: Photo actions of the profile page. `upload(file)` checks the type and size on the client (julio messages, no request when invalid), crops the centered square at 512 px (cropAvatarImage) and sends it with `PUT /api/users/me/avatar`; `remove()` calls `DELETE /api/users/me/avatar`. After either succeeds it re-reads the profile and the session user (the photo is a signed URL that expires, so the URL is never kept from the response) and shows the success notice; failures show one Spanish alert (413, 415, 503, 429, network…). One action at a time. Depends on react, @shared/session, the avatar entity, cropAvatarImage and the profile service.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { useCallback, useRef, useState } from "react";
import { useSession } from "@shared/session";
import { removeMyAvatar, uploadMyAvatar } from "../../api/services/profile.service";
import { AVATAR_MESSAGES, getAvatarError, validateAvatarFile } from "../entities/avatar.entity";
import { cropAvatarImage } from "./crop-avatar-image";
import type { CroppedAvatar } from "./crop-avatar-image";

export type AvatarAction = "upload" | "remove";

export type UseAvatarResult = {
  busy: AvatarAction | null
  error: string | null
  notice: string | null
  upload: (file: File) => Promise<void>
  remove: () => Promise<void>
};

export function useAvatar(reloadProfile: () => Promise<void>): UseAvatarResult {
  const { reloadSession } = useSession();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState<AvatarAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = useCallback(async(action: AvatarAction, request: () => Promise<unknown>) => {
    busyRef.current = true;
    setBusy(action);

    try {
      await request();
    } catch (caught) {
      setError(getAvatarError(caught, action));
      busyRef.current = false;
      setBusy(null);

      return;
    }

    // The change is saved; a failed refresh only leaves the previous photo on screen.
    await Promise.all([reloadProfile().catch(() => undefined), reloadSession()]);
    setNotice(action === "upload" ? AVATAR_MESSAGES.uploaded : AVATAR_MESSAGES.removed);
    busyRef.current = false;
    setBusy(null);
  }, [reloadProfile, reloadSession]);

  const upload = useCallback(async(file: File) => {
    if (busyRef.current) {
      return;
    }

    setError(null);
    setNotice(null);

    const invalid = validateAvatarFile(file);

    if (invalid) {
      setError(invalid);

      return;
    }

    let cropped: CroppedAvatar;

    try {
      cropped = await cropAvatarImage(file);
    } catch {
      setError(AVATAR_MESSAGES.unreadable);

      return;
    }

    await run("upload", () => uploadMyAvatar(cropped.blob, cropped.fileName));
  }, [run]);

  const remove = useCallback(async() => {
    if (busyRef.current) {
      return;
    }

    setError(null);
    setNotice(null);
    await run("remove", removeMyAvatar);
  }, [run]);

  return { busy, error, notice, upload, remove };
}
