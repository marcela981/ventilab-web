/*
* Funcionalidad: ProfileForm
* Descripción: Edit form of the own profile: name and avatar URL (http/https only) with a live avatar preview that falls back to the initials, a "Quitar foto" action (saves `image: null`), client validation with per-field messages (`noValidate`, same approach as the login form: entity validation + MUI TextField error/helperText), backend field errors, one error alert and a success notice. "Guardar cambios" is disabled while nothing changed or a save is running. Spanish copy, TODO(i18n). Depends on MUI, the profile hooks/entities, ProfileAvatar and UI/profile-form.module.css.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useId, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { cx } from "@shared/lib/class-names";
import { hasProfileChanges } from "../../api/mappers/profile.mapper";
import { isHttpUrl, toDraft } from "../entities/profile.entity";
import type { Profile, ProfileDraft, ProfileField } from "../entities/profile.entity";
import { useSaveProfile } from "../hooks/use-save-profile";
import { ProfileAvatar } from "./profile-avatar";
import styles from "../../UI/profile-form.module.css";

// TODO(i18n): move to a profile namespace in src/i18n.
const FORM_COPY = {
  title: "Información personal",
  name: "Nombre",
  image: "URL de la foto",
  imageHint: "Usa una dirección http:// o https://. Déjala vacía para usar tus iniciales.",
  preview: "Vista previa de la foto de perfil",
  removeImage: "Quitar foto",
  submit: "Guardar cambios",
  saving: "Guardando…",
  saved: "Perfil actualizado.",
} as const;

export type ProfileFormProps = {
  profile: Profile
  onSaved: () => Promise<void>
};

function previewSource(image: string): string | null {
  const trimmed = image.trim();

  return trimmed !== "" && isHttpUrl(trimmed) ? trimmed : null;
}

export function ProfileForm({ profile, onSaved }: ProfileFormProps) {
  const titleId = useId();
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(profile));
  const { saving, saved, fieldErrors, message, save, clearField } = useSaveProfile(profile, onSaved);
  const changed = hasProfileChanges(draft, profile);

  const update = (field: ProfileField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    clearField(field);
  };

  const handleChange = (field: ProfileField) => (event: ChangeEvent<HTMLInputElement>) => {
    update(field, event.target.value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save(draft);
  };

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <Typography id={titleId} component="h2" variant="h6">
        {FORM_COPY.title}
      </Typography>
      <form className={cx(styles.form)} noValidate onSubmit={handleSubmit} aria-labelledby={titleId}>
        <div className={cx(styles.avatarRow)}>
          <ProfileAvatar src={previewSource(draft.image)} name={draft.name || profile.name} email={profile.email} label={FORM_COPY.preview} />
          <Button
            variant="outlined"
            onClick={() => update("image", "")}
            disabled={saving || draft.image.trim() === ""}
          >
            {FORM_COPY.removeImage}
          </Button>
        </div>
        <TextField
          id="profile-name"
          label={FORM_COPY.name}
          name="name"
          autoComplete="name"
          required
          fullWidth
          value={draft.name}
          onChange={handleChange("name")}
          error={Boolean(fieldErrors.name)}
          helperText={fieldErrors.name ?? " "}
          disabled={saving}
        />
        <TextField
          id="profile-image"
          label={FORM_COPY.image}
          name="image"
          type="url"
          autoComplete="photo"
          fullWidth
          value={draft.image}
          onChange={handleChange("image")}
          error={Boolean(fieldErrors.image)}
          helperText={fieldErrors.image ?? FORM_COPY.imageHint}
          disabled={saving}
        />
        {message ? <Alert severity="error">{message}</Alert> : null}
        {saved ? <Alert severity="success" role="status">{FORM_COPY.saved}</Alert> : null}
        <div className={cx(styles.actions)}>
          <Button type="submit" variant="contained" disabled={saving || !changed}>
            {saving ? FORM_COPY.saving : FORM_COPY.submit}
          </Button>
        </div>
      </form>
    </section>
  );
}
