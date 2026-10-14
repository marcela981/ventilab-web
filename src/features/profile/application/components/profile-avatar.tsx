/*
* Funcionalidad: ProfileAvatar
* Descripción: Avatar preview of the profile page: shows the image at `src` (MUI Avatar, which falls back to its children when the image fails to load) and the user's initials otherwise; exposed as one labelled image (role="img") so screen readers announce it once. Depends on MUI Avatar, the profile entity and UI/profile-avatar.module.css.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Avatar from "@mui/material/Avatar";
import { cx } from "@shared/lib/class-names";
import { getInitials } from "../entities/profile.entity";
import styles from "../../UI/profile-avatar.module.css";

export type ProfileAvatarProps = {
  src: string | null
  name: string | null
  email: string
  label: string
};

export function ProfileAvatar({ src, name, email, label }: ProfileAvatarProps) {
  const imageProps = src ? { src, alt: "" } : {};

  return (
    <Avatar {...imageProps} role="img" aria-label={label} className={cx(styles.avatar)}>
      {getInitials(name, email)}
    </Avatar>
  );
}
