/*
 * Funcionalidad: ConexionVentiladorTab
 * Descripción: Contenedor de la tab "Conexión". Lee la FSM desde el contexto
 *   (useConexionVentiladorContext) y cablea el estado/acciones a los componentes
 *   presentacionales PanelReserva y PanelConexion. No contiene lógica de negocio:
 *   reservar→conectar→desconectar→liberar viven en useConexionVentilador.
 * Versión: 1.0
 * Autor: Marcela Mazo Castro
 * Proyecto: VentyLab
 * Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria
 *        que integre un sistema de retroalimentación usando modelos de lenguaje
 * Institución: Universidad del Valle
 * Contacto: marcela.mazo@correounivalle.edu.co
 */

import { useConexionVentiladorContext } from '@/features/simulador/conexion/contexto/ConexionVentiladorContext';
import { PanelReserva } from './PanelReserva';
import { PanelConexion } from './PanelConexion';
import styles from './ui/ConexionVentilador.module.css';

export function ConexionVentiladorTab() {
  const {
    estado,
    mensaje,
    tieneReserva,
    socketConectado,
    minutosRestantes,
    puedeReservar,
    puedeConectar,
    puedeDesconectar,
    puedeLiberar,
    ocupado,
    acciones,
  } = useConexionVentiladorContext();

  return (
    <div className={styles.tab}>
      <div className={styles.grid}>
        <PanelReserva
          tieneReserva={tieneReserva}
          minutosRestantes={minutosRestantes}
          puedeReservar={puedeReservar}
          puedeLiberar={puedeLiberar}
          ocupado={ocupado}
          onReservar={acciones.reservar}
          onLiberar={acciones.liberar}
        />

        <PanelConexion
          estado={estado}
          mensaje={mensaje}
          socketConectado={socketConectado}
          puedeConectar={puedeConectar}
          puedeDesconectar={puedeDesconectar}
          onConectar={acciones.conectar}
          onDesconectar={acciones.desconectar}
        />
      </div>
    </div>
  );
}

export default ConexionVentiladorTab;
