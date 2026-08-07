"use client";

// Beat 2.6 — the duck curve. Scrub a stylized California day: demand,
// solar, and what's left over (net load — the part the rest of the fleet
// must cover). Shapes per CAISO's duck-curve charts; numbers illustrative.

import { useMemo, useState } from "react";

const W = 480;
const H = 190;
const PAD = { top: 14, right: 12, bottom: 26, left: 34 };
const GW_MAX = 40;

function demandAt(h: number): number {
  // Stylized spring weekday: overnight trough, evening peak.
  return (
    21 +
    6.5 * Math.exp(-((h - 19.2) ** 2) / 7) +
    3.4 * Math.exp(-((h - 9) ** 2) / 18) -
    2.2 * Math.exp(-((h - 3.5) ** 2) / 14)
  );
}

function solarAt(h: number): number {
  return h > 5.5 && h < 19.5 ? 16 * Math.exp(-((h - 12.5) ** 2) / 9) : 0;
}

const x = (h: number) => PAD.left + (h / 24) * (W - PAD.left - PAD.right);
const y = (gw: number) => PAD.top + (1 - gw / GW_MAX) * (H - PAD.top - PAD.bottom);

function pathOf(fn: (h: number) => number): string {
  const pts: string[] = [];
  for (let h = 0; h <= 24; h += 0.25) {
    pts.push(`${pts.length ? "L" : "M"}${x(h).toFixed(1)},${y(fn(h)).toFixed(1)}`);
  }
  return pts.join("");
}

function fmtHour(h: number): string {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  const ampm = whole < 12 ? "a.m." : "p.m.";
  const twelve = whole % 12 === 0 ? 12 : whole % 12;
  return `${twelve}:${String(mins).padStart(2, "0")} ${ampm}`;
}

export default function DuckCurve() {
  const [hour, setHour] = useState(12);

  const paths = useMemo(
    () => ({
      demand: pathOf(demandAt),
      net: pathOf((h) => demandAt(h) - solarAt(h)),
      solar: pathOf(solarAt),
    }),
    [],
  );

  const d = demandAt(hour);
  const s = solarAt(hour);
  const net = d - s;
  const belly = s > 10;
  const neck = hour >= 17 && hour <= 20.5 && s < 6;

  return (
    <div className="grid-widget" data-widget="duck-curve">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Demand, solar, and net load across one day">
        {[0, 10, 20, 30, 40].map((gw) => (
          <g key={gw}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(gw)} y2={y(gw)} className="grid-duck-rule" />
            <text x={PAD.left - 5} y={y(gw) + 3} className="grid-duck-tick" textAnchor="end">
              {gw}
            </text>
          </g>
        ))}
        {[0, 6, 12, 18, 24].map((h) => (
          <text key={h} x={x(h)} y={H - 8} className="grid-duck-tick" textAnchor="middle">
            {h === 0 || h === 24 ? "12am" : h === 12 ? "noon" : h === 6 ? "6am" : "6pm"}
          </text>
        ))}
        <path d={paths.solar} className="grid-duck-solar" />
        <path d={paths.demand} className="grid-duck-demand" />
        <path d={paths.net} className="grid-duck-net" />
        <line x1={x(hour)} x2={x(hour)} y1={PAD.top} y2={H - PAD.bottom} className="grid-duck-cursor" />
        <circle cx={x(hour)} cy={y(net)} r={3.5} className="grid-duck-dot" />
      </svg>

      <label className="grid-widget-slider">
        {fmtHour(hour)}
        <input
          type="range"
          min={0}
          max={24}
          step={0.25}
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
          aria-label="Time of day"
        />
      </label>

      <div className="grid-widget-readouts">
        <span>
          DEMAND <strong>{d.toFixed(0)} GW</strong>
        </span>
        <span>
          SOLAR <strong>{s.toFixed(0)} GW</strong>
        </span>
        <span>
          EVERYONE ELSE <strong>{net.toFixed(0)} GW</strong>
        </span>
        <span className="grid-widget-marginal">
          {belly ? "the belly — prices sag toward zero" : neck ? "the neck — peakers earn their year" : ""}
        </span>
      </div>

      <p className="grid-widget-note">
        Illustrative shape, one stylized spring day. The solid line is what the
        non-solar fleet must cover: it sags at noon and cliffs at sunset — the
        duck.
      </p>
    </div>
  );
}
