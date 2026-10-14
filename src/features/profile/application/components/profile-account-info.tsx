/*
* Funcionalidad: ProfileAccountInfo
* Descripción: Read-only account data of the profile page, as a labelled region ("Datos de la cuenta") with a description list: email, role (chip with an icon per role, the visual role indicator) and account status (active/inactive chip with an icon). Chips keep the default text color: the theme's primary/success text fails WCAG AA on white (T2 report). None of these can be edited by the user (PATCH /api/users/me only accepts name and image). Spanish copy, TODO(i18n). Depends on MUI Chip/Typography, MUI icons, the profile entity and UI/profile-account-info.module.css.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CoPresentIcon from "@mui/icons-material/CoPresent";
import SchoolIcon from "@mui/icons-material/School";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { useId } from "react";
import type { ReactElement } from "react";
import type { Role } from "@shared/session";
import { cx } from "@shared/lib/class-names";
import { ROLE_LABELS } from "../entities/profile.entity";
import type { Profile } from "../entities/profile.entity";
import styles from "../../UI/profile-account-info.module.css";

const ROLE_ICONS: Record<Role, ReactElement> = {
  STUDENT: <SchoolIcon />,
  TEACHER: <CoPresentIcon />,
  ADMIN: <AdminPanelSettingsIcon />,
};

// TODO(i18n): move to a profile namespace in src/i18n.
const ACCOUNT_COPY = {
  title: "Datos de la cuenta",
  hint: "Estos datos los administra VentyLab y no se pueden editar aquí.",
  email: "Correo electrónico",
  role: "Rol",
  status: "Estado de la cuenta",
  active: "Activa",
  inactive: "Inactiva",
} as const;

export type ProfileAccountInfoProps = {
  profile: Profile
};

export function ProfileAccountInfo({ profile }: ProfileAccountInfoProps) {
  const titleId = useId();

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <Typography id={titleId} component="h2" variant="h6">
        {ACCOUNT_COPY.title}
      </Typography>
      <Typography variant="body2" className={cx(styles.hint)}>
        {ACCOUNT_COPY.hint}
      </Typography>
      <dl className={cx(styles.list)}>
        <div className={cx(styles.item)}>
          <dt className={cx(styles.term)}>{ACCOUNT_COPY.email}</dt>
          <dd className={cx(styles.value)}>{profile.email}</dd>
        </div>
        <div className={cx(styles.item)}>
          <dt className={cx(styles.term)}>{ACCOUNT_COPY.role}</dt>
          <dd className={cx(styles.value)}>
            <Chip icon={ROLE_ICONS[profile.role]} label={ROLE_LABELS[profile.role]} variant="outlined" />
          </dd>
        </div>
        <div className={cx(styles.item)}>
          <dt className={cx(styles.term)}>{ACCOUNT_COPY.status}</dt>
          <dd className={cx(styles.value)}>
            <Chip
              icon={profile.isActive ? <CheckCircleOutlineIcon /> : <BlockIcon />}
              label={profile.isActive ? ACCOUNT_COPY.active : ACCOUNT_COPY.inactive}
              variant="outlined"
            />
          </dd>
        </div>
      </dl>
    </section>
  );
}
