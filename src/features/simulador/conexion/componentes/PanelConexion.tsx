/*
 * Funcionalidad: PanelConexion
 * Descripción: Componente presentacional puro para el segundo paso de la FSM:
 *   conectar/desconectar el ventilador una vez reservado. Muestra el indicador de
 *   estado en vivo, la conectividad con el backend (puerta al broker MQTT) y el
 *   mensaje actual. Delega las acciones al hook vía props. Sin lógica de negocio.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { Button, Typography } from '@mui/material';

import type { EstadoConexion } from '@/features/simulador/conexion/websocket/hooks/useConexionVentilador';
import { IndicadorEstadoConexion } from './IndicadorEstadoConexion';
import styles from './ui/ConexionVentilador.module.css';

interface PanelConexionProps {
  estado: EstadoConexion;
  mensaje: string;
  socketConectado: boolean;
  puedeConectar: boolean;
  puedeDesconectar: boolean;
  onConectar: () => void;
  onDesconectar: () => void;
}

export function PanelConexion({
  estado,
  mensaje,
  socketConectado,
  puedeConectar,
  puedeDesconectar,
  onConectar,
  onDesconectar,
}: PanelConexionProps) {
  return (
    <section className={styles.card}>
      <Typography className={styles.cardTitle!} component="p">
        2. Conexión con el ventilador
      </Typography>
      <Typography className={styles.cardDescription!} component="p">
        Con la reserva activa, establece el canal de datos en vivo con el ventilador
        de la universidad a través del servidor (broker MQTT vía WebSocket).
      </Typography>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Estado:</span>
        <IndicadorEstadoConexion estado={estado} />
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Servidor (broker):</span>
        <span className={styles.rowValue}>
          {socketConectado ? 'En línea' : 'Sin conexión'}
        </span>
      </div>

      <Typography className={styles.message!} component="p">
        {mensaje}
      </Typography>

      <div className={styles.actions}>
        <Button
          variant="contained"
          color="primary"
          onClick={onConectar}
          disabled={!puedeConectar}
        >
          Conectar
        </Button>

        {puedeDesconectar && (
          <Button variant="outlined" color="warning" onClick={onDesconectar}>
            Desconectar
          </Button>
        )}
      </div>
    </section>
  );
}

export default PanelConexion;
