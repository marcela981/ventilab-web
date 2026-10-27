/*
* Funcionalidad: ConnectionCard
* Descripción: Card "2. Conexión con el ventilador" of the Conexión tab (W7, Bloque 1; July PanelConexion and
*   IndicadorEstadoConexion, FLUJOS_JULIO b.3 and b.6): the July description, the FSM state with its coloured dot and
*   July label, the server line ("En línea" / "Sin conexión"), who operates once connected ("Controlas el equipo",
*   "Opera: <nombre>" or observer), the July message of the state (the error message in ERROR), "Conectar" and
*   "Desconectar" (only while connecting or connected). Depends on MUI, React, the lab connection, the connection FSM
*   texts, the ventilator-lab control copy and the connection styles.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import { useId } from "react";
import { CONTROL_COPY } from "@features/ventilator-lab/connection.entry";
import { cx } from "@shared/lib/class-names";
import { CONNECTION_STATE_LABELS, CONNECTION_STATE_MESSAGES } from "../../entities/connection-fsm";
import type { LabConnectionState } from "../../entities/connection-fsm";
import { useLabConnection } from "../lab-connection-provider";
import styles from "../../../UI/connection/connection-panel.module.css";

// TODO(i18n): move to a simulator namespace in src/i18n.
export const CONNECTION_CARD_COPY = {
  title: "2. Conexión con el ventilador",
  description: "Con la reserva activa, establece el canal de datos en vivo con el ventilador de la universidad a través del servidor (broker MQTT vía WebSocket).",
  stateLabel: "Estado:",
  serverLabel: "Servidor (broker):",
  online: "En línea",
  offline: "Sin conexión",
  controlLabel: "Control:",
  observer: "Observas el equipo sin operarlo.",
  groupObserver: "Observas el equipo: solo el líder del grupo puede operarlo.",
  error: "No se pudo completar la acción.",
  connect: "Conectar",
  disconnect: "Desconectar",
} as const;

export function StateIndicator({ state }: { state: LabConnectionState }) {
  return (
    <span className={cx(styles.indicator)}>
      <span className={cx(styles.dot)} data-state={state} aria-hidden="true" />
      <span className={cx(styles.indicatorLabel)}>{CONNECTION_STATE_LABELS[state]}</span>
    </span>
  );
}

export function ConnectionCard() {
  const titleId = useId();
  const { state, error, socketOnline, isOperator, operatorName, relation, actions, connect, disconnect } = useLabConnection();
  let message: string;

  if (state === "ERROR") {
    message = error ?? CONNECTION_CARD_COPY.error;
  } else {
    message = CONNECTION_STATE_MESSAGES[state];
  }

  let operator: string | null = null;

  if (state === "CONNECTED") {
    if (isOperator) {
      operator = CONTROL_COPY.self;
    } else if (operatorName) {
      operator = CONTROL_COPY.other(operatorName);
    } else {
      operator = relation === "group_member" ? CONNECTION_CARD_COPY.groupObserver : CONNECTION_CARD_COPY.observer;
    }
  }

  return (
    <section className={cx(styles.card)} aria-labelledby={titleId}>
      <h3 id={titleId} className={cx(styles.cardTitle)}>{CONNECTION_CARD_COPY.title}</h3>
      <p className={cx(styles.cardDescription)}>{CONNECTION_CARD_COPY.description}</p>
      <div className={cx(styles.row)}>
        <span className={cx(styles.rowLabel)}>{CONNECTION_CARD_COPY.stateLabel}</span>
        <StateIndicator state={state} />
      </div>
      <div className={cx(styles.row)}>
        <span className={cx(styles.rowLabel)}>{CONNECTION_CARD_COPY.serverLabel}</span>
        <span className={cx(styles.rowValue)}>{socketOnline ? CONNECTION_CARD_COPY.online : CONNECTION_CARD_COPY.offline}</span>
      </div>
      {operator ? (
        <div className={cx(styles.row)}>
          <span className={cx(styles.rowLabel)}>{CONNECTION_CARD_COPY.controlLabel}</span>
          <span className={cx(styles.rowValue)} data-testid="connection-operator">{operator}</span>
        </div>
      ) : null}
      <p className={cx(styles.message)} role="status" data-tone={state === "ERROR" ? "error" : undefined}>{message}</p>
      {state !== "ERROR" && error ? <p className={cx(styles.message)} role="alert" data-tone="error">{error}</p> : null}
      <div className={cx(styles.actions)}>
        <Button variant="contained" onClick={connect} disabled={!actions.connect}>{CONNECTION_CARD_COPY.connect}</Button>
        {actions.disconnect ? (
          <Button variant="outlined" color="warning" onClick={disconnect}>{CONNECTION_CARD_COPY.disconnect}</Button>
        ) : null}
      </div>
    </section>
  );
}
