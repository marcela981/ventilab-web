/*
* Funcionalidad: AdminResearchPage
* Descripción: Page /admin/research (ADMIN): explains what the anonymized research export contains and what it leaves out, as built by ventylab-server (analytics ExportResearchDatasetUseCase, buildResearchRows, RESEARCH_CSV_COLUMNS, HmacPseudonymizer): a long-format CSV with the columns participant, group, domain, item, metric and value, user and group ids replaced by HMAC-SHA256 with the server key, and the progress, grades, simulation, AI telemetry and AI ratings metrics. An optional student group (`GET /api/groups`) narrows the export; "Descargar CSV" downloads `GET /api/analytics/research/export.csv` (UTF-8 BOM for Excel). A 503 (no anonymization key) shows "La clave de anonimización no está configurada en el servidor". v1.1 (closure B2): "Descargar diccionario de datos" saves the columns of `GET /api/analytics/research/export/dictionary` (column, type, Spanish description, example) as a CSV through the shared download helper. Depends on MUI, next/head, React, the design-system components, the admin console hooks, entities, service and CSS Module.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import DownloadIcon from "@mui/icons-material/Download";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Head from "next/head";
import { useState } from "react";
import { toApiError } from "@shared/api-client/api-error";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { PageHeader } from "@shared/design-system/components/page-header";
import { cx } from "@shared/lib/class-names";
import { downloadResearchDictionary, exportResearchCsv } from "../../api/services/admin-operations.service";
import { getAdminConsoleErrorMessage, RESEARCH_EXPORT_NOT_CONFIGURED_MESSAGE } from "../entities/admin-console-error-messages";
import { useAdminGroups } from "../hooks/use-admin-groups";
import { useCsvExport } from "../hooks/use-csv-export";
import styles from "../../UI/admin-operations.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const ADMIN_RESEARCH_COPY = {
  documentTitle: "Exportación para investigación | VentyLab",
  title: "Exportación para investigación",
  subtitle: "Datos de aprendizaje anonimizados para el análisis de la tesis, generados por el servidor.",
  containsTitle: "Qué contiene",
  format: "Un CSV en formato largo: una fila por medida, con las columnas participant, group, domain, item, metric y value.",
  pseudonyms: "participant y group son seudónimos: el identificador del usuario y el de su grupo pasan por HMAC-SHA256 con la clave del servidor. La misma clave da el mismo seudónimo en cada exportación, así que se pueden cruzar exportaciones, pero no se puede recuperar el identificador original.",
  oneGroup: "Un estudiante que está en varios grupos aparece una sola vez, bajo el primero de sus grupos.",
  domainsTitle: "Dominios y medidas (columna domain → metric):",
  domains: [
    "progress: porcentaje de avance general (item overall) y por sección (item = id de la sección del currículo).",
    "grades: cada calificación publicada (metric grade); el id de la evaluación también va seudonimizado.",
    "simulation: número de sesiones (session_count) y, si existen, puntaje promedio (average_score) y tiempo promedio de estabilización en segundos (average_time_to_stabilize_s).",
    "ai_telemetry: por caso de uso, llamadas (calls), tokens de entrada y salida (input_tokens, output_tokens) y latencia promedio en ms (average_latency_ms).",
    "ai_ratings: por caso de uso, número de calificaciones (ratings), tasa de útil entre 0 y 1 (helpful_rate) y la media de cada dimensión QUEST respondida (quality_mean, understanding_mean, trust_mean, expression_mean, safety_mean).",
  ],
  excludesTitle: "Qué NO contiene",
  excludes: [
    "Nombres, correos ni códigos de estudiante.",
    "Identificadores de usuarios, grupos o evaluaciones en claro.",
    "Textos de notas personales, conversaciones con la IA ni comentarios de las calificaciones.",
    "Uso del ventilador físico.",
  ],
  group: "Grupo",
  allGroups: "Todos los grupos de estudiantes",
  groupsError: "No se pudieron cargar los grupos; puedes exportar todos.",
  download: "Descargar CSV",
  file: "investigacion-anonimizada.csv",
  dictionary: "Descargar diccionario de datos",
  dictionaryFile: "diccionario-datos-investigacion.csv",
  dictionaryNote: "El diccionario de datos lista cada columna del CSV con su tipo, su descripción y un ejemplo, tal como los define el servidor.",
} as const;

function researchErrorMessage(error: unknown): string {
  return toApiError(error).status === 503 ? RESEARCH_EXPORT_NOT_CONFIGURED_MESSAGE : getAdminConsoleErrorMessage(error);
}

export function AdminResearchPage() {
  const { groups, error: groupsError } = useAdminGroups();
  const csv = useCsvExport(researchErrorMessage);
  const dictionary = useCsvExport();
  const [groupId, setGroupId] = useState("");
  const studentGroups = (groups ?? []).filter((group) => group.type === "STUDENT");

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{ADMIN_RESEARCH_COPY.documentTitle}</title>
      </Head>
      <PageHeader title={ADMIN_RESEARCH_COPY.title} subtitle={ADMIN_RESEARCH_COPY.subtitle} />
      <div className={cx(styles.content)}>
        <section className={cx(styles.section)} aria-labelledby="research-contains">
          <h2 id="research-contains" className={cx(styles.sectionTitle)}>{ADMIN_RESEARCH_COPY.containsTitle}</h2>
          <p className={cx(styles.note)}>{ADMIN_RESEARCH_COPY.format}</p>
          <p className={cx(styles.note)}>{ADMIN_RESEARCH_COPY.pseudonyms}</p>
          <p className={cx(styles.note)}>{ADMIN_RESEARCH_COPY.oneGroup}</p>
          <p className={cx(styles.note)}>{ADMIN_RESEARCH_COPY.domainsTitle}</p>
          <ul className={cx(styles.list)}>
            {ADMIN_RESEARCH_COPY.domains.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className={cx(styles.section)} aria-labelledby="research-excludes">
          <h2 id="research-excludes" className={cx(styles.sectionTitle)}>{ADMIN_RESEARCH_COPY.excludesTitle}</h2>
          <ul className={cx(styles.list)}>
            {ADMIN_RESEARCH_COPY.excludes.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <div className={cx(styles.filters)}>
          <TextField size="small" select label={ADMIN_RESEARCH_COPY.group} value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            <MenuItem value="">{ADMIN_RESEARCH_COPY.allGroups}</MenuItem>
            {studentGroups.map((group) => <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>)}
          </TextField>
          <div className={cx(styles.filterActions)}>
            <AsyncButton
              variant="contained"
              startIcon={<DownloadIcon />}
              loading={csv.exporting}
              onClick={() => csv.run(() => exportResearchCsv(groupId || null), ADMIN_RESEARCH_COPY.file)}
            >
              {ADMIN_RESEARCH_COPY.download}
            </AsyncButton>
            <AsyncButton
              variant="outlined"
              startIcon={<DownloadIcon />}
              loading={dictionary.exporting}
              onClick={() => dictionary.run(async() => ({ file: await downloadResearchDictionary(), truncated: false }), ADMIN_RESEARCH_COPY.dictionaryFile)}
            >
              {ADMIN_RESEARCH_COPY.dictionary}
            </AsyncButton>
          </div>
        </div>
        <p className={cx(styles.note)}>{ADMIN_RESEARCH_COPY.dictionaryNote}</p>
        {groupsError ? <Alert severity="info">{ADMIN_RESEARCH_COPY.groupsError}</Alert> : null}
        {csv.error ? <Alert severity="error">{researchErrorMessage(csv.error)}</Alert> : null}
      </div>
    </div>
  );
}
