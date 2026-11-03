/*
* Funcionalidad: AvatarUploader
* Descripción: Photo block of the "Información personal" tab: the current photo (UserDTO.image, initials fallback), "Cambiar foto" (opens the device file picker restricted to png/jpeg/webp; the file is checked, cropped to a centered 512 px square and uploaded right away by useAvatar), "Quitar foto" (only when there is a photo) and the julio hint with the limits. Busy buttons show a spinner (AsyncButton); errors go to an alert, successes to a status notice. Test id `profile-avatar-input` on the file input. Spanish copy, TODO(i18n). Depends on MUI, @shared/design-system, useAvatar, the avatar entity, ProfileAvatar and UI/avatar-uploader.module.css.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { useId, useRef } from "react";
import type { ChangeEvent } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { cx } from "@shared/lib/class-names";
import { AVATAR_ACCEPT } from "../entities/avatar.entity";
import type { Profile } from "../entities/profile.entity";
import { useAvatar } from "../hooks/use-avatar";
import { ProfileAvatar } from "./profile-avatar";
import styles from "../../UI/avatar-uploader.module.css";

// TODO(i18n): move to a profile namespace in src/i18n.
const AVATAR_COPY = {
  photo: "Foto de perfil",
  change: "Cambiar foto",
  remove: "Quitar foto",
  input: "Elegir una foto de perfil",
  hint: "Sube una imagen desde tu dispositivo (máx. 2 MB, PNG/JPG/WEBP). Se recorta en un cuadrado centrado.",
} as const;

export type AvatarUploaderProps = {
  profile: Profile
  onChanged: () => Promise<void>
};

export function AvatarUploader({ profile, onChanged }: AvatarUploaderProps) {
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { busy, error, notice, upload, remove } = useAvatar(onChanged);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    // Reset so choosing the same file again still fires a change.
    event.target.value = "";

    if (file) {
      void upload(file);
    }
  };

  return (
    <div className={cx(styles.uploader)}>
      <div className={cx(styles.row)}>
        <ProfileAvatar src={profile.image} name={profile.name} email={profile.email} label={AVATAR_COPY.photo} />
        <div className={cx(styles.actions)}>
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            hidden
            aria-label={AVATAR_COPY.input}
            data-testid="profile-avatar-input"
            onChange={handleFile}
          />
          <AsyncButton
            variant="outlined"
            loading={busy === "upload"}
            disabled={busy !== null}
            aria-describedby={hintId}
            onClick={() => inputRef.current?.click()}
          >
            {AVATAR_COPY.change}
          </AsyncButton>
          {profile.image ? (
            <AsyncButton variant="text" loading={busy === "remove"} disabled={busy !== null} onClick={() => void remove()}>
              {AVATAR_COPY.remove}
            </AsyncButton>
          ) : null}
        </div>
      </div>
      <Typography id={hintId} variant="body2" className={cx(styles.hint)}>
        {AVATAR_COPY.hint}
      </Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {notice ? <Alert severity="success" role="status">{notice}</Alert> : null}
    </div>
  );
}
