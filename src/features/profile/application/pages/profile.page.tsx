/*
* Funcionalidad: ProfilePage
* Descripción: Own-profile page of the backend session (rendered inside StudentLayout, i.e. RequireAuth + AppShell, by the thin route pages/profile). Two URL-owned tabs (julio structure, `/profile?tab=info|password`, shallow replace through useUrlTab): "Información personal" (photo upload/removal and name form next to the read-only account data) and "Cambiar contraseña" (ChangePasswordForm, or the Google notice for accounts without a password). Loads `GET /api/users/me` with a loading state and an error state with retry. Tabs have ids `profile-tab-<tab>` and panels `profile-tabpanel-<tab>`; panels stay mounted (hidden) so a half-typed password survives a tab switch. v1.1 (Bloque 4, W7): tabs and change password. Spanish copy, TODO(i18n). Depends on next/head, MUI Tabs, @shared/design-system, @shared/lib/use-url-tab and the profile hooks/components.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Head from "next/head";
import type { ReactElement } from "react";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { cx } from "@shared/lib/class-names";
import { useUrlTab } from "@shared/lib/use-url-tab";
import { ChangePasswordForm } from "../components/change-password-form";
import { ProfileAccountInfo } from "../components/profile-account-info";
import { ProfileForm } from "../components/profile-form";
import { useProfile } from "../hooks/use-profile";
import styles from "../../UI/profile-page.module.css";

export const PROFILE_TABS = ["info", "password"] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

// TODO(i18n): move to a profile namespace in src/i18n.
const PAGE_COPY = {
  documentTitle: "Mi perfil | VentyLab",
  title: "Mi perfil",
  subtitle: "Revisa los datos de tu cuenta, actualiza tu nombre y tu foto o cambia tu contraseña.",
  tabs: "Secciones del perfil",
  loading: "Cargando tu perfil…",
  loadErrorTitle: "No se pudo cargar tu perfil",
  loadErrorDescription: "Revisa tu conexión e inténtalo de nuevo.",
} as const;

const TAB_LABELS: Record<ProfileTab, string> = {
  info: "Información personal",
  password: "Cambiar contraseña",
};

const TAB_ICONS: Record<ProfileTab, ReactElement> = {
  info: <PersonIcon />,
  password: <LockIcon />,
};

const tabId = (tab: ProfileTab): string => `profile-tab-${tab}`;

const panelId = (tab: ProfileTab): string => `profile-tabpanel-${tab}`;

export function ProfilePage() {
  const { profile, isLoading, error, reload } = useProfile();
  const { tab, selectTab } = useUrlTab(PROFILE_TABS, "info");

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{PAGE_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={PAGE_COPY.title} subtitle={PAGE_COPY.subtitle} />
      {profile ? (
        <>
          <Tabs
            value={tab ?? false}
            onChange={(_event, next: ProfileTab) => selectTab(next)}
            aria-label={PAGE_COPY.tabs}
            variant="scrollable"
            scrollButtons="auto"
            className={cx(styles.tabs)}
          >
            {PROFILE_TABS.map((key) => (
              <Tab
                key={key}
                value={key}
                label={TAB_LABELS[key]}
                icon={TAB_ICONS[key]}
                iconPosition="start"
                id={tabId(key)}
                aria-controls={panelId(key)}
              />
            ))}
          </Tabs>
          <section id={panelId("info")} role="tabpanel" aria-labelledby={tabId("info")} hidden={tab !== "info"}>
            <div className={cx(styles.content)}>
              <ProfileForm key={profile.id} profile={profile} onSaved={reload} />
              <ProfileAccountInfo profile={profile} />
            </div>
          </section>
          <section id={panelId("password")} role="tabpanel" aria-labelledby={tabId("password")} hidden={tab !== "password"}>
            <div className={cx(styles.narrow)}>
              <ChangePasswordForm hasPassword={profile.hasPassword} />
            </div>
          </section>
        </>
      ) : null}
      {!profile && isLoading ? <LoadingState label={PAGE_COPY.loading} /> : null}
      {!profile && !isLoading && error ? (
        <ErrorState title={PAGE_COPY.loadErrorTitle} description={PAGE_COPY.loadErrorDescription} onRetry={() => void reload()} />
      ) : null}
    </div>
  );
}
