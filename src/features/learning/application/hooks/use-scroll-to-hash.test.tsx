/*
* Funcionalidad: useScrollToHash tests
* Descripción: Scrolls to the element named by the URL hash once the content is ready, and never crashes on a malformed percent-encoded hash (it then does nothing). Depends on vitest and Testing Library.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useScrollToHash } from "./use-scroll-to-hash";

afterEach(() => {
  window.location.hash = "";
  document.body.innerHTML = "";
});

describe("useScrollToHash", () => {
  it("scrolls to the element of the hash when ready", () => {
    const target = document.createElement("section");
    const scrollIntoView = vi.fn();

    target.id = "level-lv1";
    target.scrollIntoView = scrollIntoView;
    document.body.append(target);
    window.location.hash = "#level-lv1";

    renderHook(() => useScrollToHash(true));

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("ignores a malformed hash instead of crashing", () => {
    window.location.hash = "#level-%E0%A4%A";

    expect(() => renderHook(() => useScrollToHash(true))).not.toThrow();
  });
});
