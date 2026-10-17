/*
* Funcionalidad: useEmitOnAuthenticated tests
* Descripción: The hook emits a client message once per authenticated connection (first authentication and every reconnect), never while the socket is not authenticated or the hook is disabled, and again when its trigger changes; v1.1: without a socket it neither throws nor emits and emits once the socket appears; v1.2: onEmit is called right after each emit. Depends on vitest, Testing Library and the realtime context.
* Versión: 1.2
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RealtimeContext } from "./realtime-context";
import type { RealtimeSocket, RealtimeStatus } from "./realtime.entity";
import { useEmitOnAuthenticated } from "./use-emit-on-authenticated";

type ProbeProps = { enabled?: boolean, trigger?: unknown, onEmit?: () => void };

function Probe({ enabled = true, trigger, onEmit }: ProbeProps) {
  useEmitOnAuthenticated("ventilator:join", { enabled, trigger, ...(onEmit ? { onEmit } : {}) });

  return null;
}

function setup(status: RealtimeStatus, props: ProbeProps = {}) {
  const emit = vi.fn();
  const socket = { emit } as unknown as RealtimeSocket;
  const view = (nextStatus: RealtimeStatus, nextProps: ProbeProps) => (
    <RealtimeContext.Provider value={{ socket, status: nextStatus }}>
      <Probe {...nextProps} />
    </RealtimeContext.Provider>
  );
  const result = render(view(status, props));

  return { emit, rerender: (nextStatus: RealtimeStatus, nextProps: ProbeProps = props) => result.rerender(view(nextStatus, nextProps)) };
}

describe("useEmitOnAuthenticated", () => {
  it("calls the latest onEmit right after each emit, never without an emit", () => {
    const calls: string[] = [];
    const { emit, rerender } = setup("connecting", { trigger: "a", onEmit: () => calls.push("a") });

    expect(calls).toEqual([]);
    rerender("authenticated", { trigger: "a", onEmit: () => calls.push("a") });
    rerender("authenticated", { trigger: "b", onEmit: () => calls.push("b") });

    expect(emit).toHaveBeenCalledTimes(2);
    expect(calls).toEqual(["a", "b"]);
  });

  it("emits once the socket is authenticated, not while it connects", () => {
    const { emit, rerender } = setup("connecting");

    expect(emit).not.toHaveBeenCalled();

    rerender("authenticated");

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("ventilator:join");
  });

  it("emits again after a reconnect", () => {
    const { emit, rerender } = setup("authenticated");

    rerender("disconnected");
    rerender("connecting");
    rerender("authenticated");

    expect(emit).toHaveBeenCalledTimes(2);
  });

  it("does not emit while disabled and emits when enabled", () => {
    const { emit, rerender } = setup("authenticated", { enabled: false });

    expect(emit).not.toHaveBeenCalled();

    rerender("authenticated", { enabled: true });

    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("emits again when the trigger changes while authenticated", () => {
    const { emit, rerender } = setup("authenticated", { trigger: "r1" });

    rerender("authenticated", { trigger: "r1" });
    rerender("authenticated", { trigger: "r2" });

    expect(emit).toHaveBeenCalledTimes(2);
  });

  it("does not throw or emit without a socket and emits once the socket appears", () => {
    const emit = vi.fn();
    const socket = { emit } as unknown as RealtimeSocket;
    const view = (current: RealtimeSocket | null) => (
      <RealtimeContext.Provider value={{ socket: current, status: "authenticated" }}>
        <Probe />
      </RealtimeContext.Provider>
    );
    const { rerender } = render(view(null));

    rerender(view(null));
    expect(emit).not.toHaveBeenCalled();

    rerender(view(socket));
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("ventilator:join");
  });
});
