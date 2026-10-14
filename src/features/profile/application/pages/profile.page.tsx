/*
* Funcionalidad: ProfilePage
* Descripción: Own-profile page of the backend session (rendered inside StudentLayout, i.e. RequireAuth + AppShell, by the thin route pages/profile): page header, the read-only account data (email, role indicator, status) and the edit form (name and avatar URL). Loads `GET /api/users/me` with a loading state and an error state with retry. Spanish copy, TODO(i18n). Depends on next/head, @shared/design-system and the profile hooks/components.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Head from "next/head";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { cx } from "@shared/lib/class-names";
import { ProfileAccountInfo } from "../components/profile-account-info";
import { ProfileForm } from "../components/profile-form";
import { useProfile } from "../hooks/use-profile";
import styles from "../../UI/profile-page.module.css";

// TODO(i18n): move to a profile namespace in src/i18n.
const PAGE_COPY = {
  documentTitle: "Mi perfil | VentyLab",
  title: "Mi perfil",
  subtitle: "Revisa los datos de tu cuenta y actualiza tu nombre y tu foto.",
  loading: "Cargando tu perfil…",
  loadErrorTitle: "No se pudo cargar tu perfil",
  loadErrorDescription: "Revisa tu conexión e inténtalo de nuevo.",
} as const;

export function ProfilePage() {
  const { profile, isLoading, error, reload } = useProfile();

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{PAGE_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={PAGE_COPY.title} subtitle={PAGE_COPY.subtitle} />
      {profile ? (
        <div className={cx(styles.content)}>
          <ProfileForm key={profile.id} profile={profile} onSaved={reload} />
          <ProfileAccountInfo profile={profile} />
        </div>
      ) : null}
      {!profile && isLoading ? <LoadingState label={PAGE_COPY.loading} /> : null}
      {!profile && !isLoading && error ? (
        <ErrorState title={PAGE_COPY.loadErrorTitle} description={PAGE_COPY.loadErrorDescription} onRetry={() => void reload()} />
      ) : null}
    </div>
  );
}
