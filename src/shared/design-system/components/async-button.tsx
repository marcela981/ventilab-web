/*
* Funcionalidad: AsyncButton
* Descripción: MUI Button for actions that take time: while `loading` is true, or while the Promise returned by `onClick` is pending, it shows the centered MUI loading spinner, sets aria-busy and is disabled (no double submit). The label stays in the DOM (transparent while busy), so the button keeps its width and its accessible name. A rejected onClick promise is the caller's to handle; the button only leaves the busy state. Depends on React and MUI Button.
* Versión: 1.0
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import Button from "@mui/material/Button";
import type { ButtonProps } from "@mui/material/Button";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";

export type AsyncButtonProps = Omit<ButtonProps, "loading" | "onClick"> & {
  loading?: boolean
  onClick?: (event: MouseEvent<HTMLButtonElement>) => unknown
};

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof value === "object" && value !== null && typeof (value as { then?: unknown }).then === "function";
}

export function AsyncButton({ loading = false, onClick, disabled = false, children, ...props }: AsyncButtonProps) {
  const [pending, setPending] = useState(false);
  const mounted = useRef(true);
  const busy = loading || pending;

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const result = onClick?.(event);

    if (!isPromiseLike(result)) {
      return;
    }

    setPending(true);

    const settle = () => {
      if (mounted.current) {
        setPending(false);
      }
    };

    result.then(settle, settle);
  };

  return (
    <Button {...props} loading={busy} disabled={disabled || busy} aria-busy={busy} onClick={handleClick}>
      {children}
    </Button>
  );
}
