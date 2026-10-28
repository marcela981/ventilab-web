/*
* Funcionalidad: KeptMountedTabPanels + tab list keyboard tests
* Descripción: The shared tab panels render nothing before the router is ready, load a panel (lazy, Suspense
*   fallback) on the first visit of its tab, keep it mounted and hidden afterwards (never remounted) and link each
*   tabpanel to its tab; tabForKey and useTabListKeyboard move with the arrows (wrapping), Home and End, ignore other
*   keys and focus the selected tab. Depends on vitest and Testing Library.
* Versión: 0.1
* Autor: Marcela Mazo Castro
* Proyecto: VentyLab
* Tesis: Desarrollo de una aplicación web para la enseñanza de mecánica ventilatoria que integre un sistema de retroalimentación usando modelos de lenguaje
* Institución: Universidad del Valle
* Contacto: marcela.mazo@correounivalle.edu.co
*/

import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { KeptMountedTabPanels, lazyPanel } from "./kept-mounted-tab-panels";
import { tabForKey, useTabListKeyboard } from "./tab-list-keyboard";

const TABS = ["a", "b", "c"] as const;
type Tab = (typeof TABS)[number];

const mounts: Record<Tab, number> = { a: 0, b: 0, c: 0 };

function makePanel(tab: Tab) {
  function Panel() {
    useEffect(() => {
      mounts[tab] += 1;
    }, []);

    return <p>{`panel ${tab}`}</p>;
  }

  return lazyPanel(() => Promise.resolve(Panel));
}

const PANELS = { a: makePanel("a"), b: makePanel("b"), c: makePanel("c") };

function Harness({ initial }: { initial: Tab | null }) {
  const [active, setActive] = useState<Tab | null>(initial);
  const { onKeyDown, registerTab } = useTabListKeyboard(TABS, active ?? "a", setActive);

  return (
    <>
      <div role="tablist" onKeyDown={onKeyDown}>
        {TABS.map((tab) => (
          <button
            key={tab}
            ref={registerTab(tab)}
            type="button"
            role="tab"
            id={`tab-${tab}`}
            aria-selected={tab === active}
            tabIndex={tab === active ? 0 : -1}
            onClick={() => setActive(tab)}
          >
            {`tab ${tab}`}
          </button>
        ))}
      </div>
      <KeptMountedTabPanels
        tabs={TABS}
        active={active}
        panels={PANELS}
        fallback={(tab) => <p>{`loading ${tab}`}</p>}
        panelId={(tab) => `panel-${tab}`}
        tabId={(tab) => `tab-${tab}`}
      />
    </>
  );
}

const panelOf = (tab: Tab) => document.getElementById(`panel-${tab}`);

beforeEach(() => {
  mounts.a = 0;
  mounts.b = 0;
  mounts.c = 0;
});

describe("KeptMountedTabPanels", () => {
  it("renders every panel empty and hidden while there is no active tab", () => {
    render(<Harness initial={null} />);

    for (const tab of TABS) {
      expect(panelOf(tab)).toBeEmptyDOMElement();
      expect(panelOf(tab)).not.toBeVisible();
    }
  });

  it("links each tabpanel to its tab", () => {
    render(<Harness initial="a" />);

    expect(screen.getAllByRole("tabpanel", { hidden: true }).map((panel) => panel.getAttribute("aria-labelledby")))
      .toEqual(["tab-a", "tab-b", "tab-c"]);
  });

  it("loads a panel on its first visit and keeps it mounted and hidden afterwards", async() => {
    render(<Harness initial="a" />);

    expect(await screen.findByText("panel a")).toBeInTheDocument();
    expect(panelOf("b")).toBeEmptyDOMElement();

    fireEvent.click(screen.getByRole("tab", { name: "tab b" }));
    expect(await screen.findByText("panel b")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "tab a" }));

    expect(panelOf("a")).toBeVisible();
    expect(panelOf("b")).not.toBeVisible();
    expect(panelOf("b")).toHaveTextContent("panel b");
    expect(panelOf("c")).toBeEmptyDOMElement();
    expect(mounts).toEqual({ a: 1, b: 1, c: 0 });
  });
});

describe("tab list keyboard", () => {
  it.each([
    ["a", "ArrowRight", "b"],
    ["c", "ArrowRight", "a"],
    ["a", "ArrowLeft", "c"],
    ["b", "Home", "a"],
    ["a", "End", "c"],
    ["b", "Enter", null],
  ] as const)("from %s, %s goes to %s", (active, key, expected) => {
    expect(tabForKey(TABS, active, key)).toBe(expected);
  });

  it("selects and focuses the target tab", async() => {
    render(<Harness initial="a" />);
    await screen.findByText("panel a");

    fireEvent.keyDown(screen.getByRole("tab", { name: "tab a" }), { key: "ArrowLeft" });

    expect(screen.getByRole("tab", { name: "tab c" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "tab c" })).toHaveFocus();
    expect(await screen.findByText("panel c")).toBeInTheDocument();
  });
});
