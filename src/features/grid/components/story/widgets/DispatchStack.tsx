"use client";

// Beat 2.4 — the dispatch stack. Drag demand through a morning; plants
// light cheapest-first; the price is whatever the marginal block asked for.
// Stylized one-region numbers (see content/grid/facts.md §Widget data).
// Plain chrome per the Phase 4.5 reskin freeze.

import { useMemo, useState } from "react";

interface Block {
  key: string;
  label: string;
  gw: number;
  price: number; // $/MWh offer
  solar?: boolean;
}

const BLOCKS: Block[] = [
  { key: "wind", label: "Wind", gw: 8, price: 0 },
  { key: "solar", label: "Solar", gw: 15, price: 0, solar: true },
  { key: "nuclear", label: "Nuclear", gw: 10, price: 2 },
  { key: "hydro", label: "Hydro", gw: 6, price: 8 },
  { key: "coal", label: "Coal", gw: 12, price: 28 },
  { key: "gascc", label: "Gas (combined-cycle)", gw: 25, price: 40 },
  { key: "peaker", label: "Gas peakers", gw: 10, price: 160 },
  { key: "oil", label: "Oil", gw: 4, price: 250 },
];

export default function DispatchStack() {
  const [demand, setDemand] = useState(38);
  const [solarOn, setSolarOn] = useState(false);

  const stack = useMemo(
    () => BLOCKS.filter((b) => !b.solar || solarOn),
    [solarOn],
  );
  const totalGw = stack.reduce((s, b) => s + b.gw, 0);

  let cum = 0;
  let clearing = 0;
  let marginal: Block | null = null;
  const rendered = stack.map((b) => {
    const start = cum;
    cum += b.gw;
    const lit = start < demand;
    if (lit) {
      clearing = b.price;
      marginal = b;
    }
    return { ...b, start, lit };
  });
  const short = demand > totalGw;

  return (
    <div className="grid-widget" data-widget="dispatch-stack">
      <div className="grid-widget-readouts">
        <span>
          DEMAND <strong>{demand} GW</strong>
        </span>
        <span>
          PRICE{" "}
          <strong>
            {short ? "—" : `$${clearing}/MWh`}
          </strong>
        </span>
        <span className="grid-widget-marginal">
          {short
            ? "NOT ENOUGH SUPPLY"
            : marginal
              ? `set by ${(marginal as Block).label.toLowerCase()}`
              : ""}
        </span>
      </div>

      <div className="grid-stack" role="img" aria-label="Supply blocks sorted cheapest first; lit blocks are running">
        {rendered.map((b) => (
          <div
            key={b.key}
            className="grid-stack-block"
            data-lit={b.lit || undefined}
            style={{ flexGrow: b.gw }}
            title={`${b.label}: ${b.gw} GW at $${b.price}/MWh`}
          >
            {b.gw >= 8 && <span>{b.label.split(" ")[0]}</span>}
          </div>
        ))}
      </div>
      <div className="grid-stack-axis">
        <span>$0</span>
        <span>cheapest first →</span>
        <span>${stack[stack.length - 1].price}</span>
      </div>

      <label className="grid-widget-slider">
        Demand
        <input
          type="range"
          min={15}
          max={80}
          step={1}
          value={demand}
          onChange={(e) => setDemand(Number(e.target.value))}
          aria-label="Demand in gigawatts"
        />
      </label>
      <label className="grid-widget-check">
        <input
          type="checkbox"
          checked={solarOn}
          onChange={(e) => setSolarOn(e.target.checked)}
        />
        Add 15 GW of solar (noon arrives)
      </label>

      <p className="grid-widget-note">
        Illustrative numbers, one imaginary region. Every plant that runs is
        paid the price of the last block lit.
      </p>
    </div>
  );
}
