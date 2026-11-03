/*
* Funcionalidad: ProfileForm
* Descripción: "Información personal" card of the own profile: the photo block (AvatarUploader: upload from the device and remove) and the name form with client validation (`noValidate`, entity validation + design-system FormField error text), backend field errors, one error alert and a success notice. "Guardar cambios" (AsyncButton) is disabled while the name is unchanged or a save is running. v1.1 (T6b): FormField + AsyncButton adopted; v1.2 (T12): description updated; v1.3 (Bloque 4, W7): the avatar URL field is replaced by the device upload (AvatarUploader). Spanish copy, TODO(i18n). Depends on MUI, @shared/design-system, the profile hooks/entities, AvatarUploader and UI/profile-form.module.css.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { useId, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { hasProfileChanges } from "../../api/mappers/profile.mapper";
import { toDraft } from "../entities/profile.entity";
import type { Profile, ProfileDraft } from "../entities/profile.entity";
import { useSaveProfile } from "../hooks/use-save-profile";
import { AvatarUploader } from "./avatar-uploader";
import styles from "../../UI/profile-form.module.css";

// TODO(i18n): move to a profile namespace in src/i18n.
const FORM_COPY = {
  title: "Información personal",
  name: "Nombre",
  submit: "Guardar cambios",
  saved: "Perfil actualizado.",
} as const;

export type ProfileFormProps = {
  profile: Profile
  onSaved: () => Promise<void>
};

export function ProfileForm({ profile, onSaved }: ProfileFormProps) {
  const titleId = useId();
  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(profile));
  const { saving, saved, fieldErrors, message, save, clearField } = useSaveProfile(profile, onSaved);
  const changed = hasProfileChanges(draft, profile);

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft({ name: event.target.value });
    clearField("name");
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
      <AvatarUploader profile={profile} onChanged={onSaved} />
      <form className={cx(styles.form)} noValidate onSubmit={handleSubmit} aria-labelledby={titleId}>
        <FormField
          id="profile-name"
          label={FORM_COPY.name}
          name="name"
          autoComplete="name"
          required
          fullWidth
          value={draft.name}
          onChange={handleNameChange}
          error={fieldErrors.name}
          helperText=" "
          disabled={saving}
        />
        {message ? <Alert severity="error">{message}</Alert> : null}
        {saved ? <Alert severity="success" role="status">{FORM_COPY.saved}</Alert> : null}
        <div className={cx(styles.actions)}>
          <AsyncButton type="submit" variant="contained" loading={saving} disabled={!changed}>
            {FORM_COPY.submit}
          </AsyncButton>
        </div>
      </form>
    </section>
  );
}
