// In-code SVG diagrams for the story (beats 1.2, 3.8, 4.1). Ink-line
// drawings in the scaffolding chrome; the reskin repaints them. Numbers on
// the bill and demand charts are illustrative/typical — see facts.md.

import type { DiagramName } from "../../lib/content";

function BalanceDiagram() {
  return (
    <svg viewBox="0 0 440 170" role="img" aria-label="A balance scale: generation on one side, demand on the other, pivoting on 60 hertz">
      <g className="grid-diag-ink">
        {/* beam + pivot */}
        <line x1={70} y1={60} x2={370} y2={60} />
        <path d="M 220 60 L 205 105 L 235 105 Z" fill="none" />
        <line x1={160} y1={105} x2={280} y2={105} />
        {/* left pan: generation */}
        <line x1={100} y1={60} x2={88} y2={88} />
        <line x1={100} y1={60} x2={112} y2={88} />
        <path d="M 80 88 A 22 12 0 0 0 120 88" fill="none" />
        {/* right pan: demand */}
        <line x1={340} y1={60} x2={328} y2={88} />
        <line x1={340} y1={60} x2={352} y2={88} />
        <path d="M 320 88 A 22 12 0 0 0 360 88" fill="none" />
      </g>
      <text x={100} y={128} textAnchor="middle" className="grid-diag-label">
        GENERATION
      </text>
      <text x={340} y={128} textAnchor="middle" className="grid-diag-label">
        DEMAND
      </text>
      <text x={220} y={128} textAnchor="middle" className="grid-diag-label grid-diag-strong">
        60 Hz
      </text>
      <text x={220} y={148} textAnchor="middle" className="grid-diag-caption">
        equal, every second, or the needle moves
      </text>
    </svg>
  );
}

const BILL = [
  { label: "GENERATION", pct: 55, note: "the auctions" },
  { label: "TRANSMISSION", pct: 14, note: "the highways" },
  { label: "DISTRIBUTION", pct: 31, note: "the last mile" },
];

function BillDiagram() {
  let x = 20;
  return (
    <svg viewBox="0 0 440 150" role="img" aria-label="A bill split into generation, transmission, and distribution">
      {BILL.map((seg) => {
        const w = (seg.pct / 100) * 400;
        const el = (
          <g key={seg.label}>
            <rect
              x={x}
              y={40}
              width={w}
              height={44}
              className="grid-diag-box"
              data-seg={seg.label.toLowerCase()}
            />
            <text x={x + w / 2} y={30} textAnchor="middle" className="grid-diag-label">
              {seg.label} {seg.pct}%
            </text>
            <text x={x + w / 2} y={102} textAnchor="middle" className="grid-diag-caption">
              {seg.note}
            </text>
          </g>
        );
        x += w;
        return el;
      })}
      <text x={220} y={132} textAnchor="middle" className="grid-diag-caption">
        a typical residential dollar (illustrative split)
      </text>
    </svg>
  );
}

function DemandBendDiagram() {
  // Stylized index of US electricity demand: flat for two decades, then up.
  const pts: Array<[number, number]> = [
    [2004, 96], [2008, 100], [2012, 99], [2016, 100], [2020, 98],
    [2022, 101], [2023, 103], [2024, 107], [2025, 111], [2026, 115],
  ];
  const x = (yr: number) => 30 + ((yr - 2004) / 24) * 390;
  const y = (v: number) => 120 - ((v - 90) / 30) * 90;
  const path = pts
    .map(([yr, v], i) => `${i ? "L" : "M"}${x(yr).toFixed(1)},${y(v).toFixed(1)}`)
    .join("");
  return (
    <svg viewBox="0 0 440 160" role="img" aria-label="US electricity demand: flat for twenty years, bending upward around 2023">
      <line x1={30} y1={120} x2={420} y2={120} className="grid-duck-rule" />
      {[2004, 2012, 2020, 2026].map((yr) => (
        <text key={yr} x={x(yr)} y={136} textAnchor="middle" className="grid-duck-tick">
          {yr}
        </text>
      ))}
      <path d={path} className="grid-diag-line" />
      <circle cx={x(2023)} cy={y(103)} r={3} className="grid-duck-dot" />
      <text x={x(2023) - 6} y={y(103) - 10} textAnchor="end" className="grid-diag-caption">
        the bend
      </text>
      <text x={220} y={155} textAnchor="middle" className="grid-diag-caption">
        demand, indexed (illustrative shape)
      </text>
    </svg>
  );
}

const DIAGRAMS: Record<DiagramName, () => React.ReactElement> = {
  balance: BalanceDiagram,
  bill: BillDiagram,
  "demand-bend": DemandBendDiagram,
};

export default function Diagram({ name }: { name: DiagramName }) {
  const D = DIAGRAMS[name];
  return (
    <div className="grid-widget" data-diagram={name}>
      <D />
    </div>
  );
}
