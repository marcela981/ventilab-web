/*
* Funcionalidad: Create reservation dialog
* Descripción: Dialog opened from a free slot of the calendar to book the ventilator: the Bogota window (updated with the duration), the holder by role ("Para mí" always; "Para un grupo" with the groups the caller leads, supervises or, for an admin, any group; "Para otro usuario" with a user search for an admin), the duration (slot multiples allowed by the page: up to the maximum and before the next reservation), an optional purpose (max 500 characters) and "Reservar". A failure keeps the dialog open with the Spanish message of the backend code (upcoming limit, outside the window, slot in the past, overlap, forbidden holder...). A 409 overlap whose conflicts the caller may preempt is offered first to `onConflict` (the staff preemption flow plugs in there); when nobody handles it the overlap message is shown. v1.1 (T3): an overlap with a teacher's or admin's reservation that a teacher may not preempt says that only an admin can do it. v1.2 (T4 review fix W1): `durationsLoading` shows "Comprobando la disponibilidad…" instead of the no-time message while the page loads the limits. Depends on MUI, the design-system AsyncButton, the date format helper, the holder and create hooks, the lab entities and the CSS Module.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
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
import type { TextFieldProps } from "@mui/material/TextField";
import { useEffect, useId, useState } from "react";
import { AsyncButton } from "@shared/design-system/components/async-button";
import { cx } from "@shared/lib/class-names";
import { formatDuration } from "@shared/lib/format";
import { USER_SEARCH_MIN_LENGTH } from "../../api/services/holders.service";
import { MAX_PURPOSE_LENGTH, reservationEnd, SELF_HOLDER } from "../entities/create-reservation.entity";
import type { CreateReservationRequest, HolderKind, HolderOption, ReservationConflict } from "../entities/create-reservation.entity";
import { getCreateReservationFailureMessage } from "../entities/lab-error-messages";
import type { LabSettings } from "../entities/lab-settings.entity";
import { slotWindowLabel } from "../entities/slot-grid";
import { useCreateReservation } from "../hooks/use-create-reservation";
import { useHolderOptions, useUserHolderSearch } from "../hooks/use-holder-options";
import styles from "../../UI/lab-reservations.module.css";

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const CREATE_RESERVATION_COPY = {
  title: "Reservar el ventilador",
  holderLabel: "¿Para quién es la reserva?",
  self: "Para mí",
  selfOnly: "La reserva queda a tu nombre.",
  group: "Para un grupo",
  user: "Para otro usuario",
  groupField: "Grupo",
  userField: "Usuario",
  userHint: `Escribe al menos ${USER_SEARCH_MIN_LENGTH} caracteres del nombre o correo.`,
  userNoResults: "No hay usuarios que coincidan.",
  userLoading: "Buscando…",
  groupsError: "No se pudieron cargar los grupos; puedes reservar a tu nombre.",
  durationField: "Duración",
  noDuration: "No queda tiempo libre desde esta franja.",
  durationsLoading: "Comprobando la disponibilidad…",
  purposeField: "Propósito (opcional)",
  cancel: "Cancelar",
  submit: "Reservar",
} as const;

const SEARCH_DEBOUNCE_MS = 300;

// Stable callbacks: new identities on every render make the Autocomplete reset its input while unfocused.
const holderLabel = (option: HolderOption): string => option.label;
const holderKey = (option: HolderOption): string => option.key;
const sameHolder = (option: HolderOption, selected: HolderOption): boolean => option.key === selected.key;
const keepServerOrder = (options: HolderOption[]): HolderOption[] => options;

export type CreateReservationDialogProps = {
  open: boolean
  slotStart: Date | null
  /** Durations (minutes) the page allows from this slot. */
  durations: readonly number[]
  /** The page is still loading what limits the durations (shown instead of "no time left"). */
  durationsLoading?: boolean
  settings: LabSettings
  onClose: () => void
  onCreated: () => void
  /**
   * Staff preemption hook (T3): receives a 409 overlap the caller may preempt and the request that caused it; return
   * true when it takes over (the dialog then shows no error). Without it, or when it returns false, the overlap
   * message is shown.
   */
  onConflict?: (conflict: ReservationConflict, request: CreateReservationRequest) => boolean
};

function useDebounced(value: string): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value]);

  return debounced;
}

export function CreateReservationDialog({
  open,
  slotStart,
  durations,
  durationsLoading = false,
  settings,
  onClose,
  onCreated,
  onConflict,
}: CreateReservationDialogProps) {
  const titleId = useId();
  const holderLabelId = useId();
  const holders = useHolderOptions(open);
  const { submit, isSubmitting } = useCreateReservation();
  const [kind, setKind] = useState<HolderKind>("self");
  const [groupId, setGroupId] = useState("");
  const [user, setUser] = useState<HolderOption | null>(null);
  const [userTerm, setUserTerm] = useState("");
  const [duration, setDuration] = useState<number | null>(durations[0] ?? null);
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState<string | null>(null);
  const search = useUserHolderSearch(useDebounced(userTerm), open && kind === "user");
  const selectedDuration = duration !== null && durations.includes(duration) ? duration : durations[0] ?? null;
  const group = holders.groups.find((option) => option.key === groupId) ?? null;
  const holder = kind === "self" ? SELF_HOLDER : kind === "group" ? group : user;
  const canChoose = holders.groups.length > 0 || holders.canPickUser;
  const ready = slotStart !== null && holder !== null && selectedDuration !== null;

  const handleSubmit = async() => {
    if (!slotStart || !holder || selectedDuration === null) {
      return;
    }

    const request: CreateReservationRequest = { holder, startsAt: slotStart, durationMinutes: selectedDuration, purpose };

    setError(null);
    const outcome = await submit(request);

    if (outcome.kind === "created") {
      onCreated();

      return;
    }

    if (outcome.conflict?.preemptable && onConflict?.(outcome.conflict, request)) {
      return;
    }

    setError(getCreateReservationFailureMessage(outcome.error, outcome.conflict, settings));
  };

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} aria-labelledby={titleId} fullWidth maxWidth="sm">
      <DialogTitle id={titleId}>{CREATE_RESERVATION_COPY.title}</DialogTitle>
      <DialogContent>
        <div className={cx(styles.dialogBody)}>
          {slotStart ? (
            <p className={cx(styles.dialogWindow)}>
              {slotWindowLabel(slotStart, reservationEnd({ startsAt: slotStart, durationMinutes: selectedDuration ?? 0 }))}
            </p>
          ) : null}

          {canChoose ? (
            <FormControl disabled={isSubmitting}>
              <FormLabel id={holderLabelId}>{CREATE_RESERVATION_COPY.holderLabel}</FormLabel>
              <RadioGroup
                aria-labelledby={holderLabelId}
                value={kind}
                onChange={(_event, value) => setKind(value as HolderKind)}
              >
                <FormControlLabel value="self" control={<Radio />} label={CREATE_RESERVATION_COPY.self} />
                {holders.groups.length > 0 ? (
                  <FormControlLabel value="group" control={<Radio />} label={CREATE_RESERVATION_COPY.group} />
                ) : null}
                {holders.canPickUser ? (
                  <FormControlLabel value="user" control={<Radio />} label={CREATE_RESERVATION_COPY.user} />
                ) : null}
              </RadioGroup>
            </FormControl>
          ) : (
            <p className={cx(styles.muted)}>{CREATE_RESERVATION_COPY.selfOnly}</p>
          )}

          {holders.error ? <Alert severity="warning">{CREATE_RESERVATION_COPY.groupsError}</Alert> : null}

          {kind === "group" ? (
            <TextField
              select
              label={CREATE_RESERVATION_COPY.groupField}
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

          {kind === "user" ? (
            <Autocomplete
              options={search.options}
              value={user}
              onChange={(_event, next) => setUser(next)}
              inputValue={userTerm}
              onInputChange={(_event, next) => setUserTerm(next)}
              filterOptions={keepServerOrder}
              getOptionLabel={holderLabel}
              getOptionKey={holderKey}
              isOptionEqualToValue={sameHolder}
              loading={search.isLoading}
              loadingText={CREATE_RESERVATION_COPY.userLoading}
              noOptionsText={userTerm.trim().length < USER_SEARCH_MIN_LENGTH
                ? CREATE_RESERVATION_COPY.userHint
                : CREATE_RESERVATION_COPY.userNoResults}
              disabled={isSubmitting}
              renderInput={(params) => <TextField {...(params as TextFieldProps)} label={CREATE_RESERVATION_COPY.userField} required />}
            />
          ) : null}

          {durations.length > 0 ? (
            <TextField
              select
              label={CREATE_RESERVATION_COPY.durationField}
              value={selectedDuration ?? ""}
              onChange={(event) => setDuration(Number(event.target.value))}
              disabled={isSubmitting}
            >
              {durations.map((minutes) => (
                <MenuItem key={minutes} value={minutes}>{formatDuration(minutes)}</MenuItem>
              ))}
            </TextField>
          ) : (
            <Alert severity="info">
              {durationsLoading ? CREATE_RESERVATION_COPY.durationsLoading : CREATE_RESERVATION_COPY.noDuration}
            </Alert>
          )}

          <TextField
            label={CREATE_RESERVATION_COPY.purposeField}
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            disabled={isSubmitting}
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: MAX_PURPOSE_LENGTH } }}
          />

          {error ? <Alert severity="error">{error}</Alert> : null}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>{CREATE_RESERVATION_COPY.cancel}</Button>
        <AsyncButton variant="contained" onClick={handleSubmit} loading={isSubmitting} disabled={!ready}>
          {CREATE_RESERVATION_COPY.submit}
        </AsyncButton>
      </DialogActions>
    </Dialog>
  );
}
