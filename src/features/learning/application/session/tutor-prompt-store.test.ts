/*
* Funcionalidad: TutorAI prompt store tests
* Descripción: Unit tests of the viewer-level prompt store: a request notifies subscribers with a new id, consume clears only the matching request (a newer one survives) and unsubscribing stops the notifications. Depends on vitest.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { describe, expect, it, vi } from "vitest";
import { createTutorPromptStore } from "./tutor-prompt-store";

describe("createTutorPromptStore", () => {
  it("publishes requests with new ids and clears only the consumed one", () => {
    const store = createTutorPromptStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    expect(store.getSnapshot()).toBeNull();
    store.request("deepen", "Resúmeme esta página");
    const first = store.getSnapshot();

    expect(first).toMatchObject({ target: "deepen", prompt: "Resúmeme esta página" });
    store.request("questions", "Resume la lección");
    const second = store.getSnapshot();

    expect(second?.id).not.toBe(first?.id);
    store.consume(first?.id ?? 0);
    expect(store.getSnapshot()).toBe(second);
    store.consume(second?.id ?? 0);
    expect(store.getSnapshot()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    store.request("deepen", "Otra");
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
