/*
* Funcionalidad: ApiContractBanner
* Descripción: Discreet warning (MUI Alert, severity warning) at the top of the main region of the AppShell and the PanelShell, shown only to ADMIN users when the server does not match the API contract the web expects: `GET /api/version` answered 404 (server older than the endpoint), failed, or reported a contract other than REQUIRED_API_CONTRACT. Non-admins never request the version. Depends on MUI, the session, the API version hook and contract check, and its CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import { contractBannerMessage, shouldShowContractBanner } from "@shared/api-client/version/api-contract";
import { useApiVersion } from "@shared/api-client/version/use-api-version";
import { cx } from "@shared/lib/class-names";
import { useSession } from "@shared/session/use-session";
import styles from "./UI/api-contract-banner.module.css";

export function ApiContractBanner() {
  const { role } = useSession();
  const isAdmin = role === "ADMIN";
  const { check } = useApiVersion(isAdmin);
  const message = shouldShowContractBanner(role, check) ? contractBannerMessage(check) : null;

  if (!message) {
    return null;
  }

  return (
    <Alert severity="warning" variant="outlined" role="status" className={cx(styles.banner)}>
      {message}
    </Alert>
  );
}
