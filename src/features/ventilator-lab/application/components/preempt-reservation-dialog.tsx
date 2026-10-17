/*
* Funcionalidad: Preempt reservation dialog
* Descripción: Staff alert dialog opened when a booking overlaps reservations the caller may preempt (409 reservations.conflict_preemptable): it lists each overlapping reservation exactly as the backend returned it to staff (holder name and identifier, or the group, and the Bogota window), lets the caller choose who holds the new reservation ("Asignarme a mí", "Asignar a un grupo" with the groups of useHolderOptions, or the user of the original request for an admin) and, on "Desplazar y reservar", resends the same window and purpose with confirmPreempt (the backend preempts every overlapping reservation in the same transaction and notifies their holders). Cancel sends nothing. A failure stays open with its Spanish message (for example, only an admin can preempt a teacher's reservation). v1.1 (T3 review fix): no exact preempted count in the copy (the backend preempts every overlap at confirm time) and `onPreempting` announces the caller's own preemption before the request. v1.2 (T6 review fix S1): documents why a conflict without a reservation id is not suppressed. Depends on MUI, the design-system AsyncButton, the holder and create hooks, the lab entities and the CSS Module.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import TextField from "@mui/material/TextField";
import { useId, useState } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { cx } from "@shared/lib/class-names";
import { reservationEnd, SELF_HOLDER } from "../entities/create-reservation.entity";
import type {
  CreateReservationRequest,
  HolderKind,
  HolderOption,
  ReservationConflict,
  ReservationConflictItem,
} from "../entities/create-reservation.entity";
import { getCreateReservationFailureMessage } from "../entities/lab-error-messages";
import type { LabSettings } from "../entities/lab-settings.entity";
import { groupHolderLabel } from "../entities/reservation.entity";
import { slotWindowLabel } from "../entities/slot-grid";
import { useCreateReservation } from "../hooks/use-create-reservation";
import { useHolderOptions } from "../hooks/use-holder-options";
import styles from "../../UI/lab-reservations.module.css";

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const PREEMPT_RESERVATION_COPY = {
  title: "Desplazar reservas",
  // No exact count: the backend preempts every reservation overlapping at confirm time, which may differ from this list.
  description: (window: string) =>
    `La franja ${window} se solapa con las reservas de abajo. Si confirmas, se desplazarán todas las reservas en conflicto en ese momento y sus titulares recibirán un aviso.`,
  conflictsLabel: "Reservas que se desplazarán",
  unknownHolder: "Titular no disponible",
  holderLabel: "¿A quién se asigna la nueva reserva?",
  self: "Asignarme a mí",
  group: "Asignar a un grupo",
  user: (label: string) => `Asignar a ${label}`,
  groupField: "Grupo",
  cancel: "Cancelar",
  confirm: "Desplazar y reservar",
} as const;

export type PreemptReservationDialogProps = {
  open: boolean
  conflict: ReservationConflict
  /** The booking that got the 409; its window and purpose are resent. */
  request: CreateReservationRequest
  settings: LabSettings
  onClose: () => void
  /** Called once the reservation was created over the conflicting ones. */
  onCreated: () => void
  /**
   * Called right before the confirm request with the ids of the listed conflicts (the caller's own preemption, see
   * usePreemptionNotice); the returned undo runs when the request fails.
   */
  onPreempting?: (reservationIds: readonly string[]) => () => void
};

function conflictHolder(item: ReservationConflictItem): string {
  if (item.holderType === "GROUP") {
    const group = item.groupName ?? item.holderName;

    return group ? groupHolderLabel(group) : PREEMPT_RESERVATION_COPY.unknownHolder;
  }

  return item.holderName ?? PREEMPT_RESERVATION_COPY.unknownHolder;
}

function ConflictRow({ item }: { item: ReservationConflictItem }) {
  return (
    <li className={cx(styles.conflictItem)}>
      <span className={cx(styles.conflictHolder)}>{conflictHolder(item)}</span>
      {item.holderType !== "GROUP" && item.holderIdentifier ? (
        <span className={cx(styles.muted)}>{item.holderIdentifier}</span>
      ) : null}
      {item.holderType !== "GROUP" && item.groupName ? (
        <span className={cx(styles.muted)}>{groupHolderLabel(item.groupName)}</span>
      ) : null}
      <span className={cx(styles.muted)}>{slotWindowLabel(new Date(item.startsAt), new Date(item.endsAt))}</span>
    </li>
  );
}

export function PreemptReservationDialog({
  open,
  conflict,
  request,
  settings,
  onClose,
  onCreated,
  onPreempting,
}: PreemptReservationDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const holderLabelId = useId();
  const holders = useHolderOptions(open);
  const { submit, isSubmitting } = useCreateReservation();
  const [kind, setKind] = useState<HolderKind>(request.holder.kind);
  const [groupId, setGroupId] = useState(request.holder.groupId ?? "");
  const [error, setError] = useState<string | null>(null);
  const originalGroup = request.holder.kind === "group" && request.holder.groupId === groupId ? request.holder : null;
  const group = holders.groups.find((option) => option.key === groupId) ?? originalGroup;
  const holder: HolderOption | null = kind === "self" ? SELF_HOLDER : kind === "group" ? group : request.holder;
  const windowLabel = slotWindowLabel(request.startsAt, reservationEnd(request));

  const handleConfirm = async() => {
    if (!holder) {
      return;
    }

    setError(null);
    // A conflict without a reservation id cannot be matched with the later `reservation:preempted` event (keyed by
    // reservationId), so it is not suppressed: wrongly telling the caller about their own preemption is harmless,
    // while suppressing by any other key (window, holder) could hide the notice of an unrelated reservation.
    const ids = conflict.conflicts.flatMap((item) => (item.reservationId ? [item.reservationId] : []));
    const undo = onPreempting?.(ids);
    const outcome = await submit({ ...request, holder, confirmPreempt: true });

    if (outcome.kind === "created") {
      onCreated();

      return;
    }

    undo?.();
    setError(getCreateReservationFailureMessage(outcome.error, outcome.conflict, settings));
  };

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      slotProps={{ paper: { role: "alertdialog" } }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle id={titleId}>{PREEMPT_RESERVATION_COPY.title}</DialogTitle>
      <DialogContent>
        <div className={cx(styles.dialogBody)}>
          <p id={descriptionId}>{PREEMPT_RESERVATION_COPY.description(windowLabel)}</p>
          <ul className={cx(styles.conflictList)} aria-label={PREEMPT_RESERVATION_COPY.conflictsLabel}>
            {conflict.conflicts.map((item, index) => (
              <ConflictRow key={item.reservationId ?? `${item.startsAt}-${index}`} item={item} />
            ))}
          </ul>

          <FormControl disabled={isSubmitting}>
            <FormLabel id={holderLabelId}>{PREEMPT_RESERVATION_COPY.holderLabel}</FormLabel>
            <RadioGroup aria-labelledby={holderLabelId} value={kind} onChange={(_event, value) => setKind(value as HolderKind)}>
              <FormControlLabel value="self" control={<Radio />} label={PREEMPT_RESERVATION_COPY.self} />
              {holders.groups.length > 0 ? (
                <FormControlLabel value="group" control={<Radio />} label={PREEMPT_RESERVATION_COPY.group} />
              ) : null}
              {request.holder.kind === "user" ? (
                <FormControlLabel value="user" control={<Radio />} label={PREEMPT_RESERVATION_COPY.user(request.holder.label)} />
              ) : null}
            </RadioGroup>
          </FormControl>

          {kind === "group" && holders.groups.length > 0 ? (
            <TextField
              select
              label={PREEMPT_RESERVATION_COPY.groupField}
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              disabled={isSubmitting}
              required
            >
              {holders.groups.map((option) => (
                <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>
              ))}
            </TextField>
          ) : null}

          {error ? <Alert severity="error">{error}</Alert> : null}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>{PREEMPT_RESERVATION_COPY.cancel}</Button>
        <AsyncButton variant="contained" color="warning" onClick={handleConfirm} loading={isSubmitting} disabled={!holder}>
          {PREEMPT_RESERVATION_COPY.confirm}
        </AsyncButton>
      </DialogActions>
    </Dialog>
  );
}
