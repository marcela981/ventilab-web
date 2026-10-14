/*
* Funcionalidad: GoogleSignInButton
* Descripción: Google sign-in block of the login page: the official Google Identity Services button rendered into a container (useGoogleIdentity), a loading note while the script loads, and accessible fallbacks: a disabled "Continuar con Google" button with an explanation when NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing, or an error note when the script cannot load. While a login is pending the container is inert. Spanish copy, TODO(i18n). Depends on MUI, the GIS hook and UI/google-sign-in.module.css.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import GoogleIcon from "@mui/icons-material/Google";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useId, useRef } from "react";
import { cx } from "@shared/lib/class-names";
import { useGoogleIdentity } from "../hooks/use-google-identity";
import styles from "../../UI/google-sign-in.module.css";

export type GoogleSignInButtonProps = {
  clientId: string
  pending: boolean
  onCredential: (idToken: string) => void
};

// TODO(i18n): move to an auth namespace in src/i18n.
const GOOGLE_COPY = {
  label: "Continuar con Google",
  loading: "Cargando inicio de sesión con Google…",
  unconfigured: "El inicio de sesión con Google no está configurado en este entorno.",
  error: "No se pudo cargar el inicio de sesión con Google. Revisa tu conexión y recarga la página.",
} as const;

export function GoogleSignInButton({ clientId, pending, onCredential }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const noteId = useId();
  const status = useGoogleIdentity({ clientId, containerRef, onCredential });

  if (status === "unconfigured" || status === "error") {
    return (
      <div className={cx(styles.root)}>
        <Button
          variant="outlined"
          size="large"
          fullWidth
          disabled
          startIcon={<GoogleIcon aria-hidden="true" />}
          aria-describedby={noteId}
        >
          {GOOGLE_COPY.label}
        </Button>
        <Typography id={noteId} variant="body2" className={cx(styles.note)}>
          {status === "unconfigured" ? GOOGLE_COPY.unconfigured : GOOGLE_COPY.error}
        </Typography>
      </div>
    );
  }

  return (
    <div className={cx(styles.root)} aria-busy={status === "loading" || pending}>
      <div ref={containerRef} className={cx(styles.button, pending && styles.inert)} inert={pending} />
      {status === "loading" ? (
        <Typography variant="body2" role="status" className={cx(styles.note)}>
          {GOOGLE_COPY.loading}
        </Typography>
      ) : null}
    </div>
  );
}
