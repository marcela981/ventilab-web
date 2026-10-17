/*
* Funcionalidad: Lab reservations page
* Descripción: Reservations calendar of the ventilator lab (/lab/reservations): week (default) or day view in America/Bogota with previous / today / next navigation, the slot rules from useLabSettings (slot minutes, maximum duration, booking window; never hardcoded) and a legend. A free slot opens the create dialog with the durations allowed from it (up to the maximum and before the next reservation); after a booking the dialog closes, a confirmation is shown and the reads are revalidated (the backend returns data null). Occupied slots show only what the backend returned for the caller role. The calendar is revalidated on ventilator:availability and reservation:preempted, and periodically because other bookings have no realtime event. Skeleton, retryable error and the previous range kept while the next one loads. v1.1 (T3): staff (teacher/admin) may select occupied slots of the bookable range and pick durations past the next reservation; a 409 they may preempt opens the preemption dialog (confirmPreempt resend with the chosen holder) and the confirmation counts the preempted reservations; usePreemptionNotice shows the preempted holder a realtime toast. v1.2 (T4 + T2 review fix): the "Mis reservas" section (upcoming/past, cancel with confirmation); the calendar shows the skeleton or the error of the requested range instead of the previous range's data; the calendar query extends maxDurationMinutes past the end of the range so the durations of the last slots see the next day's reservations (the grid still shows only the range); the create dialog gets no duration when a reservation already covers the chosen start. v1.3 (T3/T4 review fixes): the preemption success copy states no exact count, the reservations the caller preempts are not announced to the caller (expectOwnPreemption), and the create dialog offers no duration ("Comprobando la disponibilidad…") while the calendar of the current range/settings loads. Depends on MUI, next/head, next/link, the session, the design-system states, the date format helper, the lab hooks, entities, components, routes and styles.
* Versión: 1.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ErrorState } from "@shared/design-system/components/error-state";
import { PageHeader } from "@shared/design-system/components/page-header";
import { ListSkeleton } from "@shared/design-system/components/skeleton";
import { cx } from "@shared/lib/class-names";
import { formatDuration } from "@shared/lib/format";
import { useSession } from "@shared/session/use-session";
import { CreateReservationDialog } from "../components/create-reservation-dialog";
import { MyReservations } from "../components/my-reservations";
import { PreemptReservationDialog } from "../components/preempt-reservation-dialog";
import { ReservationCalendar } from "../components/reservation-calendar";
import { LAB_URL } from "../config/lab.routes";
import type { CreateReservationRequest, ReservationConflict } from "../entities/create-reservation.entity";
import { getLabErrorMessage } from "../entities/lab-error-messages";
import { availableDurations, bogotaDayLabel, buildSlotGrid, calendarRange, shiftAnchor } from "../entities/slot-grid";
import type { CalendarView, GridSlot } from "../entities/slot-grid";
import { useLabSettings } from "../hooks/use-lab-settings";
import { usePreemptionNotice } from "../hooks/use-preemption-notice";
import { useReservationsCalendar } from "../hooks/use-reservations-calendar";
import { useReservationsRealtime } from "../hooks/use-reservations-realtime";
import styles from "../../UI/lab-reservations.module.css";

// TODO(i18n): move to a ventilator-lab namespace in src/i18n.
export const LAB_RESERVATIONS_COPY = {
  documentTitle: "Reservas del ventilador | VentyLab",
  title: "Reservas del ventilador",
  subtitle: "Elige una franja libre para reservar el ventilador físico. Horario de Bogotá.",
  back: "Volver al laboratorio",
  week: "Semana",
  day: "Día",
  viewLabel: "Vista del calendario",
  previous: { week: "Semana anterior", day: "Día anterior" },
  next: { week: "Semana siguiente", day: "Día siguiente" },
  today: "Hoy",
  rules: (slot: number, maxMinutes: number, days: number) =>
    `Franjas de ${slot} min · duración máxima ${formatDuration(maxMinutes)} · reservas con hasta ${days} ${days === 1 ? "día" : "días"} de antelación.`,
  legendLabel: "Leyenda",
  legend: { free: "Libre", occupied: "Ocupado", past: "Pasado", outside: "Fuera de la ventana de reserva" },
  loading: "Cargando el calendario…",
  error: "No se pudo cargar el calendario",
  created: "Reserva creada.",
  createdWithPreemption: "Reserva creada. Se desplazaron las reservas en conflicto y sus titulares recibieron un aviso.",
} as const;

const NO_RESERVATIONS: readonly never[] = [];

type PendingPreemption = {
  conflict: ReservationConflict
  request: CreateReservationRequest
};

const NOW_REFRESH_MS = 60_000;
const MINUTE_MS = 60_000;

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), NOW_REFRESH_MS);

    return () => clearInterval(timer);
  }, []);

  return now;
}

function rangeLabel(days: readonly Date[]): string {
  const first = days[0];
  const last = days[days.length - 1];

  if (!first || !last) {
    return "";
  }

  return first === last ? bogotaDayLabel(first) : `${bogotaDayLabel(first)} – ${bogotaDayLabel(last)}`;
}

export function LabReservationsPage() {
  useReservationsRealtime();
  const preemptionNotice = usePreemptionNotice();
  const { role } = useSession();
  // Staff may book over other reservations (preemption); the backend decides which ones per role.
  const isStaff = role === "TEACHER" || role === "ADMIN";
  const { settings } = useLabSettings();
  const now = useNow();
  const [view, setView] = useState<CalendarView>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preemption, setPreemption] = useState<PendingPreemption | null>(null);
  const slotMinutes = settings["reservations.slotMinutes"];
  const maxDurationMinutes = settings["reservations.maxDurationMinutes"];
  const range = useMemo(() => calendarRange(view, anchor), [view, anchor]);
  // A booking from the last slots may run into the next day: load that margin too, for the duration limits.
  const queryTo = useMemo(
    () => new Date(range.to.getTime() + Math.max(0, maxDurationMinutes) * MINUTE_MS),
    [range.to, maxDurationMinutes],
  );
  const calendar = useReservationsCalendar(range.from, queryTo);
  const reservations = useMemo(() => calendar.data ?? [], [calendar.data]);
  const maxAdvanceDays = settings["reservations.maxAdvanceDays"];
  const grid = useMemo(
    () => buildSlotGrid({ view, anchor, now, slotMinutes, maxAdvanceDays, reservations }),
    [view, anchor, now, slotMinutes, maxAdvanceDays, reservations],
  );
  // Staff durations are not capped by the next reservation: booking over it is the preemption flow.
  // T4 review fix W1: while the calendar of the current range/settings loads, nothing is known about the next
  // reservation, so no duration is offered (Reservar disabled).
  const durations = useMemo(
    () => (selected && calendar.data
      ? availableDurations(selected, { slotMinutes, maxDurationMinutes, reservations: isStaff ? NO_RESERVATIONS : reservations })
      : []),
    [selected, calendar.data, slotMinutes, maxDurationMinutes, reservations, isStaff],
  );

  const handleSelect = (slot: GridSlot) => {
    setNotice(null);
    setSelected(slot.startsAt);
  };

  const handleCreated = () => {
    setSelected(null);
    setNotice(LAB_RESERVATIONS_COPY.created);
  };

  const handleConflict = (conflict: ReservationConflict, request: CreateReservationRequest): boolean => {
    if (!isStaff) {
      return false;
    }

    setPreemption({ conflict, request });

    return true;
  };

  const handlePreempted = () => {
    setPreemption(null);
    setSelected(null);
    setNotice(LAB_RESERVATIONS_COPY.createdWithPreemption);
  };

  return (
    <div className={cx(styles.page)}>
      <Head>
        <title>{LAB_RESERVATIONS_COPY.documentTitle}</title>
      </Head>
      <PageHeader
        title={LAB_RESERVATIONS_COPY.title}
        subtitle={LAB_RESERVATIONS_COPY.subtitle}
        actions={<Button component={Link} href={LAB_URL}>{LAB_RESERVATIONS_COPY.back}</Button>}
      />

      <section className={cx(styles.card)} aria-label={LAB_RESERVATIONS_COPY.title}>
        <div className={cx(styles.toolbar)}>
          <div className={cx(styles.navigation)}>
            <IconButton aria-label={LAB_RESERVATIONS_COPY.previous[view]} onClick={() => setAnchor(shiftAnchor(view, anchor, -1))}>
              <ChevronLeftIcon />
            </IconButton>
            <Button onClick={() => setAnchor(new Date())}>{LAB_RESERVATIONS_COPY.today}</Button>
            <IconButton aria-label={LAB_RESERVATIONS_COPY.next[view]} onClick={() => setAnchor(shiftAnchor(view, anchor, 1))}>
              <ChevronRightIcon />
            </IconButton>
            <p className={cx(styles.range)} aria-live="polite">{rangeLabel(range.days)}</p>
          </div>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={view}
            aria-label={LAB_RESERVATIONS_COPY.viewLabel}
            onChange={(_event, next: CalendarView | null) => {
              if (next) {
                setView(next);
              }
            }}
          >
            <ToggleButton value="week">{LAB_RESERVATIONS_COPY.week}</ToggleButton>
            <ToggleButton value="day">{LAB_RESERVATIONS_COPY.day}</ToggleButton>
          </ToggleButtonGroup>
        </div>

        <p className={cx(styles.muted)}>{LAB_RESERVATIONS_COPY.rules(slotMinutes, maxDurationMinutes, maxAdvanceDays)}</p>
        <ul className={cx(styles.legend)} aria-label={LAB_RESERVATIONS_COPY.legendLabel}>
          <li className={cx(styles.legendItem)}><span className={cx(styles.swatch, styles.swatchFree)} />{LAB_RESERVATIONS_COPY.legend.free}</li>
          <li className={cx(styles.legendItem)}><span className={cx(styles.swatch, styles.swatchOccupied)} />{LAB_RESERVATIONS_COPY.legend.occupied}</li>
          <li className={cx(styles.legendItem)}><span className={cx(styles.swatch, styles.swatchPast)} />{LAB_RESERVATIONS_COPY.legend.past}</li>
          <li className={cx(styles.legendItem)}><span className={cx(styles.swatch, styles.swatchOutside)} />{LAB_RESERVATIONS_COPY.legend.outside}</li>
        </ul>

        {notice ? <Alert severity="success" onClose={() => setNotice(null)}>{notice}</Alert> : null}

        {!calendar.data && calendar.isLoading ? <ListSkeleton label={LAB_RESERVATIONS_COPY.loading} /> : null}
        {!calendar.data && !calendar.isLoading && calendar.error ? (
          <ErrorState
            title={LAB_RESERVATIONS_COPY.error}
            description={getLabErrorMessage(calendar.error)}
            onRetry={() => void calendar.reload()}
          />
        ) : null}
        {calendar.data ? <ReservationCalendar grid={grid} now={now} onSelectSlot={handleSelect} canSelectOccupied={isStaff} /> : null}
      </section>

      <MyReservations now={now} />

      {selected ? (
        <CreateReservationDialog
          key={selected.toISOString()}
          open
          slotStart={selected}
          durations={durations}
          durationsLoading={!calendar.data && calendar.isLoading}
          settings={settings}
          onClose={() => setSelected(null)}
          onCreated={handleCreated}
          onConflict={handleConflict}
        />
      ) : null}

      {preemption ? (
        <PreemptReservationDialog
          open
          conflict={preemption.conflict}
          request={preemption.request}
          settings={settings}
          onClose={() => setPreemption(null)}
          onCreated={handlePreempted}
          onPreempting={preemptionNotice.expectOwnPreemption}
        />
      ) : null}
    </div>
  );
}
