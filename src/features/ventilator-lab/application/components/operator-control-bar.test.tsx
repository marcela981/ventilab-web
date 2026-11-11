/*
* Funcionalidad: Operator control bar tests
* Descripción: The takeover confirmation closes by itself when the backend state no longer allows a takeover (T7
*   review fix S3: the operator released or someone else took it meanwhile), and the control loss notice (T9): the
*   text with the name only as given, the read-only line, the hint to take the control again only when the backend
*   allows it, and the dismiss button. Depends on vitest, Testing Library and the control entities.
*   v1.1 (2026-11-10): the loss notice offers the one-click "Retomar control" (take) only when the backend allows it.
* Versión: 1.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { REVOCATION_COPY } from "../entities/control-revocation.entity";
import { CONTROL_COPY, INITIAL_CONTROL_VIEW } from "../entities/operator-control.entity";
import type { ControlView, OperatorControlState } from "../entities/operator-control.entity";
import { OperatorControlBar } from "./operator-control-bar";
import type { OperatorControlBarProps } from "./operator-control-bar";

function view(state: Partial<OperatorControlState>, extra: Partial<ControlView> = {}): ControlView {
  return {
    ...INITIAL_CONTROL_VIEW,
    state: { reservationId: "r1", operatorUserId: null, isOperator: false, canTake: false, canTakeover: false, occupied: true, ...state },
    ...extra,
  };
}

const noop = () => Promise.resolve();

function props(overrides: Partial<OperatorControlBarProps>): OperatorControlBarProps {
  return { view: view({}), operatorName: null, onTake: noop, onTakeover: noop, onRelease: noop, onDismissLoss: vi.fn(), ...overrides };
}

describe("OperatorControlBar", () => {
  it("closes the takeover confirmation when the takeover is no longer possible (S3)", async() => {
    const { rerender } = render(<OperatorControlBar {...props({ view: view({ operatorUserId: "u2", canTakeover: true }) })} />);

    fireEvent.click(screen.getByRole("button", { name: CONTROL_COPY.takeover }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    // The operator released meanwhile: nobody to take the control from.
    rerender(<OperatorControlBar {...props({ view: view({ operatorUserId: null, canTake: true }) })} />);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shows the control loss notice, the hint to take it again only when allowed, and dismisses it (T9)", () => {
    const onDismissLoss = vi.fn();
    const onTake = vi.fn(() => Promise.resolve());
    const lost = view({ operatorUserId: null, canTake: true }, { loss: { reason: "presence_timeout", operatorUserId: null } });
    const { rerender } = render(<OperatorControlBar {...props({ view: lost, onDismissLoss, onTake })} />);

    const notice = screen.getByTestId("lab-live-control-loss");
    expect(notice).toHaveTextContent(REVOCATION_COPY.loss.presenceTimeout);
    expect(notice).toHaveTextContent(REVOCATION_COPY.loss.readOnly);
    expect(screen.getByRole("button", { name: CONTROL_COPY.take })).toBeInTheDocument();
    // One click "Retomar control": the same take request.
    fireEvent.click(within(notice).getByRole("button", { name: "Retomar control" }));
    expect(onTake).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: REVOCATION_COPY.loss.dismiss }));
    expect(onDismissLoss).toHaveBeenCalledTimes(1);

    // Taken over by someone the backend did not name; the take hint is not offered.
    rerender(<OperatorControlBar {...props({ view: view({ operatorUserId: "u9" }, { loss: { reason: "takeover", operatorUserId: "u9" } }) })} />);
    expect(screen.getByTestId("lab-live-control-loss")).toHaveTextContent("Otra persona tomó el control del equipo.");
    expect(within(screen.getByTestId("lab-live-control-loss")).queryByRole("button", { name: "Retomar control" })).not.toBeInTheDocument();
  });
});
