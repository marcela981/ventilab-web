export class SerialProtocol {
  static createConfigFrame(mode, parameters) {
    let trama = '';
    
    // Modo de operación
    if (mode === 'Volumen control') {
      trama = 'V?';
    } else if (mode === 'Presion Control') {
      trama = 'P?';
    } else if (mode === 'Flujo control') {
      trama = 'F?';
    }

    // Tipo de onda
    trama += 'E?'; // Escalon

    // Parámetros (en el mismo orden que Python)
    trama += `${parameters.fio2}?`;
    trama += `${parameters.volumen}?`;
    trama += `${parameters.pmax}?`;
    trama += `${parameters.qmax}?`;
    trama += `${parameters.peep}?`;
    trama += `${parameters.frecuencia}?`;
    trama += `${parameters.tinsp}?`;
    trama += `${parameters.tesp1}?`;
    trama += `${parameters.tespir}?`;
    trama += `${parameters.tesp2}?`;
    trama += `${parameters.air}?`;
    trama += `${parameters.o2}?`;
    trama += `${parameters.presT}`;

    return trama;
  }

  static createStartFrame() {
    return 'a?E?0?0?0?0?0?0?0?0?0?0';
  }

  static createStopFrame() {
    return 'f?E?0?0?0?0?0?0?0?0?0?0';
  }

  static createResetFrame() {
    return 'r?E?0?0?0?0?0?0?0?0?0?0';
  }
}
