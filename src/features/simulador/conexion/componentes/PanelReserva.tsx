/*
 * Funcionalidad: PanelReserva
 * Descripción: Componente presentacional puro para el primer paso de la FSM:
 *   solicitar/liberar la reserva del ventilador (recurso único). Abre el
 *   ReservationDialog existente y delega la acción al hook vía props. Sin lógica.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { useState } from 'react';
import { Button, Typography } from '@mui/material';

import { ReservationDialog } from '@/features/simulador/compartido/componentes/ReservationDialog';
import styles from './ui/ConexionVentilador.module.css';

interface PanelReservaProps {
  tieneReserva: boolean;
  minutosRestantes: number;
  puedeReservar: boolean;
  puedeLiberar: boolean;
  ocupado: boolean;
  onReservar: (minutos: number, proposito?: string) => Promise<boolean>;
  onLiberar: () => void;
}

export function PanelReserva({
  tieneReserva,
  minutosRestantes,
  puedeReservar,
  puedeLiberar,
  ocupado,
  onReservar,
  onLiberar,
}: PanelReservaProps) {
  const [dialogoAbierto, setDialogoAbierto] = useState(false);

  return (
    <section className={styles.card}>
      <Typography className={styles.cardTitle!} component="p">
        1. Reserva del ventilador
      </Typography>
      <Typography className={styles.cardDescription!} component="p">
        El ventilador físico es un recurso único compartido. Reserva un turno antes
        de conectar; recuerda liberarlo al terminar para que otros estudiantes puedan
        usarlo.
      </Typography>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Reserva:</span>
        <span className={styles.rowValue}>
          {tieneReserva ? `Activa · ${minutosRestantes} min restantes` : 'No reservado'}
        </span>
      </div>

      <div className={styles.actions}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setDialogoAbierto(true)}
          disabled={!puedeReservar}
        >
          Reservar
        </Button>

        {tieneReserva && (
          <Button
            variant="outlined"
            color="warning"
            onClick={onLiberar}
            disabled={!puedeLiberar || ocupado}
          >
            Liberar
          </Button>
        )}
      </div>

      <ReservationDialog
        open={dialogoAbierto}
        onClose={() => setDialogoAbierto(false)}
        onConfirm={onReservar}
      />
    </section>
  );
}

export default PanelReserva;
