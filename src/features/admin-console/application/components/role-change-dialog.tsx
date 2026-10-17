/*
* Funcionalidad: RoleChangeDialog
* Descripción: Dialog of "Cambiar rol" in /admin/users: role select (the current role preselected; confirming needs a different one) and a warning listing what the backend does on a change (leaving STUDENT removes the student groups, becoming STUDENT removes the teacher groups, the open sessions are closed and refreshed with the new role, and a ROLE_CHANGED notification is sent). A failure stays inside the dialog with the mapped message (superadmin 403 → "Esta cuenta está protegida (superadministrador) y no se puede modificar."). Depends on MUI, the design-system async button and form field and the admin console config, entities and CSS Module.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useId, useState } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { FormField } from "@shared/design-system/components/form-field";
import { cx } from "@shared/lib/class-names";
import { ROLE_LABELS, USER_ROLES } from "../config/admin-console.config";
import type { UserRole } from "../config/admin-console.config";
import { getAdminConsoleErrorMessage } from "../entities/admin-console-error-messages";
import { roleChangeEffects } from "../entities/admin-users.entity";
import type { AdminUserRow } from "../entities/admin-users.entity";
import styles from "../../UI/admin-users.module.css";

// TODO(i18n): move to an admin-console namespace in src/i18n.
export const ROLE_DIALOG_COPY = {
  title: (name: string) => `Cambiar el rol de ${name}`,
  current: (role: string) => `Rol actual: ${role}.`,
  role: "Nuevo rol",
  sameRole: "Elige un rol distinto del actual.",
  warningTitle: "Al cambiar el rol:",
  cancel: "Cancelar",
  confirm: "Cambiar rol",
} as const;

const NATIVE_SELECT = { select: { native: true }, inputLabel: { shrink: true } } as const;

export type RoleChangeDialogProps = {
  user: AdminUserRow | null
  onConfirm: (user: AdminUserRow, role: UserRole) => Promise<void>
  onClose: () => void
};

type RoleChangeFormProps = {
  user: AdminUserRow
  onConfirm: RoleChangeDialogProps["onConfirm"]
  onClose: () => void
  titleId: string
};

function RoleChangeForm({ user, onConfirm, onClose, titleId }: RoleChangeFormProps) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const effects = roleChangeEffects(user.role, role);
  const name = user.name?.trim() || user.email;

  const confirm = async() => {
    setPending(true);
    setError(null);

    try {
      await onConfirm(user, role);
    } catch (caught) {
      setError(getAdminConsoleErrorMessage(caught));
      setPending(false);
    }
  };

  return (
    <>
      <DialogTitle id={titleId}>{ROLE_DIALOG_COPY.title(name)}</DialogTitle>
      <DialogContent>
        <div className={cx(styles.dialogBody)}>
          <p className={cx(styles.secondary)}>{ROLE_DIALOG_COPY.current(ROLE_LABELS[user.role])}</p>
          <FormField
            select
            label={ROLE_DIALOG_COPY.role}
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            slotProps={NATIVE_SELECT}
            helperText={role === user.role ? ROLE_DIALOG_COPY.sameRole : undefined}
          >
            {USER_ROLES.map((option) => <option key={option} value={option}>{ROLE_LABELS[option]}</option>)}
          </FormField>
          {effects.length > 0 ? (
            <Alert severity="warning">
              <AlertTitle>{ROLE_DIALOG_COPY.warningTitle}</AlertTitle>
              <ul className={cx(styles.effects)}>
                {effects.map((effect) => <li key={effect}>{effect}</li>)}
              </ul>
            </Alert>
          ) : null}
          {error ? <Alert severity="error" role="alert">{error}</Alert> : null}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pending}>{ROLE_DIALOG_COPY.cancel}</Button>
        <AsyncButton variant="contained" loading={pending} disabled={role === user.role} onClick={confirm}>
          {ROLE_DIALOG_COPY.confirm}
        </AsyncButton>
      </DialogActions>
    </>
  );
}

export function RoleChangeDialog({ user, onConfirm, onClose }: RoleChangeDialogProps) {
  const titleId = useId();

  return (
    <Dialog open={user !== null} onClose={onClose} aria-labelledby={titleId} fullWidth maxWidth="sm">
      {user ? <RoleChangeForm key={user.id} user={user} onConfirm={onConfirm} onClose={onClose} titleId={titleId} /> : null}
    </Dialog>
  );
}
