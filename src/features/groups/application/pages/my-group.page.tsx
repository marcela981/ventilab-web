/*
* Funcionalidad: MyGroupPage
* Descripción: Student page /my-group: reads `GET /api/groups/mine` and shows the student's active student group (leader, member names, supervising teacher groups), an empty state when the student has no group, a loading state and an error state with retry (Spanish message from the groups error mapping, 403 included). Read only. Depends on next/head, @shared/design-system components, the useMyGroup hook, MyGroupDetails and the groups CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import GroupWorkIcon from "@mui/icons-material/GroupWork";
import Head from "next/head";
import { EmptyState } from "@shared/design-system/components/empty-state";
import { ErrorState } from "@shared/design-system/components/error-state";
import { LoadingState } from "@shared/design-system/components/loading-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { cx } from "@shared/lib/class-names";
import { MyGroupDetails } from "../components/my-group-details";
import { getGroupErrorMessage } from "../entities/groups-error-messages";
import { useMyGroup } from "../hooks/use-my-group";
import styles from "../../UI/my-group.module.css";

// TODO(i18n): move to a groups namespace in src/i18n.
const PAGE_COPY = {
  documentTitle: "Mi grupo | VentyLab",
  title: "Mi grupo",
  subtitle: "Tu grupo de estudiantes, su líder y los grupos docentes que lo supervisan.",
  loading: "Cargando tu grupo…",
  emptyTitle: "Aún no perteneces a un grupo",
  emptyDescription: "Cuando tu docente te agregue a un grupo de estudiantes, lo verás aquí.",
  loadErrorTitle: "No se pudo cargar tu grupo",
} as const;

export function MyGroupPage() {
  const { myGroups, isLoading, error, reload } = useMyGroup();
  const studentGroup = myGroups?.studentGroup ?? null;

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{PAGE_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={PAGE_COPY.title} subtitle={PAGE_COPY.subtitle} />
      {studentGroup ? <MyGroupDetails group={studentGroup} /> : null}
      {myGroups && !studentGroup ? (
        <EmptyState icon={<GroupWorkIcon />} title={PAGE_COPY.emptyTitle} description={PAGE_COPY.emptyDescription} />
      ) : null}
      {!myGroups && isLoading ? <LoadingState label={PAGE_COPY.loading} /> : null}
      {!myGroups && !isLoading && error ? (
        <ErrorState title={PAGE_COPY.loadErrorTitle} description={getGroupErrorMessage(error)} onRetry={() => void reload()} />
      ) : null}
    </div>
  );
}
