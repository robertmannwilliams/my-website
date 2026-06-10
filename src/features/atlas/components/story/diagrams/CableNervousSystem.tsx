// Fig. 7 — rear of a rack row: cable bundles sweeping up to the spine like a
// suspension bridge's strands.

const RACKS = [
  { x: 52, d: "0ms" },
  { x: 142, d: "90ms" },
  { x: 232, d: "180ms" },
  { x: 322, d: "270ms" },
  { x: 412, d: "360ms" },
];

export default function CableNervousSystem({ drawn }: { drawn: boolean }) {
  return (
    <svg
      viewBox="0 0 520 340"
      className={`diagram${drawn ? " is-drawn" : ""}`}
      role="img"
      aria-label="Diagram: five server racks with fiber bundles sweeping upward into a shared spine, drawn like bridge strands"
    >
      <rect className="d-wash" x="40" y="58" width="442" height="18" fill="var(--wash-teal)" style={{ "--d": "1000ms" } as React.CSSProperties} />

      {/* spine tray */}
      <path className="d-line" pathLength={1} d="M40,60 C160,58.5 360,61 482,59.5" style={{ "--d": "640ms" } as React.CSSProperties} />
      <path className="d-line" pathLength={1} d="M40,75 C160,76.5 360,74 482,75.5" style={{ "--d": "700ms" } as React.CSSProperties} />

      {/* racks */}
      {RACKS.map(({ x, d }) => (
        <g key={x}>
          <path
            className="d-line"
            pathLength={1}
            d={`M${x},298 L${x + 1},182 L${x + 56},181 L${x + 57},298 Z`}
            style={{ "--d": d } as React.CSSProperties}
          />
          <path
            className="d-line d-line--faint"
            pathLength={1}
            d={`M${x + 6},206 h44 M${x + 6},230 h44 M${x + 6},254 h44 M${x + 6},278 h44`}
            style={{ "--d": `calc(${d} + 140ms)` } as React.CSSProperties}
          />
        </g>
      ))}

      {/* bundles: three strands per rack, swept to the spine */}
      {RACKS.map(({ x, d }, i) => {
        const cx = x + 28;
        const tx = 70 + i * 96;
        return (
          <g key={`b${x}`}>
            <path className="d-line" pathLength={1} d={`M${cx - 8},182 C${cx - 10},124 ${tx - 36},80 ${tx - 18},77`} style={{ "--d": `calc(${d} + 420ms)` } as React.CSSProperties} />
            <path className="d-line" pathLength={1} d={`M${cx},181 C${cx},120 ${tx - 22},82 ${tx},76.5`} style={{ "--d": `calc(${d} + 480ms)` } as React.CSSProperties} />
            <path className="d-line" pathLength={1} d={`M${cx + 8},182 C${cx + 10},126 ${tx - 8},84 ${tx + 18},77`} style={{ "--d": `calc(${d} + 540ms)` } as React.CSSProperties} />
          </g>
        );
      })}

      <text className="d-mono-label d-note" x="52" y="322" style={{ "--d": "1250ms" } as React.CSSProperties}>Rack row, rear</text>
      <text className="d-note" x="300" y="44" style={{ "--d": "1350ms" } as React.CSSProperties}>bundles swept like bridge strands</text>
    </svg>
  );
}
