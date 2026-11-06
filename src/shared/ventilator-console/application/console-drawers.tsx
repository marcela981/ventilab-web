/*
* Funcionalidad: Console drawers
* Descripción: The side drawers of the July Monitoreo layout (DISENO_BLOQUE5 §6.2: "Asesoría IA", "Alertas detalladas" and "Caso clínico"): 380 px panels fixed to the right edge of the viewport, non-modal (the simulation and the curves keep running; below 1440 px the layout never changes width) and mutually exclusive, so opening one closes the other. `ConsoleDrawersProvider` (mounted by the July console root) holds which drawer is open; `useConsoleDrawer(key)` gives a drawer its open state, `toggle`, `close` (returning the focus to the button that opened it, kept in `triggerRef`) and works on its own state without a provider (classic consoles, tests). `ConsoleDrawer` is the panel itself: `complementary` named by its title, focused when it opens, a close button and Escape to close (handled here, so the console keyboard handler never sees it). v0.1 (Bloque 5, C6): first version. v0.2 (Bloque 5, C9): the open drawer remembers the element that had the focus when it opened (a drawer may have several opening buttons, e.g. "Historial de alarmas" and "Ver alertas detalladas") and closing gives the focus back to it. v0.3 (fix sim-assist-current-state): the panel carries `data-console-drawer`, so from 1440 px the July root makes room for it (the console is pushed and its curves reflow instead of being covered). Depends on React, MUI icons, the console store and the drawer styles.
* Versión: 0.3
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import CloseIcon from "@mui/icons-material/Close";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { cx } from "@shared/lib/class-names";
import { createExternalStore } from "./console-store";
import type { WritableStore } from "./console-store";
import styles from "../UI/console-drawers.module.css";

/** Which drawer is open (its key) and the element that had the focus when it opened, or null. */
type OpenDrawer = { key: string, opener: HTMLElement | null };

type DrawerStore = WritableStore<OpenDrawer | null>;

function focusedElement(): HTMLElement | null {
  const active = typeof document === "undefined" ? null : document.activeElement;

  return active instanceof HTMLElement && active !== document.body ? active : null;
}

const ConsoleDrawersContext = createContext<DrawerStore | null>(null);

/** One open drawer at a time for everything rendered inside (the July console root). */
export function ConsoleDrawersProvider({ children }: { children: ReactNode }) {
  const [store] = useState<DrawerStore>(() => createExternalStore<OpenDrawer | null>(null));

  return <ConsoleDrawersContext.Provider value={store}>{children}</ConsoleDrawersContext.Provider>;
}

export type ConsoleDrawerState = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  /** Closes it; by default the focus returns to the element that opened it (else the button in `triggerRef`). */
  close: (restoreFocus?: boolean) => void
  /** Attach to the button that opens the drawer. */
  triggerRef: RefObject<HTMLButtonElement | null>
};

const NOT_OPEN = (): boolean => false;

export function useConsoleDrawer(key: string): ConsoleDrawerState {
  const shared = useContext(ConsoleDrawersContext);
  const [own] = useState<DrawerStore>(() => createExternalStore<OpenDrawer | null>(null));
  const store = shared ?? own;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isOpen = useCallback(() => store.getSnapshot()?.key === key, [store, key]);
  const open = useSyncExternalStore(store.subscribe, isOpen, NOT_OPEN);

  const setOpen = useCallback((next: boolean) => {
    if (next) {
      if (store.getSnapshot()?.key !== key) {
        store.set({ key, opener: focusedElement() });
      }
    } else if (store.getSnapshot()?.key === key) {
      store.set(null);
    }
  }, [store, key]);

  const toggle = useCallback(() => setOpen(store.getSnapshot()?.key !== key), [setOpen, store, key]);

  const close = useCallback((restoreFocus = true) => {
    const current = store.getSnapshot();
    const opener = current?.key === key ? current.opener : null;

    setOpen(false);

    if (restoreFocus) {
      (opener?.isConnected ? opener : triggerRef.current)?.focus();
    }
  }, [setOpen, store, key]);

  return { open, setOpen, toggle, close, triggerRef };
}

export type ConsoleDrawerProps = {
  id?: string | undefined
  title: string
  /** Accessible name of the close button (e.g. "Ocultar caso clínico"). */
  closeLabel: string
  onClose: () => void
  children: ReactNode
  className?: string | undefined
};

/** A 380 px non-modal panel on the right edge; it takes the focus when it opens and Escape closes it. */
export function ConsoleDrawer({ id, title, closeLabel, onClose, children, className }: ConsoleDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  };

  return (
    <aside ref={panelRef} id={id} className={cx(styles.drawer, className)} aria-labelledby={titleId} tabIndex={-1} onKeyDown={onKeyDown} data-console-drawer="">
      <header className={cx(styles.head)}>
        <h2 id={titleId} className={cx(styles.title)}>{title}</h2>
        <button type="button" className={cx(styles.close)} aria-label={closeLabel} title={closeLabel} onClick={onClose}>
          <CloseIcon aria-hidden="true" />
        </button>
      </header>
      <div className={cx(styles.body)}>{children}</div>
    </aside>
  );
}
