/*
* Funcionalidad: SilentBoundary
* Descripción: Error boundary of the optional notification chrome (bell, navigation badge): a render error inside it renders nothing instead of breaking the page around it. Depends on React.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { Component } from "react";
import type { ReactNode } from "react";

type SilentBoundaryState = { failed: boolean };

export class SilentBoundary extends Component<{ children: ReactNode }, SilentBoundaryState> {
  override state: SilentBoundaryState = { failed: false };

  static getDerivedStateFromError(): SilentBoundaryState {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
